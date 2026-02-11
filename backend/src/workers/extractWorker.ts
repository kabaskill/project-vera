import { jobQueue, type Job } from "../services/jobQueue.ts";
import { extractionService } from "../services/extraction.ts";
import * as productQueries from "../db/queries/products.ts";
import { getRedisClient } from "../services/redis.ts";
import type { ExtractedProduct } from "../extractors/types.ts";

interface ExtractProductPayload {
  url: string;
  userId?: string;
}

const REDIS_KEY_PREFIX = {
  urlHash: "url_hash:",
  productIdentity: "product_identity:",
  prices: "prices:",
};

export async function processExtractProductJob(job: Job): Promise<void> {
  const { url, userId } = job.payload as ExtractProductPayload;
  
  console.log(`[ExtractWorker] Processing URL: ${url}`);

  try {
    // Check URL cache in Redis
    const urlHash = await hashUrl(url);
    const redis = getRedisClient();
    const cachedStatus = await redis.get(`${REDIS_KEY_PREFIX.urlHash}${urlHash}`);
    
    if (cachedStatus === "done") {
      console.log(`[ExtractWorker] URL already processed: ${url}`);
      await jobQueue.complete(job.id, { cached: true });
      return;
    }

    // Set processing status
    await redis.setex(`${REDIS_KEY_PREFIX.urlHash}${urlHash}`, 3600, "processing");

    // Extract product
    const result = await extractionService.extractFromUrl(url);
    
    if (!result) {
      throw new Error("Failed to extract product data");
    }

    // Find or create canonical product
    let canonicalProduct = await findOrCreateCanonicalProduct(result.product, url, result.store);
    
    // Check if store product already exists for this URL
    const existingStoreProduct = await productQueries.getStoreProductByUrl(url);
    
    let storeProductId: string;
    
    if (existingStoreProduct) {
      // Use existing store product
      storeProductId = existingStoreProduct.id;
    } else {
      // Create new store product
      const newStoreProduct = await productQueries.createStoreProduct({
        product_id: canonicalProduct.id,
        store: result.store,
        store_sku: result.product.sku,
        product_url: url,
        metadata: { extraction_method: result.method },
      });
      storeProductId = newStoreProduct.id;
    }

    // Create price entry (even if store product exists, we want to track price history)
    if (result.product.price !== null) {
      await productQueries.createPrice({
        store_product_id: storeProductId,
        price: result.product.price,
        currency: result.product.currency || "BRL",
        availability: result.product.availability ?? true,
      });
    }

    // Cache URL in database for lookups
    await productQueries.cacheUrl(url, canonicalProduct.id);

    // Cache product identity in Redis
    await redis.setex(
      `${REDIS_KEY_PREFIX.productIdentity}${canonicalProduct.id}`,
      86400 * 30, // 30 days
      JSON.stringify(canonicalProduct)
    );

    // Mark URL as done
    await redis.setex(`${REDIS_KEY_PREFIX.urlHash}${urlHash}`, 86400, "done");

    // Queue merchant resolution job
    await jobQueue.enqueue("resolve_merchants", {
      productId: canonicalProduct.id,
      productName: canonicalProduct.canonical_name,
      brand: canonicalProduct.brand,
      gtin: canonicalProduct.gtin,
      ean: canonicalProduct.ean,
      originalStore: result.store,
      originalUrl: url,
    });

    // Add to user history if userId provided
    if (userId) {
      const { addProductToUserHistory } = await import("../db/queries/users.ts");
      await addProductToUserHistory(userId, canonicalProduct.id);
    }

    await jobQueue.complete(job.id, { 
      productId: canonicalProduct.id,
      storeProductId: storeProductId,
    });

    console.log(`[ExtractWorker] Completed: ${canonicalProduct.id}`);
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

async function findOrCreateCanonicalProduct(
  extracted: ExtractedProduct,
  url: string,
  storeName?: string
): Promise<{ id: string; canonical_name: string; brand: string | null; gtin: string | null; ean: string | null; image_url: string | null; created_at: Date; updated_at: Date }> {
  // Try to find by GTIN
  if (extracted.gtin) {
    const byGtin = await productQueries.findProductByGtin(extracted.gtin);
    if (byGtin) return byGtin;
  }

  // Try to find by EAN
  if (extracted.ean) {
    const byEan = await productQueries.findProductByEan(extracted.ean);
    if (byEan) return byEan;
  }

  // Try to find by SKU + store
  // Use the provided store name or extract from URL
  let store = storeName;
  if (!store) {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      if (domain.includes("zalando")) store = "zalando";
      else if (domain.includes("amazon")) store = "amazon";
      else if (domain.includes("mercadolivre") || domain.includes("mercadolibre")) store = "mercadolivre";
      else if (domain.includes("magazineluiza")) store = "magazineluiza";
      else if (domain.includes("casasbahia")) store = "casasbahia";
      else if (domain.includes("americanas")) store = "americanas";
      else if (domain.includes("submarino")) store = "submarino";
      else store = "unknown";
    } catch {
      store = "unknown";
    }
  }
  
  if (extracted.sku) {
    const bySku = await productQueries.findProductByStoreSku(store, extracted.sku);
    if (bySku) return bySku;
  }

  // Try to find by name + brand
  if (extracted.name && extracted.brand) {
    const byNameBrand = await productQueries.findProductByNameAndBrand(extracted.name, extracted.brand);
    if (byNameBrand) return byNameBrand;
  }

  // Create new canonical product
  return await productQueries.createCanonicalProduct({
    canonical_name: extracted.name,
    brand: extracted.brand,
    gtin: extracted.gtin,
    ean: extracted.ean,
    image_url: extracted.imageUrl,
  });
}

async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
