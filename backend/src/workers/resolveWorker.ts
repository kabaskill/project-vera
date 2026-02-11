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
}

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
      const searchUrl = merchantRegistry.buildSearchUrl(merchant.id, searchQuery);
      
      if (!searchUrl) continue;

      // Determine confidence level
      let confidence: "exact" | "strong" | "weak" = "weak";
      
      if (payload.gtin && merchant.supportsGtin) {
        confidence = "exact";
      } else if (payload.brand && searchQuery.includes(payload.brand)) {
        confidence = "strong";
      }

      matches.push({
        merchantId: merchant.id,
        searchUrl,
        confidence,
      });
    }

    // Queue fetch prices jobs for each match
    for (const match of matches.slice(0, 5)) { // Limit to top 5 merchants
      await jobQueue.enqueue("fetch_prices", {
        productId: payload.productId,
        merchantId: match.merchantId,
        searchUrl: match.searchUrl,
        productName: payload.productName,
        brand: payload.brand,
        gtin: payload.gtin,
        confidence: match.confidence,
      });
    }

    await jobQueue.complete(job.id, { 
      resolvedMerchants: matches.length,
      merchants: matches.map(m => m.merchantId),
    });

    console.log(`[ResolveWorker] Queued ${matches.length} price fetch jobs`);
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
  // Prefer GTIN if available
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
