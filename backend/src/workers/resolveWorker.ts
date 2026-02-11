import { jobQueue, type Job } from "../services/jobQueue.ts";
import { merchantRegistry } from "../merchants/registry.ts";

interface ResolveMerchantsPayload {
  productId: string;
  productName: string;
  brand: string | null;
  gtin: string | null;
  ean: string | null;
  originalStore: string;
  originalUrl: string;
}

interface MerchantMatch {
  merchantId: string;
  searchUrl: string;
  confidence: "exact" | "strong" | "weak";
  priority: number;
}

// Maximum number of concurrent price fetches
const MAX_CONCURRENT_FETCHES = 5;

export async function processResolveMerchantsJob(job: Job): Promise<void> {
  const payload = job.payload as ResolveMerchantsPayload;
  
  console.log(`[ResolveWorker] Resolving merchants for: ${payload.productName}`);

  try {
    // Get searchable merchants excluding the original
    const merchants = merchantRegistry
      .getSearchableMerchants()
      .filter(m => m.id !== payload.originalStore);

    const matches: MerchantMatch[] = [];

    for (const merchant of merchants) {
      // Build search query
      const searchQuery = buildSearchQuery(payload);
      const searchUrl = merchantRegistry.buildSearchUrl(merchant.id, searchQuery, payload.originalUrl);
      
      if (!searchUrl) continue;

      // Determine confidence level
      let confidence: "exact" | "strong" | "weak" = "weak";
      let priority = 0;
      
      if (payload.gtin && merchant.supportsGtin) {
        confidence = "exact";
        priority = 100;
      } else if (payload.brand && searchQuery.includes(payload.brand)) {
        confidence = "strong";
        priority = 50;
      }

      matches.push({
        merchantId: merchant.id,
        searchUrl,
        confidence,
        priority,
      });
    }

    // Sort by priority (highest first) and limit to top matches
    const sortedMatches = matches
      .sort((a, b) => b.priority - a.priority)
      .slice(0, MAX_CONCURRENT_FETCHES);

    // Queue fetch prices jobs for each match
    // These will be processed in parallel by multiple workers
    const enqueuePromises = sortedMatches.map(match => 
      jobQueue.enqueue("fetch_prices", {
        productId: payload.productId,
        merchantId: match.merchantId,
        searchUrl: match.searchUrl,
        productName: payload.productName,
        brand: payload.brand,
        gtin: payload.gtin,
        confidence: match.confidence,
      })
    );

    await Promise.all(enqueuePromises);

    await jobQueue.complete(job.id, { 
      resolvedMerchants: sortedMatches.length,
      merchants: sortedMatches.map(m => m.merchantId),
    });

    console.log(`[ResolveWorker] Queued ${sortedMatches.length} price fetch jobs in parallel`);
  } catch (error) {
    console.error(`[ResolveWorker] Failed to resolve merchants:`, error);
    
    if (job.attempts < job.maxAttempts) {
      await jobQueue.retry(job);
    } else {
      await jobQueue.fail(job.id, String(error), false);
    }
  }
}

function buildSearchQuery(payload: ResolveMerchantsPayload): string {
  // Prefer GTIN if available (most accurate)
  if (payload.gtin) {
    return payload.gtin;
  }

  // Otherwise use brand + product name
  const parts: string[] = [];
  if (payload.brand) {
    parts.push(payload.brand);
  }
  parts.push(payload.productName);
  
  return parts.join(" ");
}
