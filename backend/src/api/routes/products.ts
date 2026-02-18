import type { FastifyInstance } from "fastify";
import { z, ZodError } from "zod";
import * as productQueries from "../../db/queries/products.ts";
import { jobQueue } from "../../services/jobQueue.ts";
import { getRedisClient } from "../../services/redis.ts";
import { sql } from "../../db/connection.ts";

const submitUrlSchema = z.object({
  url: z.string().url(),
  userId: z.string().optional(),
});

const submitHtmlSchema = z.object({
  url: z.string().url(),
  html: z.string().min(100, "HTML must be at least 100 characters"),
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

  // Get featured products (random selection with prices)
  app.get("/featured", async () => {
    const result = await sql`
      SELECT 
        cp.id,
        cp.canonical_name,
        cp.brand,
        cp.category,
        cp.subcategory,
        cp.image_url,
        min_price.price,
        min_price.currency,
        min_price.store,
        min_price.product_url
      FROM canonical_products cp
      LEFT JOIN LATERAL (
        SELECT 
          p.price,
          p.currency,
          sp.store,
          sp.product_url
        FROM store_products sp
        JOIN LATERAL (
          SELECT price, currency
          FROM prices
          WHERE store_product_id = sp.id
          ORDER BY timestamp DESC
          LIMIT 1
        ) p ON true
        WHERE sp.product_id = cp.id
        ORDER BY p.price ASC
        LIMIT 1
      ) min_price ON true
      WHERE min_price.price IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 10
    `;
    
    return {
      products: result.map(p => ({
        id: p.id,
        name: p.canonical_name,
        brand: p.brand,
        category: p.category,
        subcategory: p.subcategory,
        image_url: p.image_url,
        price: p.price,
        currency: p.currency,
        store: p.store,
        product_url: p.product_url,
      })),
    };
  });

  // Get products by URLs (for extension sync)
  // Uses url_cache for O(1) lookups - much faster than joining tables
  app.post("/by-urls", async (request) => {
    const body = z.object({
      urls: z.array(z.string().url()).max(50),
    }).parse(request.body);
    
    if (body.urls.length === 0) {
      return { products: [] };
    }
    
    // Use url_cache for fast lookups
    // This is O(1) per URL vs O(n) join query
    const cachedUrls = await productQueries.getCachedUrls(body.urls);
    
    // Get product details for found URLs
    const productIds = cachedUrls.map(c => c.productId);
    let products: Array<{ id: string; canonical_name: string; brand: string | null; image_url: string | null }> = [];
    
    if (productIds.length > 0) {
      const result = await sql`
        SELECT id, canonical_name, brand, image_url
        FROM canonical_products
        WHERE id = ANY(${productIds})
      `;
      products = result as typeof products;
    }
    
    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]));
    
    return {
      products: cachedUrls.map(({ url, productId }) => {
        const product = productMap.get(productId);
        return {
          url,
          productId,
          name: product?.canonical_name || '',
          brand: product?.brand || null,
          imageUrl: product?.image_url || null,
        };
      }),
    };
  });

  // Submit HTML for processing (admin/testing only)
  app.post("/submit-html", async (request, reply) => {
    const body = submitHtmlSchema.parse(request.body);
    
    // Queue extraction job with HTML
    const jobId = await jobQueue.enqueue("extract_product", {
      url: body.url,
      html: body.html,
      userId: body.userId,
      source: "html_paste",
    });

    return {
      job_id: jobId,
      status: "queued",
      message: "HTML submitted for processing",
    };
  });

  // Test extraction from HTML (admin/testing only)
  app.post("/test-extraction", async (request, reply) => {
    const body = z.object({
      url: z.string().url(),
      html: z.string(),
    }).parse(request.body);
    
    try {
      const { universalExtractor } = await import("../../extractors/universal.ts");
      const result = universalExtractor.extract(body.html, body.url);
      
      if (!result) {
        reply.status(422);
        return { error: "Failed to extract product from HTML" };
      }
      
      return result;
    } catch (error) {
      reply.status(500);
      return { error: String(error) };
    }
  });

  // Submit from extension (pre-extracted data) - Process synchronously for instant response
  app.post("/extension", async (request, reply) => {
    try {
      const body = z.object({
        url: z.string().url(),
        extractedData: z.object({
          name: z.string(),
          price: z.number(),
          currency: z.string().nullish(),
          brand: z.string().nullish(),
          gtin: z.string().nullish(),
          ean: z.string().nullish(),
          sku: z.string().nullish(),
          imageUrl: z.string().nullish(),
          availability: z.boolean().optional(),
          description: z.string().nullish(),
          category: z.string().nullish(),
          subcategory: z.string().nullish(),
          attributes: z.record(z.string()).optional(),
        }),
        userId: z.string().optional(),
      }).parse(request.body);
      // Process extension data synchronously for instant response
      const { processExtensionProduct } = await import("../../workers/extractWorker.ts");
      
      // Convert extracted data to proper format
      const extractedData = {
        name: body.extractedData.name,
        brand: body.extractedData.brand || null,
        imageUrl: body.extractedData.imageUrl || null,
        gtin: body.extractedData.gtin || null,
        ean: body.extractedData.ean || null,
        sku: body.extractedData.sku || null,
        price: body.extractedData.price,
        currency: body.extractedData.currency || "BRL",
        availability: body.extractedData.availability ?? true,
        description: body.extractedData.description || null,
        category: body.extractedData.category || null,
        subcategory: body.extractedData.subcategory || null,
        attributes: body.extractedData.attributes as Record<string, string> | undefined,
      };
      
      const result = await processExtensionProduct({
        url: body.url,
        extractedData,
        userId: body.userId,
      });

      return {
        product_id: result.productId,
        status: "completed",
        message: "Product tracked successfully",
      };
    } catch (error) {
      console.error("[API] Failed to process extension product:", error);
      reply.status(500);
      return { error: String(error) };
    }
  });

  // Find similar products based on extracted product data (before tracking)
  app.post("/similar-by-data", async (request, reply) => {
    try {
      const body = z.object({
        name: z.string(),
        brand: z.string().nullish(),
        category: z.string().nullish(),
        subcategory: z.string().nullish(),
        limit: z.number().optional().default(5),
      }).parse(request.body);
      
      const limit = Math.min(body.limit, 20);
      
      // Try to find an existing product that matches
      let matchingProduct: { id: string; canonical_name: string; brand: string | null; category: string | null; subcategory: string | null } | null = null;
      
      // First try to find by name and brand
      if (body.brand) {
        const result = await sql`
          SELECT id, canonical_name, brand, category, subcategory
          FROM canonical_products
          WHERE LOWER(TRIM(brand)) = ${body.brand.toLowerCase().trim()}
          AND (
            LOWER(TRIM(canonical_name)) ILIKE ${'%' + body.name.toLowerCase().trim() + '%'}
            OR ${body.name.toLowerCase().trim()} ILIKE '%' || LOWER(TRIM(canonical_name)) || '%'
          )
          LIMIT 1
        `;
        if (result[0]) {
          matchingProduct = result[0] as typeof matchingProduct;
        }
      }
      
      // If no match, try by name only
      if (!matchingProduct) {
        const result = await sql`
          SELECT id, canonical_name, brand, category, subcategory
          FROM canonical_products
          WHERE LOWER(TRIM(canonical_name)) ILIKE ${'%' + body.name.toLowerCase().trim() + '%'}
          OR ${body.name.toLowerCase().trim()} ILIKE '%' || LOWER(TRIM(canonical_name)) || '%'
          LIMIT 1
        `;
        if (result[0]) {
          matchingProduct = result[0] as typeof matchingProduct;
        }
      }
      
      // If we found a matching product, get its similar products
      if (matchingProduct) {
        const similarProducts = await productQueries.getSimilarProducts(matchingProduct.id, limit);
        
        return {
          found: true,
          matched_product: {
            id: matchingProduct.id,
            name: matchingProduct.canonical_name,
            brand: matchingProduct.brand,
            category: matchingProduct.category,
            subcategory: matchingProduct.subcategory,
          },
          similar_products: similarProducts.map(p => ({
            id: p.id,
            name: p.canonical_name,
            brand: p.brand,
            category: p.category,
            subcategory: p.subcategory,
            image_url: p.image_url,
            similarity_score: p.similarity_score,
            match_reason: p.match_reason,
            attributes: p.attributes,
            price: p.price,
            currency: p.currency,
            store: p.store,
            product_url: p.product_url,
          })),
        };
      }
      
      // No matching product found, try to find by category
      if (body.category) {
        const categoryProducts = await productQueries.getProductsByCategory(
          body.category,
          body.subcategory || undefined,
          limit
        );
        
        if (categoryProducts.length > 0) {
          return {
            found: false,
            matched_product: null,
            similar_products: categoryProducts.map(p => ({
              id: p.id,
              name: p.canonical_name,
              brand: p.brand,
              category: p.category,
              subcategory: p.subcategory,
              image_url: p.image_url,
              similarity_score: 0.5,
              match_reason: 'same_category',
              attributes: {},
              price: p.price,
              currency: p.currency,
              store: p.store,
              product_url: p.product_url,
            })),
          };
        }
      }
      
      // Return empty if no matches found
      return {
        found: false,
        matched_product: null,
        similar_products: [],
      };
    } catch (error) {
      console.error("[API] Failed to find similar products:", error);
      reply.status(500);
      return { error: String(error) };
    }
  });

  // MVP: Get product variants (same product from different stores)
  app.get("/:id/variants", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    // Verify product exists
    const product = await sql`SELECT * FROM canonical_products WHERE id = ${id}`;
    if (!product[0]) {
      reply.status(404);
      return { error: "Product not found" };
    }
    
    const variants = await productQueries.getProductVariants(id);
    
    return {
      product_id: id,
      product_name: product[0].canonical_name,
      brand: product[0].brand,
      total_variants: variants.length,
      variants: variants.map(v => ({
        store: v.store,
        store_sku: v.store_sku,
        product_url: v.product_url,
        condition: v.condition,
        current_price: v.current_price,
        currency: v.currency,
        seller_info: v.seller_info,
      })),
    };
  });

  // MVP: Get similar products (based on pre-computed similarity scores)
  app.get("/:id/similar", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || "5", 10), 20);
    
    // Verify product exists
    const product = await sql`SELECT * FROM canonical_products WHERE id = ${id}`;
    if (!product[0]) {
      reply.status(404);
      return { error: "Product not found" };
    }
    
    const similarProducts = await productQueries.getSimilarProducts(id, limit);
    
    return {
      product_id: id,
      product_name: product[0].canonical_name,
      category: product[0].category,
      total_similar: similarProducts.length,
      similar_products: similarProducts.map(p => ({
        id: p.id,
        name: p.canonical_name,
        brand: p.brand,
        category: p.category,
        subcategory: p.subcategory,
        image_url: p.image_url,
        similarity_score: p.similarity_score,
        match_reason: p.match_reason,
        attributes: p.attributes,
        price: p.price,
        currency: p.currency,
        store: p.store,
        product_url: p.product_url,
      })),
    };
  });

  // MVP: Get price comparison across all stores
  app.get("/:id/prices", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    // Verify product exists
    const product = await sql`SELECT * FROM canonical_products WHERE id = ${id}`;
    if (!product[0]) {
      reply.status(404);
      return { error: "Product not found" };
    }
    
    const priceComparison = await productQueries.getPriceComparison(id);
    
    if (priceComparison.length === 0) {
      return {
        product_id: id,
        product_name: product[0].canonical_name,
        available: false,
        message: "No prices available for this product",
      };
    }
    
    const cheapest = priceComparison[0];
    const mostExpensive = priceComparison[priceComparison.length - 1];
    
    return {
      product_id: id,
      product_name: product[0].canonical_name,
      brand: product[0].brand,
      available: true,
      total_stores: priceComparison.length,
      price_range: {
        lowest: cheapest.lowest_price,
        highest: cheapest.highest_price,
        difference: cheapest.highest_price - cheapest.lowest_price,
        difference_percent: Math.round(((cheapest.highest_price - cheapest.lowest_price) / cheapest.lowest_price) * 100),
      },
      best_deal: {
        store: cheapest.store,
        price: cheapest.current_price,
        url: cheapest.product_url,
        condition: cheapest.condition,
      },
      all_prices: priceComparison.map(p => ({
        store: p.store,
        price: p.current_price,
        currency: p.currency,
        condition: p.condition,
        url: p.product_url,
        price_difference: p.price_difference,
        price_difference_percent: p.price_difference_percent,
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
