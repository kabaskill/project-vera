import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config/index.ts";
import { sql } from "./db/connection.ts";
import { startAllWorkers } from "./workers/index.ts";
import { productRoutes } from "./api/routes/products.ts";
import { userRoutes } from "./api/routes/users.ts";
import { healthRoutes } from "./api/routes/health.ts";

export async function buildApp() {
  const app = Fastify({
    logger: config.NODE_ENV === "development",
  });

  await app.register(cors, { origin: true, credentials: true });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Project Vera",
        version: "0.1",
      },
    },
  });

  await app.register(swaggerUi, { routePrefix: "/docs" });

  await app.register(healthRoutes, { prefix: config.API_PREFIX });
  await app.register(productRoutes, { prefix: `${config.API_PREFIX}/products` });
  await app.register(userRoutes, { prefix: `${config.API_PREFIX}/users` });

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      error: "Internal Server Error",
      message: config.NODE_ENV === "development" ? error.message : undefined,
    });
  });

  return app;
}

export async function startServer() {
  try {
    startAllWorkers();
    
    const app = await buildApp();
    const port = parseInt(config.PORT, 10);
    await app.listen({ port, host: "0.0.0.0" });
    
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Docs at http://localhost:${port}/docs`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  await sql.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await sql.close();
  process.exit(0);
});
