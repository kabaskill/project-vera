import { jobQueue, type Job } from "../services/jobQueue.ts";
import { extractionService } from "../services/extraction.ts";
import * as productQueries from "../db/queries/products.ts";
import { getRedisClient } from "../services/redis.ts";
import type { ExtractedProduct } from "../extractors/types.ts";
import { cleanGtin } from "../utils/gtinValidator.ts";
import { normalizeCategory, inferAttributes } from "../services/categoryNormalizer.ts";

interface ExtractProductPayload {
  url: string;
  userId?: string;
  html?: string; // Optional: for HTML paste mode
  source?: 'url_fetch' | 'html_paste' | 'extension';
  extractedData?: ExtractedProduct; // Optional: for extension mode
}

const REDIS_KEY_PREFIX = {
  urlHash: "url_hash:",
  productIdentity: "product_identity:",
  extractionResult: "extraction:",
  prices: "prices:",
};

const CACHE_TTL = {
  extractionResult: 86400 * 7, // 7 days
  urlProcessed: 86400, // 24 hours
  productIdentity: 86400 * 30, // 30 days
};

export async function processExtractProductJob(job: Job): Promise<void> {
  const { url, userId, html, source = 'url_fetch', extractedData } = job.payload as ExtractProductPayload;
  
  console.log(`[ExtractWorker] Processing ${source}: ${url}`);

  try {
    const urlHash = await hashUrl(url);
    const redis = getRedisClient();
    
    // Check cache for URL fetch mode
    if (source === 'url_fetch') {
      const cachedStatus = await redis.get(`${REDIS_KEY_PREFIX.urlHash}${urlHash}`);
      
      if (cachedStatus === "done") {
        console.log(`[ExtractWorker] URL already processed: ${url}`);
        
        const cachedProductId = await redis.get(`${REDIS_KEY_PREFIX.extractionResult}${urlHash}`);
        if (cachedProductId) {
          await jobQueue.complete(job.id, { 
            cached: true,
            productId: cachedProductId,
          });
          return;
        }
      }

      // Check for cached extraction result
      const cachedExtraction = await redis.get(`${REDIS_KEY_PREFIX.extractionResult}${urlHash}`);
      if (cachedExtraction) {
        console.log(`[ExtractWorker] Using cached extraction for: ${url}`);
        const cachedData = JSON.parse(cachedExtraction);
        
        await finalizeExtraction(cachedData.productId, url, userId, job.id);
        return;
      }
    }

    // Set processing status
    await redis.setex(`${REDIS_KEY_PREFIX.urlHash}${urlHash}`, 3600, "processing");

    // Extract product based on source
    let product: ExtractedProduct | null = null;
    let store = "unknown";
    let method = source;

    if (source === 'extension' && extractedData) {
      // Trust client data from extension
      console.log(`[ExtractWorker] Using extension data for: ${url}`);
      product = extractedData;
      store = detectStoreFromUrl(url);
      
      // Validate the data
      if (!isValidProduct(product)) {
        throw new Error("Invalid product data from extension");
      }
    } else if (source === 'html_paste' && html) {
      // Extract from provided HTML
      console.log(`[ExtractWorker] Extracting from pasted HTML: ${url}`);
      const result = extractionService.extractFromHtml(url, html);
      
      if (!result) {
        throw new Error("Failed to extract product from HTML");
      }
      
      product = result.product;
      store = result.store;
    } else {
      // Fetch and extract from URL
      console.log(`[ExtractWorker] Fetching and extracting from URL: ${url}`);
      
      const extractionPromise = extractionService.extractFromUrl(url);
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error("Extraction timeout")), 15000)
      );
      
      const result = await Promise.race([extractionPromise, timeoutPromise]);
      
      if (!result) {
        throw new Error("Failed to extract product data from URL");
      }
      
      product = result.product;
      store = result.store;
    }

    // Clean and validate GTIN/EAN
    if (product.gtin) {
      product.gtin = cleanGtin(product.gtin);
    }
    if (product.ean) {
      product.ean = cleanGtin(product.ean);
    }

    // Find or create canonical product
    let canonicalProduct = await findOrCreateCanonicalProduct(product, url, store);
    
    // Cache the extraction result (only for URL fetch mode)
    if (source === 'url_fetch') {
      await redis.setex(
        `${REDIS_KEY_PREFIX.extractionResult}${urlHash}`,
        CACHE_TTL.extractionResult,
        JSON.stringify({
          productId: canonicalProduct.id,
          product,
          store,
          method,
          timestamp: new Date().toISOString(),
        })
      );
    }
    
    // Check if store product already exists for this URL
    const existingStoreProduct = await productQueries.getStoreProductByUrl(url);
    
    let storeProductId: string;
    
    if (existingStoreProduct) {
      storeProductId = existingStoreProduct.id;
      console.log(`[ExtractWorker] Using existing store product: ${storeProductId}`);
    } else {
      // Create new store product
      const newStoreProduct = await productQueries.createStoreProduct({
        product_id: canonicalProduct.id,
        store,
        store_sku: product.sku,
        product_url: url,
        metadata: { 
          extraction_method: method,
          source,
          extracted_at: new Date().toISOString(),
        },
      });
      storeProductId = newStoreProduct.id;
    }

    // Create price entry
    if (product.price !== null && product.price > 0) {
      await productQueries.createPrice({
        store_product_id: storeProductId,
        price: product.price,
        currency: product.currency || getDefaultCurrency(store),
        availability: product.availability ?? true,
      });
    }

    // Cache URL in database for lookups
    await productQueries.cacheUrl(url, canonicalProduct.id);

    // Cache product identity in Redis
    await redis.setex(
      `${REDIS_KEY_PREFIX.productIdentity}${canonicalProduct.id}`,
      CACHE_TTL.productIdentity,
      JSON.stringify(canonicalProduct)
    );

    // Mark URL as done (only for URL fetch mode)
    if (source === 'url_fetch') {
      await redis.setex(`${REDIS_KEY_PREFIX.urlHash}${urlHash}`, CACHE_TTL.urlProcessed, "done");
    }

    // Queue merchant resolution job
    await jobQueue.enqueue("resolve_merchants", {
      productId: canonicalProduct.id,
      productName: canonicalProduct.canonical_name,
      brand: canonicalProduct.brand,
      gtin: canonicalProduct.gtin,
      ean: canonicalProduct.ean,
      originalStore: store,
      originalUrl: url,
    });

    // Add to user history if userId provided
    if (userId) {
      try {
        const { addProductToUserHistory } = await import("../db/queries/users.ts");
        await addProductToUserHistory(userId, canonicalProduct.id);
      } catch (error) {
        console.warn(`[ExtractWorker] Failed to add to user history:`, error);
      }
    }

    await jobQueue.complete(job.id, { 
      productId: canonicalProduct.id,
      storeProductId: storeProductId,
      cached: false,
      source,
    });

    console.log(`[ExtractWorker] Completed: ${canonicalProduct.id} (${method})`);
  } catch (error) {
    console.error(`[ExtractWorker] Failed to process ${url}:`, error);
    
    const urlHash = await hashUrl(url);
    const redis = getRedisClient();
    await redis.del(`${REDIS_KEY_PREFIX.urlHash}${urlHash}`);
    
    if (job.attempts < job.maxAttempts) {
      await jobQueue.retry(job);
    } else {
      await jobQueue.fail(job.id, String(error), false);
    }
  }
}

