import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as productQueries from "../../db/queries/products.ts";
import { eventBus, EVENTS } from "../../events/bus.ts";
import { sql } from "../../db/connection.ts";

const submitUrlSchema = z.object({
  url: z.string().url(),
  userId: z.string().optional(),
});

export async function productRoutes(app: FastifyInstance) {
  // Submit a URL for processing
  app.post("/submit-url", async (request, reply) => {
    const body = submitUrlSchema.parse(request.body);
    
    // Check cache first
    const cached = await productQueries.getCachedUrl(body.url);
    if (cached) {
      const product = await productQueries.getStoreProductByUrl(body.url);
      if (product && body.userId) {
        const { addProductToUserHistory } = await import("../../db/queries/users.ts");
        await addProductToUserHistory(body.userId, cached);
      }
      
      return {
        success: true,
        cached: true,
        productId: cached,
      };
    }
    
    // Emit event for async processing
    eventBus.emit(EVENTS.URL_RECEIVED, {
      url: body.url,
      userId: body.userId,
    });
    
    return {
      success: true,
      cached: false,
      message: "URL submitted for processing",
    };
  });

  // Get product details
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const result = await sql`SELECT * FROM canonical_products WHERE id = ${id}`;
    const product = result[0];
    
    if (!product) {
      reply.status(404);
      return { error: "Product not found" };
    }
    
    const prices = await productQueries.getPricesForProduct(id);
    const similar = await productQueries.getSimilarProducts(id, undefined, 5);
    
    return {
      id: product.id,
      name: product.canonical_name,
      brand: product.brand,
      imageUrl: product.image_url,
      prices: prices.map(p => ({
        store: p.store_product.store,
        price: p.price,
        currency: p.currency,
        url: p.store_product.product_url,
      })),
      similarProducts: similar.map(p => ({
        id: p.id,
        name: p.canonical_name,
        brand: p.brand,
      })),
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
