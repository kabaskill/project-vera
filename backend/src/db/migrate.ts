import { sql } from "../db/connection.ts";
import { join } from "path";

const MIGRATIONS_TABLE = "schema_migrations";

export async function createMigrationsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql(MIGRATIONS_TABLE)} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function getExecutedMigrations(): Promise<string[]> {
  const rows = await sql`SELECT name FROM ${sql(MIGRATIONS_TABLE)} ORDER BY id`;
  return rows.map(r => r.name as string);
}

export async function runMigrations(migrationsDir: string = join(import.meta.dir, "migrations")): Promise<void> {
  await createMigrationsTable();
  
  const executed = await getExecutedMigrations();
  
  const migrationFiles = ["001_initial_schema.sql"];
  
  for (const fileName of migrationFiles) {
    if (executed.includes(fileName)) {
      console.log(`Skipping ${fileName} (already executed)`);
      continue;
    }
    
    const filePath = join(migrationsDir, fileName);
    const file = Bun.file(filePath);
    const sqlContent = await file.text();
    
    console.log(`Running migration: ${fileName}`);
    await sql.unsafe(sqlContent);
    
    await sql`INSERT INTO ${sql(MIGRATIONS_TABLE)} (name) VALUES (${fileName})`;
    
    console.log(`Completed: ${fileName}`);
  }
}

if (import.meta.main) {
  runMigrations()
    .then(() => {
      console.log("Migrations completed successfully");
      process.exit(0);
    })
    .catch(err => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