async function finalizeExtraction(
  productId: string,
  url: string,
  userId: string | undefined,
  jobId: string
): Promise<void> {
  // Add to user history if userId provided
  if (userId) {
    try {
      const { addProductToUserHistory } = await import("../db/queries/users.ts");
      await addProductToUserHistory(userId, productId);
    } catch (error) {
      console.warn(`[ExtractWorker] Failed to add to user history:`, error);
    }
  }

  await jobQueue.complete(jobId, { 
    productId,
    cached: true,
  });
}

async function findOrCreateCanonicalProduct(
  extracted: ExtractedProduct,
  url: string,
  storeName?: string
): Promise<{ id: string; canonical_name: string; brand: string | null; gtin: string | null; ean: string | null; image_url: string | null; category: string | null; subcategory: string | null; attributes: Record<string, unknown> | null; created_at: Date; updated_at: Date }> {
  // Try to find by GTIN (most reliable)
  if (extracted.gtin) {
    const byGtin = await productQueries.findProductByGtin(extracted.gtin);
    if (byGtin) {
      console.log(`[ExtractWorker] Found existing product by GTIN: ${byGtin.id}`);
      return byGtin;
    }
  }

  // Try to find by EAN
  if (extracted.ean) {
    const byEan = await productQueries.findProductByEan(extracted.ean);
    if (byEan) {
      console.log(`[ExtractWorker] Found existing product by EAN: ${byEan.id}`);
      return byEan;
    }
  }

  // Try to find by SKU + store
  const store = storeName || detectStoreFromUrl(url);
  
  if (extracted.sku && store) {
    const bySku = await productQueries.findProductByStoreSku(store, extracted.sku);
    if (bySku) {
      console.log(`[ExtractWorker] Found existing product by SKU: ${bySku.id}`);
      return bySku;
    }
  }

  // Try to find by name + brand
  if (extracted.name && extracted.brand) {
    const byNameBrand = await productQueries.findProductByNameAndBrand(extracted.name, extracted.brand);
    if (byNameBrand) {
      console.log(`[ExtractWorker] Found existing product by name+brand: ${byNameBrand.id}`);
      return byNameBrand;
    }
  }

  // Normalize category and infer attributes
  const { category, subcategory } = normalizeCategory(
    extracted.category,
    extracted.brand,
    extracted.name
  );
  
  const inferredAttributes = inferAttributes(
    extracted.name,
    extracted.brand,
    extracted.description
  );
  
  // Merge with any existing attributes
  const attributes = {
    ...inferredAttributes,
    ...(extracted.attributes || {}),
  };
  
  // Create new canonical product
  console.log(`[ExtractWorker] Creating new canonical product: ${extracted.name}`);
  console.log(`[ExtractWorker] Normalized category: ${category}/${subcategory}`);
  console.log(`[ExtractWorker] Inferred attributes:`, attributes);
  
  const newProduct = await productQueries.createCanonicalProduct({
    canonical_name: extracted.name,
    brand: extracted.brand,
    gtin: extracted.gtin,
    ean: extracted.ean,
    image_url: extracted.imageUrl,
    category,
    subcategory,
    attributes,
  });
  
  // Compute similarity scores for the new product
  await computeAndStoreSimilarity(newProduct);
  
  return newProduct;
}

function detectStoreFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    if (domain.includes("zalando")) return "zalando";
    if (domain.includes("amazon")) return "amazon";
    if (domain.includes("mercadolivre") || domain.includes("mercadolibre")) return "mercadolivre";
    if (domain.includes("magazineluiza")) return "magazineluiza";
    if (domain.includes("casasbahia")) return "casasbahia";
    if (domain.includes("americanas")) return "americanas";
    if (domain.includes("submarino")) return "submarino";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function isValidProduct(product: ExtractedProduct): boolean {
  return !!(product.name && product.name.length >= 3);
}

/**
 * Process extension product submission synchronously (for instant API response)
 */
export async function processExtensionProduct({
  url,
  extractedData,
  userId,
}: {
  url: string;
  extractedData: ExtractedProduct;
  userId?: string;
}): Promise<{ productId: string; storeProductId: string }> {
  console.log(`[ExtractWorker] Processing extension product: ${url}`);

  // Validate the data
  if (!isValidProduct(extractedData)) {
    throw new Error("Invalid product data from extension");
  }

  const store = detectStoreFromUrl(url);

  // Clean and validate GTIN/EAN
  if (extractedData.gtin) {
    extractedData.gtin = cleanGtin(extractedData.gtin);
  }
  if (extractedData.ean) {
    extractedData.ean = cleanGtin(extractedData.ean);
  }

  // Find or create canonical product
  const canonicalProduct = await findOrCreateCanonicalProduct(extractedData, url, store);

  // Check if store product already exists for this URL
  const existingStoreProduct = await productQueries.getStoreProductByUrl(url);

  let storeProductId: string;

  if (existingStoreProduct) {
    storeProductId = existingStoreProduct.id;
    console.log(`[ExtractWorker] Using existing store product: ${storeProductId}`);
  } else {
    // Create new store product
    const newStoreProduct = await productQueries.createStoreProduct({
      product_id: canonicalProduct.id,
      store,
      store_sku: extractedData.sku,
      product_url: url,
      metadata: {
        extraction_method: "extension",
        source: "extension",
        extracted_at: new Date().toISOString(),
      },
    });
    storeProductId = newStoreProduct.id;
  }

  // Create price entry
  if (extractedData.price !== null && extractedData.price > 0) {
    await productQueries.createPrice({
      store_product_id: storeProductId,
      price: extractedData.price,
      currency: extractedData.currency || getDefaultCurrency(store),
      availability: extractedData.availability ?? true,
    });
  }

  // Cache URL in database for lookups
  await productQueries.cacheUrl(url, canonicalProduct.id);

  // Add to user history if userId provided
  if (userId) {
    try {
      const { addProductToUserHistory } = await import("../db/queries/users.ts");
      await addProductToUserHistory(userId, canonicalProduct.id);
    } catch (error) {
      console.warn(`[ExtractWorker] Failed to add to user history:`, error);
    }
  }

  console.log(`[ExtractWorker] Completed extension product: ${canonicalProduct.id}`);

  return {
    productId: canonicalProduct.id,
    storeProductId: storeProductId,
  };
}

