import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string(),
  SUPABASE_LOCAL_DB_URL: z.string().optional(),
  API_PREFIX: z.string().default("/api/v1"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

// Use local Supabase in development if available
const getDatabaseUrl = () => {
  if (parsed.data.NODE_ENV === "development" && parsed.data.SUPABASE_LOCAL_DB_URL) {
    console.log("[Config] Using local Supabase database");
    return parsed.data.SUPABASE_LOCAL_DB_URL;
  }
  console.log("[Config] Using production database");
  return parsed.data.DATABASE_URL;
};

export const config = {
  ...parsed.data,
  DATABASE_URL: getDatabaseUrl(),
};
