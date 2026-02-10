import { SQL } from "bun";
import { config } from "../config/index.ts";

export const sql = new SQL(config.DATABASE_URL);

export async function healthCheck(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
