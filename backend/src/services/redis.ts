import { RedisClient } from "bun";
import { config } from "../config/index.ts";

let redisClient: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    redisClient = new RedisClient(config.REDIS_URL);
  }
  return redisClient;
}

export async function healthCheckRedis(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
