import type { FastifyInstance } from "fastify";
import { sql } from "../../db/connection.ts";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const dbHealthy = await sql`SELECT 1`.then(() => true).catch(() => false);
    
    return {
      status: dbHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: dbHealthy ? "connected" : "disconnected",
    };
  });
}
