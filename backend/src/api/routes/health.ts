import type { FastifyInstance } from "fastify";
import { sql } from "../../db/connection.ts";
import { healthCheckRedis } from "../../services/redis.ts";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const [dbHealthy, redisHealthy] = await Promise.all([
      sql`SELECT 1`.then(() => true).catch(() => false),
      healthCheckRedis(),
    ]);
    
    const isHealthy = dbHealthy && redisHealthy;
    
    return {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      database: dbHealthy ? "connected" : "disconnected",
      redis: redisHealthy ? "connected" : "disconnected",
    };
  });
}
