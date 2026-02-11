import { jobQueue, type Job } from "../services/jobQueue.ts";
import { extractionService } from "../services/extraction.ts";
import { merchantRegistry } from "../merchants/registry.ts";
import * as productQueries from "../db/queries/products.ts";
import { getRedisClient } from "../services/redis.ts";
import type { ExtractedProduct } from "../extractors/types.ts";

interface FetchPricesPayload {
  productId: string;
  merchantId: string;
  searchUrl: string;
  productName: string;
  brand: string | null;
  gtin: string | null;
  confidence: "exact" | "strong" | "weak";
}

const REDIS_KEY_PREFIX = {
  prices: "prices:",
};

export async function processFetchPricesJob(job: Job): Promise<void> {
  const payload = job.payload as FetchPricesPayload;
  
  console.log(`[FetchWorker] Fetching prices from ${payload.merchantId}`);

  try {
    // For Phase 1, we'll do a simplified search
    // In a full implementation, this would parse search results
    const searchResult = await searchMerchant(payload);
    
    if (!searchResult) {
      console.log(`[FetchWorker] No matching product found on ${payload.merchantId}`);
      await jobQueue.complete(job.id, { found: false });
      return;
    }

    // Check if store product already exists
    const existingStoreProduct = await findExistingStoreProduct(
      payload.productId, 
      payload.merchantId
    );

    let storeProductId: string;

    if (existingStoreProduct) {
      storeProductId = existingStoreProduct;
    } else {
      // Create new store product
      const storeProduct = await productQueries.createStoreProduct({
        product_id: payload.productId,
        store: payload.merchantId,
        store_sku: searchResult.sku ?? null,
        product_url: searchResult.url,
        metadata: { 
          confidence: payload.confidence,
          matched_via: payload.gtin ? "gtin" : "name_similarity",
        },
      });
      storeProductId = storeProduct.id;
    }

    // Create price entry
    if (searchResult.price !== null) {
      await productQueries.createPrice({
        store_product_id: storeProductId,
        price: searchResult.price,
        currency: searchResult.currency || "BRL",
        availability: searchResult.availability ?? true,
      });
    }

    // Cache prices in Redis
    const redis = getRedisClient();
    const prices = await productQueries.getPricesForProduct(payload.productId);
    await redis.setex(
      `${REDIS_KEY_PREFIX.prices}${payload.productId}`,
      3600 * 6, // 6 hours TTL
      JSON.stringify(prices)
    );

    await jobQueue.complete(job.id, { 
      found: true,
      merchant: payload.merchantId,
      price: searchResult.price,
    });

    console.log(`[FetchWorker] Price fetched from ${payload.merchantId}: ${searchResult.price}`);
  } catch (error) {
    console.error(`[FetchWorker] Failed to fetch prices from ${payload.merchantId}:`, error);
    
    if (job.attempts < job.maxAttempts) {
      await jobQueue.retry(job);
    } else {
      await jobQueue.fail(job.id, String(error), false);
    }
  }
}

async function searchMerchant(payload: FetchPricesPayload): Promise<{
  url: string;
  price: number | null;
  currency: string | null;
  availability: boolean | null;
  sku: string | null;
} | null> {
  // For Phase 1, we implement a simplified version
  // Try to fetch the search URL and look for matching products
  
  try {
    const response = await fetch(payload.searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    
    // Try to extract products from search results
    // This is simplified - real implementation would parse search result structure
    const extracted = extractionService.extractFromHtml(payload.searchUrl, html);
    
    if (!extracted) {
      return null;
    }

    // Check if this is likely the same product
    if (!isLikelySameProduct(extracted.product, payload)) {
      return null;
    }

    return {
      url: extracted.url,
      price: extracted.product.price,
      currency: extracted.product.currency,
      availability: extracted.product.availability,
      sku: extracted.product.sku,
    };
  } catch (error) {
    console.error(`[FetchWorker] Search failed for ${payload.merchantId}:`, error);
    return null;
  }
}

function isLikelySameProduct(
  extracted: ExtractedProduct, 
  payload: FetchPricesPayload
): boolean {
  // Exact match by GTIN
  if (payload.gtin && extracted.gtin === payload.gtin) {
    return true;
  }

  // Check name similarity
  const nameSimilarity = calculateSimilarity(
    extracted.name.toLowerCase(),
    payload.productName.toLowerCase()
  );

  // Brand match improves confidence
  const brandMatch = payload.brand && extracted.brand 
    ? extracted.brand.toLowerCase() === payload.brand.toLowerCase()
    : false;

  // For exact confidence, require high similarity
  if (payload.confidence === "exact") {
    return nameSimilarity > 0.9;
  }

  // For strong confidence, require good similarity and brand match
  if (payload.confidence === "strong") {
    return nameSimilarity > 0.7 && brandMatch;
  }

  // For weak confidence, accept moderate similarity
  return nameSimilarity > 0.6;
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple Levenshtein-based similarity
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }

  return matrix[str2.length]![str1.length]!;
}

async function findExistingStoreProduct(
  productId: string, 
  store: string
): Promise<string | null> {
  // Query to check if store product exists
  const { sql } = await import("../db/connection.ts");
  const result = await sql`
    SELECT id FROM store_products 
    WHERE product_id = ${productId} AND store = ${store}
    LIMIT 1
  `;
  
  return result[0]?.id as string | null;
}
