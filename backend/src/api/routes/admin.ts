import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../../db/connection.ts";

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const productSchema = z.object({
  canonical_name: z.string().min(1),
  brand: z.string().nullable().optional(),
  gtin: z.string().nullable().optional(),
  ean: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
});

const storeProductSchema = z.object({
  product_id: z.string().uuid(),
  store: z.string().min(1),
  store_sku: z.string().nullable().optional(),
  product_url: z.string().url(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const priceSchema = z.object({
  store_product_id: z.string().uuid(),
  price: z.coerce.number().positive(),
  currency: z.string().default("BRL"),
  availability: z.boolean().default(true),
});

const priceAlertSchema = z.object({
  user_id: z.string().uuid(),
  product_id: z.string().uuid(),
  target_price: z.coerce.number().positive(),
});

const userProductSchema = z.object({
  user_id: z.string().uuid(),
  product_id: z.string().uuid(),
});

export async function adminRoutes(app: FastifyInstance) {
  // Stats endpoint
  app.get("/stats", async () => {
    const [products, storeProducts, prices, users, alerts] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM canonical_products`,
      sql`SELECT COUNT(*) as count FROM store_products`,
      sql`SELECT COUNT(*) as count FROM prices`,
      sql`SELECT COUNT(*) as count FROM users`,
      sql`SELECT COUNT(*) as count FROM price_alerts`,
    ]);

    const recentProducts = await sql`
      SELECT * FROM canonical_products 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    return {
      totalProducts: parseInt(products[0].count, 10),
      totalStoreProducts: parseInt(storeProducts[0].count, 10),
      totalPrices: parseInt(prices[0].count, 10),
      totalUsers: parseInt(users[0].count, 10),
      totalAlerts: parseInt(alerts[0].count, 10),
      recentProducts,
    };
  });

  // Products CRUD
  app.get("/products", async (request) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const { search } = request.query as { search?: string };

    let countQuery = sql`SELECT COUNT(*) as count FROM canonical_products`;
    let dataQuery = sql`SELECT * FROM canonical_products ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    if (search) {
      const searchTerm = `%${search}%`;
      countQuery = sql`SELECT COUNT(*) as count FROM canonical_products WHERE canonical_name ILIKE ${searchTerm} OR brand ILIKE ${searchTerm}`;
      dataQuery = sql`SELECT * FROM canonical_products WHERE canonical_name ILIKE ${searchTerm} OR brand ILIKE ${searchTerm} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    const [countResult, items] = await Promise.all([countQuery, dataQuery]);
    const total = parseInt(countResult[0].count, 10);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  });

  app.get("/products/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await sql`SELECT * FROM canonical_products WHERE id = ${id}`;
    
    if (!result[0]) {
      reply.status(404);
      return { error: "Product not found" };
    }
    
    return result[0];
  });

  app.post("/products", async (request) => {
    const data = productSchema.parse(request.body);
    
    const result = await sql`
      INSERT INTO canonical_products (canonical_name, brand, gtin, ean, image_url)
      VALUES (${data.canonical_name}, ${data.brand ?? null}, ${data.gtin ?? null}, ${data.ean ?? null}, ${data.image_url ?? null})
      RETURNING *
    `;
    
    return result[0];
  });

  app.patch("/products/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = productSchema.partial().parse(request.body);
    
    const existing = await sql`SELECT * FROM canonical_products WHERE id = ${id}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "Product not found" };
    }

    const result = await sql`
      UPDATE canonical_products
      SET 
        canonical_name = COALESCE(${data.canonical_name ?? null}, canonical_name),
        brand = COALESCE(${data.brand ?? null}, brand),
        gtin = COALESCE(${data.gtin ?? null}, gtin),
        ean = COALESCE(${data.ean ?? null}, ean),
        image_url = COALESCE(${data.image_url ?? null}, image_url),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    return result[0];
  });

  app.delete("/products/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const existing = await sql`SELECT * FROM canonical_products WHERE id = ${id}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "Product not found" };
    }

    await sql`DELETE FROM canonical_products WHERE id = ${id}`;
    return { success: true };
  });

  // Store Products CRUD
  app.get("/store-products", async (request) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const { productId } = request.query as { productId?: string };

    let countQuery = sql`SELECT COUNT(*) as count FROM store_products`;
    let dataQuery = sql`SELECT * FROM store_products ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    if (productId) {
      countQuery = sql`SELECT COUNT(*) as count FROM store_products WHERE product_id = ${productId}`;
      dataQuery = sql`SELECT * FROM store_products WHERE product_id = ${productId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    const [countResult, items] = await Promise.all([countQuery, dataQuery]);
    const total = parseInt(countResult[0].count, 10);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  });

  app.get("/store-products/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await sql`SELECT * FROM store_products WHERE id = ${id}`;
    
    if (!result[0]) {
      reply.status(404);
      return { error: "Store product not found" };
    }
    
    return result[0];
  });

  app.post("/store-products", async (request) => {
    const data = storeProductSchema.parse(request.body);
    
    // Verify product exists
    const product = await sql`SELECT id FROM canonical_products WHERE id = ${data.product_id}`;
    if (!product[0]) {
      return { error: "Product not found" };
    }
    
    const result = await sql`
      INSERT INTO store_products (product_id, store, store_sku, product_url, metadata)
      VALUES (${data.product_id}, ${data.store}, ${data.store_sku ?? null}, ${data.product_url}, ${JSON.stringify(data.metadata)})
      RETURNING *
    `;
    
    return result[0];
  });

  app.patch("/store-products/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = storeProductSchema.partial().parse(request.body);
    
    const existing = await sql`SELECT * FROM store_products WHERE id = ${id}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "Store product not found" };
    }

    const result = await sql`
      UPDATE store_products
      SET 
        product_id = COALESCE(${data.product_id ?? null}, product_id),
        store = COALESCE(${data.store ?? null}, store),
        store_sku = COALESCE(${data.store_sku ?? null}, store_sku),
        product_url = COALESCE(${data.product_url ?? null}, product_url),
        metadata = COALESCE(${data.metadata ? JSON.stringify(data.metadata) : null}, metadata),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    return result[0];
  });

  app.delete("/store-products/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const existing = await sql`SELECT * FROM store_products WHERE id = ${id}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "Store product not found" };
    }

    await sql`DELETE FROM store_products WHERE id = ${id}`;
    return { success: true };
  });

  // Prices CRUD
  app.get("/prices", async (request) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const { storeProductId } = request.query as { storeProductId?: string };

    let countQuery = sql`SELECT COUNT(*) as count FROM prices`;
    let dataQuery = sql`SELECT * FROM prices ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;

    if (storeProductId) {
      countQuery = sql`SELECT COUNT(*) as count FROM prices WHERE store_product_id = ${storeProductId}`;
      dataQuery = sql`SELECT * FROM prices WHERE store_product_id = ${storeProductId} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    const [countResult, items] = await Promise.all([countQuery, dataQuery]);
    const total = parseInt(countResult[0].count, 10);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  });

  app.get("/prices/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await sql`SELECT * FROM prices WHERE id = ${id}`;
    
    if (!result[0]) {
      reply.status(404);
      return { error: "Price not found" };
    }
    
    return result[0];
  });

  app.post("/prices", async (request) => {
    const data = priceSchema.parse(request.body);
    
    // Verify store product exists
    const storeProduct = await sql`SELECT id FROM store_products WHERE id = ${data.store_product_id}`;
    if (!storeProduct[0]) {
      return { error: "Store product not found" };
    }
    
    const result = await sql`
      INSERT INTO prices (store_product_id, price, currency, availability)
      VALUES (${data.store_product_id}, ${data.price}, ${data.currency}, ${data.availability})
      RETURNING *
    `;
    
    return result[0];
  });

  app.patch("/prices/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = priceSchema.partial().parse(request.body);
    
    const existing = await sql`SELECT * FROM prices WHERE id = ${id}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "Price not found" };
    }

    const result = await sql`
      UPDATE prices
      SET 
        store_product_id = COALESCE(${data.store_product_id ?? null}, store_product_id),
        price = COALESCE(${data.price ?? null}, price),
        currency = COALESCE(${data.currency ?? null}, currency),
        availability = COALESCE(${data.availability ?? null}, availability)
      WHERE id = ${id}
      RETURNING *
    `;
    
    return result[0];
  });

  app.delete("/prices/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const existing = await sql`SELECT * FROM prices WHERE id = ${id}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "Price not found" };
    }

    await sql`DELETE FROM prices WHERE id = ${id}`;
    return { success: true };
  });

  // Users CRUD
  app.get("/users", async (request) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;

    const countResult = await sql`SELECT COUNT(*) as count FROM users`;
    const items = await sql`SELECT * FROM users ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const total = parseInt(countResult[0].count, 10);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  });

  app.get("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    
    if (!result[0]) {
      reply.status(404);
      return { error: "User not found" };
    }
    
    return result[0];
  });

  app.post("/users", async () => {
    const result = await sql`
      INSERT INTO users DEFAULT VALUES
      RETURNING *
    `;
    
    return result[0];
  });

  app.delete("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const existing = await sql`SELECT * FROM users WHERE id = ${id}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "User not found" };
    }

    await sql`DELETE FROM users WHERE id = ${id}`;
    return { success: true };
  });

  // User Products CRUD
  app.get("/user-products", async (request) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const { userId } = request.query as { userId?: string };

    let countQuery = sql`SELECT COUNT(*) as count FROM user_products`;
    let dataQuery = sql`
      SELECT up.*, cp.canonical_name as product_name 
      FROM user_products up
      JOIN canonical_products cp ON up.product_id = cp.id
      ORDER BY up.created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    if (userId) {
      countQuery = sql`SELECT COUNT(*) as count FROM user_products WHERE user_id = ${userId}`;
      dataQuery = sql`
        SELECT up.*, cp.canonical_name as product_name 
        FROM user_products up
        JOIN canonical_products cp ON up.product_id = cp.id
        WHERE up.user_id = ${userId}
        ORDER BY up.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const [countResult, items] = await Promise.all([countQuery, dataQuery]);
    const total = parseInt(countResult[0].count, 10);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  });

  app.post("/user-products", async (request) => {
    const data = userProductSchema.parse(request.body);
    
    // Verify user and product exist
    const [user, product] = await Promise.all([
      sql`SELECT id FROM users WHERE id = ${data.user_id}`,
      sql`SELECT id FROM canonical_products WHERE id = ${data.product_id}`,
    ]);
    
    if (!user[0]) return { error: "User not found" };
    if (!product[0]) return { error: "Product not found" };
    
    const result = await sql`
      INSERT INTO user_products (user_id, product_id)
      VALUES (${data.user_id}, ${data.product_id})
      ON CONFLICT (user_id, product_id) DO UPDATE SET created_at = NOW()
      RETURNING *
    `;
    
    return result[0];
  });

  app.delete("/user-products/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const existing = await sql`SELECT * FROM user_products WHERE id = ${id}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "User product not found" };
    }

    await sql`DELETE FROM user_products WHERE id = ${id}`;
    return { success: true };
  });

  // Price Alerts CRUD
  app.get("/price-alerts", async (request) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const { userId } = request.query as { userId?: string };

    let countQuery = sql`SELECT COUNT(*) as count FROM price_alerts`;
    let dataQuery = sql`
      SELECT pa.*, cp.canonical_name as product_name 
      FROM price_alerts pa
      JOIN canonical_products cp ON pa.product_id = cp.id
      ORDER BY pa.created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    if (userId) {
      countQuery = sql`SELECT COUNT(*) as count FROM price_alerts WHERE user_id = ${userId}`;
      dataQuery = sql`
        SELECT pa.*, cp.canonical_name as product_name 
        FROM price_alerts pa
        JOIN canonical_products cp ON pa.product_id = cp.id
        WHERE pa.user_id = ${userId}
        ORDER BY pa.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const [countResult, items] = await Promise.all([countQuery, dataQuery]);
    const total = parseInt(countResult[0].count, 10);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  });

  app.post("/price-alerts", async (request) => {
    const data = priceAlertSchema.parse(request.body);
    
    // Verify user and product exist
    const [user, product] = await Promise.all([
      sql`SELECT id FROM users WHERE id = ${data.user_id}`,
      sql`SELECT id FROM canonical_products WHERE id = ${data.product_id}`,
    ]);
    
    if (!user[0]) return { error: "User not found" };
    if (!product[0]) return { error: "Product not found" };
    
    const result = await sql`
      INSERT INTO price_alerts (user_id, product_id, target_price)
      VALUES (${data.user_id}, ${data.product_id}, ${data.target_price})
      ON CONFLICT (user_id, product_id) DO UPDATE SET 
        target_price = ${data.target_price},
        created_at = NOW()
      RETURNING *
    `;
    
    return result[0];
  });

  app.patch("/price-alerts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = priceAlertSchema.partial().parse(request.body);
    
    const existing = await sql`SELECT * FROM price_alerts WHERE id = ${id}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "Price alert not found" };
    }

    const result = await sql`
      UPDATE price_alerts
      SET 
        user_id = COALESCE(${data.user_id ?? null}, user_id),
        product_id = COALESCE(${data.product_id ?? null}, product_id),
        target_price = COALESCE(${data.target_price ?? null}, target_price)
      WHERE id = ${id}
      RETURNING *
    `;
    
    return result[0];
  });

  app.delete("/price-alerts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const existing = await sql`SELECT * FROM price_alerts WHERE id = ${id}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "Price alert not found" };
    }

    await sql`DELETE FROM price_alerts WHERE id = ${id}`;
    return { success: true };
  });

  // URL Cache
  app.get("/url-cache", async (request) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;

    const countResult = await sql`SELECT COUNT(*) as count FROM url_cache`;
    const items = await sql`
      SELECT uc.*, cp.canonical_name as product_name 
      FROM url_cache uc
      JOIN canonical_products cp ON uc.product_id = cp.id
      ORDER BY uc.created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    const total = parseInt(countResult[0].count, 10);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  });

  app.delete("/url-cache/:url", async (request, reply) => {
    const { url } = request.params as { url: string };
    const decodedUrl = decodeURIComponent(url);
    
    const existing = await sql`SELECT * FROM url_cache WHERE url = ${decodedUrl}`;
    if (!existing[0]) {
      reply.status(404);
      return { error: "URL cache entry not found" };
    }

    await sql`DELETE FROM url_cache WHERE url = ${decodedUrl}`;
    return { success: true };
  });
}
