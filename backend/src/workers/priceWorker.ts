import { jobQueue, type Job } from "../services/jobQueue.ts";
import { extractionService } from "../services/extraction.ts";
import { merchantRegistry } from "../merchants/registry.ts";
import * as productQueries from "../db/queries/products.ts";
import { getRedisClient } from "../services/redis.ts";
import { fetchWithRetry } from "../utils/httpHelpers.ts";
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

const HTTP_TIMEOUT = 10000; // 10 seconds

export async function processFetchPricesJob(job: Job): Promise<void> {
  const payload = job.payload as FetchPricesPayload;
  
  console.log(`[FetchWorker] Fetching prices from ${payload.merchantId}`);

  try {
    const searchResult = await searchAndExtractProduct(payload);
    
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
    if (searchResult.price > 0) {
      await productQueries.createPrice({
        store_product_id: storeProductId,
        price: searchResult.price,
        currency: searchResult.currency || getDefaultCurrency(payload.merchantId),
        availability: true,
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

interface SearchResult {
  url: string;
  price: number;
  currency: string | null;
  sku: string | null;
}

/**
 * Search for product and extract from result pages
 */
async function searchAndExtractProduct(payload: FetchPricesPayload): Promise<SearchResult | null> {
  try {
    console.log(`[FetchWorker] Searching: ${payload.searchUrl}`);
    
    // Fetch search results with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT);

    const response = await fetchWithRetry(payload.searchUrl, {
      signal: controller.signal,
    }, 1);

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[FetchWorker] Search returned ${response.status} for ${payload.merchantId}`);
      return null;
    }

    const html = await response.text();
    
    // Extract product URLs from search results
    const productUrls = extractProductUrls(html, payload.merchantId, payload.searchUrl);
    console.log(`[FetchWorker] Found ${productUrls.length} product URLs on ${payload.merchantId}`);
    
    if (productUrls.length === 0) {
      return null;
    }

    // Try to extract from each product page (limit to first 3)
    for (const productUrl of productUrls.slice(0, 3)) {
      try {
        console.log(`[FetchWorker] Trying product: ${productUrl}`);
        
        const extracted = await extractionService.extractFromUrl(productUrl);
        
        if (!extracted) {
          continue;
        }

        // Check if this is likely the same product
        const matchScore = calculateMatchScore(extracted.product, payload);
        console.log(`[FetchWorker] Match score for ${productUrl}: ${matchScore.score}`);
        
        if (matchScore.score >= 60) {
          return {
            url: productUrl,
            price: extracted.product.price || 0,
            currency: extracted.product.currency,
            sku: extracted.product.sku,
          };
        }
      } catch (error) {
        console.warn(`[FetchWorker] Failed to extract from ${productUrl}:`, error);
        continue;
      }
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[FetchWorker] Request timeout for ${payload.merchantId}`);
    } else {
      console.error(`[FetchWorker] Search failed for ${payload.merchantId}:`, error);
    }
    return null;
  }
}

/**
 * Extract product URLs from search result HTML
 */
function extractProductUrls(html: string, merchantId: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // Pattern for product links based on merchant
  const patterns: Record<string, RegExp> = {
    mercadolivre: /<a[^>]*href=["'](https:\/\/[^"']*mercadolivre\.com\.br\/[^"']+)["'][^>]*>/gi,
    amazon: /<a[^>]*href=["'](https:\/\/[^"']*amazon\.[^"\/]+\/dp\/[^"']+|\/dp\/[^"']+)["'][^>]*>/gi,
    zalando: /<a[^>]*href=["'](https:\/\/[^"']*zalando\.[^"\/]+\/[^"']+\.html)["'][^>]*>/gi,
    magazineluiza: /<a[^>]*href=["'](https:\/\/[^"']*magazineluiza\.com\.br\/[^"']+)["'][^>]*>/gi,
    casasbahia: /<a[^>]*href=["'](https:\/\/[^"']*casasbahia\.com\.br\/[^"']+)["'][^>]*>/gi,
    americanas: /<a[^>]*href=["'](https:\/\/[^"']*americanas\.com\.br\/[^"']+)["'][^>]*>/gi,
    submarino: /<a[^>]*href=["'](https:\/\/[^"']*submarino\.com\.br\/[^"']+)["'][^>]*>/gi,
  };

  const pattern = patterns[merchantId];
  if (!pattern) return [];

  const matches = [...html.matchAll(pattern)];
  
  for (const match of matches) {
    let url = match[1];
    if (!url) continue;

    // Normalize URL
    if (url.startsWith("/")) {
      const base = new URL(baseUrl);
      url = `${base.protocol}//${base.host}${url}`;
    }

    // Skip duplicate links
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  return urls.slice(0, 10);
}

interface MatchScore {
  score: number;
  reasons: string[];
}

/**
 * Calculate how well an extracted product matches our target
 */
function calculateMatchScore(extracted: ExtractedProduct, payload: FetchPricesPayload): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  // Exact GTIN match (highest priority)
  if (payload.gtin && extracted.gtin === payload.gtin) {
    score += 100;
    reasons.push("exact_gtin_match");
    return { score, reasons };
  }

  // Name similarity
  const nameSimilarity = calculateSimilarity(
    extracted.name.toLowerCase(),
    payload.productName.toLowerCase()
  );
  score += nameSimilarity * 50;
  
  if (nameSimilarity > 0.8) {
    reasons.push("high_name_similarity");
  } else if (nameSimilarity > 0.5) {
    reasons.push("moderate_name_similarity");
  }

  // Brand match
  if (payload.brand && extracted.brand) {
    const brandMatch = extracted.brand.toLowerCase() === payload.brand.toLowerCase();
    if (brandMatch) {
      score += 30;
      reasons.push("brand_match");
    }
  }

  // Price sanity check
  if (extracted.price && extracted.price > 0) {
    score += 10;
    reasons.push("has_price");
  }

  return { score, reasons };
}

function calculateSimilarity(str1: string, str2: string): number {
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
  const { sql } = await import("../db/connection.ts");
  const result = await sql`
    SELECT id FROM store_products 
    WHERE product_id = ${productId} AND store = ${store}
    LIMIT 1
  `;
  
  return result[0]?.id as string | null;
}

function getDefaultCurrency(merchantId: string): string {
  const currencies: Record<string, string> = {
    mercadolivre: "BRL",
    amazon: "BRL",
    zalando: "EUR",
    magazineluiza: "BRL",
    casasbahia: "BRL",
    americanas: "BRL",
    submarino: "BRL",
  };

  return currencies[merchantId] || "BRL";
}
