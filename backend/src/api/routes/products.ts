import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as productQueries from "../../db/queries/products.ts";
import { jobQueue } from "../../services/jobQueue.ts";
import { getRedisClient } from "../../services/redis.ts";
import { sql } from "../../db/connection.ts";

const submitUrlSchema = z.object({
  url: z.string().url(),
  userId: z.string().optional(),
});

const REDIS_KEY_PREFIX = {
  urlHash: "url_hash:",
  prices: "prices:",
  productIdentity: "product_identity:",
};

export async function productRoutes(app: FastifyInstance) {
  // Submit a URL for processing
  app.post("/submit-url", async (request, reply) => {
    const body = submitUrlSchema.parse(request.body);
    
    // Check URL cache first
    const urlHash = await hashUrl(body.url);
    const redis = getRedisClient();
    const cachedStatus = await redis.get(`${REDIS_KEY_PREFIX.urlHash}${urlHash}`);
    
    if (cachedStatus === "done") {
      // URL already processed, get product ID from database
      const cached = await productQueries.getCachedUrl(body.url);
      if (cached) {
        return {
          job_id: null,
          status: "completed",
          product_id: cached,
          cached: true,
        };
      }
    }

    if (cachedStatus === "processing") {
      return {
        job_id: null,
        status: "processing",
        message: "URL is already being processed",
      };
    }

    // Queue extraction job
    const jobId = await jobQueue.enqueue("extract_product", {
      url: body.url,
      userId: body.userId,
    });

    return {
      job_id: jobId,
      status: "queued",
      message: "URL submitted for processing",
    };
  });

  // Get job status
  app.get("/jobs/:jobId", async (request) => {
    const { jobId } = request.params as { jobId: string };
    
    const status = await jobQueue.getJobStatus(jobId);
    
    if (!status) {
      return {
        job_id: jobId,
        status: "not_found",
      };
    }

    return {
      job_id: jobId,
      status: status.status,
      data: status.data,
    };
  });

  // Get product details with resolved prices
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    // Try to get from cache first
    const redis = getRedisClient();
    const cachedPrices = await redis.get(`${REDIS_KEY_PREFIX.prices}${id}`);
    const cachedIdentity = await redis.get(`${REDIS_KEY_PREFIX.productIdentity}${id}`);
    
    let product: { id: string; canonical_name: string; brand: string | null; gtin: string | null; ean: string | null; image_url: string | null; } | null = null;
    let prices: unknown = null;
    
    if (cachedIdentity) {
      product = JSON.parse(cachedIdentity);
    } else {
      // Get from database
      const result = await sql`SELECT * FROM canonical_products WHERE id = ${id}`;
      product = result[0] as typeof product;
      
      // Cache it
      if (product) {
        await redis.setex(
          `${REDIS_KEY_PREFIX.productIdentity}${id}`,
          86400 * 30, // 30 days
          JSON.stringify(product)
        );
      }
    }
    
    if (!product) {
      reply.status(404);
      return { error: "Product not found" };
    }
    
    if (cachedPrices) {
      prices = JSON.parse(cachedPrices);
    } else {
      // Get from database
      prices = await productQueries.getPricesForProduct(id);
      
      // Cache it
      await redis.setex(
        `${REDIS_KEY_PREFIX.prices}${id}`,
        3600 * 6, // 6 hours
        JSON.stringify(prices)
      );
    }
    
    // Find cheapest price
    const typedPrices = prices as Array<{ price: number; currency: string; availability: boolean; store_product: { store: string; product_url: string } }>;
    const availablePrices = typedPrices.filter(p => p.availability);
    const cheapestPrice = availablePrices.length > 0
      ? availablePrices.reduce((min, p) => p.price < min.price ? p : min)
      : null;
    
    return {
      id: product.id,
      name: product.canonical_name,
      brand: product.brand,
      gtin: product.gtin,
      ean: product.ean,
      image_url: product.image_url,
      cheapest_price: cheapestPrice ? {
        price: cheapestPrice.price,
        currency: cheapestPrice.currency,
        store: cheapestPrice.store_product.store,
        url: cheapestPrice.store_product.product_url,
      } : null,
      prices: typedPrices.map(p => ({
        store: p.store_product.store,
        price: p.price,
        currency: p.currency,
        availability: p.availability,
        url: p.store_product.product_url,
      })),
      total_merchants: new Set(typedPrices.map(p => p.store_product.store)).size,
    };
  });

  // Evaluate price
  app.post("/evaluate-price", async (request) => {
    const body = z.object({
      currentPrice: z.number(),
      historicalPrices: z.array(z.number()).optional(),
    }).parse(request.body);
    
    const prices = body.historicalPrices || [];
    if (prices.length === 0) {
      return { evaluation: "unknown", reason: "No historical data" };
    }
    
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    
    let evaluation: "typical" | "good_deal" | "expensive";
    if (body.currentPrice <= min * 1.05) evaluation = "good_deal";
    else if (body.currentPrice >= avg * 1.1) evaluation = "expensive";
    else evaluation = "typical";
    
    return { evaluation, stats: { average: avg, minimum: min } };
  });

  // Get trending
  app.get("/trending", async () => {
    const result = await sql`SELECT * FROM canonical_products ORDER BY created_at DESC LIMIT 10`;
    return {
      products: result.map(p => ({
        id: p.id,
        name: p.canonical_name,
        brand: p.brand,
      })),
    };
  });
}

async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
