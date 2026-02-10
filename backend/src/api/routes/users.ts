import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as userQueries from "../../db/queries/users.ts";
import { sql } from "../../db/connection.ts";

const createUserSchema = z.object({
  deviceId: z.string(),
});

export async function userRoutes(app: FastifyInstance) {
  // Get or create user
  app.post("/register", async (request) => {
    const body = createUserSchema.parse(request.body);
    const user = await userQueries.getOrCreateUser(body.deviceId);
    return { id: user.id, createdAt: user.created_at };
  });

  // Get user product history
  app.get("/:userId/history", async (request) => {
    const { userId } = request.params as { userId: string };
    const history = await userQueries.getUserProductHistory(userId, 50);
    
    return {
      userId,
      history: history.map(h => ({
        id: h.id,
        product: h.product,
        viewedAt: h.created_at,
      })),
    };
  });

  // Create price alert
  app.post("/alerts", async (request) => {
    const body = z.object({
      userId: z.string(),
      productId: z.string(),
      targetPrice: z.number(),
    }).parse(request.body);
    
    const alert = await userQueries.createPriceAlert(body.userId, body.productId, body.targetPrice);
    return {
      success: true,
      alert: {
        id: alert.id,
        productId: alert.product_id,
        targetPrice: alert.target_price,
      },
    };
  });

  // Get user's price alerts
  app.get("/:userId/alerts", async (request) => {
    const { userId } = request.params as { userId: string };
    
    const result = await sql`
      SELECT pa.*, cp.canonical_name as product_name
      FROM price_alerts pa
      JOIN canonical_products cp ON pa.product_id = cp.id
      WHERE pa.user_id = ${userId}
    `;
    
    return {
      userId,
      alerts: result.map(a => ({
        id: a.id,
        productId: a.product_id,
        productName: a.product_name,
        targetPrice: a.target_price,
      })),
    };
  });
}