function getDefaultCurrency(store: string): string {
  const currencies: Record<string, string> = {
    mercadolivre: "BRL",
    amazon: "BRL",
    zalando: "EUR",
    magazineluiza: "BRL",
    casasbahia: "BRL",
    americanas: "BRL",
    submarino: "BRL",
  };
  return currencies[store] || "BRL";
}

async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

async function computeAndStoreSimilarity(
  newProduct: { id: string; canonical_name: string; brand: string | null; category: string | null; subcategory: string | null; attributes: Record<string, unknown> | null }
): Promise<void> {
  try {
    const { sql } = await import("../db/connection.ts");
    
    const existingProducts = await sql`
      SELECT id, canonical_name, brand, category, subcategory, attributes 
      FROM canonical_products 
      WHERE id != ${newProduct.id}
    `;
    
    let similarityMatches = 0;
    
    for (const existing of existingProducts) {
      let score = 0;
      const reasons: string[] = [];
      
      if (newProduct.category && existing.category === newProduct.category) {
        score += 0.3;
        reasons.push('same_category');
        
        if (newProduct.subcategory && existing.subcategory === newProduct.subcategory) {
          score += 0.2;
          reasons.push('same_subcategory');
        }
      }
      
      if (newProduct.brand && existing.brand === newProduct.brand) {
        score += 0.2;
        reasons.push('same_brand');
      }
      
      const newAttrs = (newProduct.attributes as Record<string, string>) || {};
      const existingAttrs = (existing.attributes as Record<string, string>) || {};
      
      let attrMatches = 0;
      let totalAttrs = 0;
      
      for (const [key, value] of Object.entries(newAttrs)) {
        totalAttrs++;
        if (existingAttrs[key] === value) attrMatches++;
      }
      
      if (totalAttrs > 0) {
        const attrScore = (attrMatches / totalAttrs) * 0.3;
        score += attrScore;
        if (attrScore > 0.1) reasons.push('similar_attributes');
      }
      
      if (score > 0.4) {
        const finalScore = Math.round(score * 100) / 100;
        
        try {
          await sql`
            INSERT INTO product_similarity (source_product_id, similar_product_id, similarity_score, match_reason)
            VALUES (${newProduct.id}, ${existing.id}, ${finalScore}, ${reasons.join(',')})
            ON CONFLICT (source_product_id, similar_product_id) DO NOTHING
          `;
          
          await sql`
            INSERT INTO product_similarity (source_product_id, similar_product_id, similarity_score, match_reason)
            VALUES (${existing.id}, ${newProduct.id}, ${finalScore}, ${reasons.join(',')})
            ON CONFLICT (source_product_id, similar_product_id) DO NOTHING
          `;
          
          similarityMatches++;
        } catch {}
      }
    }
    
    console.log(`[ExtractWorker] Created ${similarityMatches} similarity matches for new product`);
  } catch (error) {
    console.warn('[ExtractWorker] Failed to compute similarity:', error);
  }
}
