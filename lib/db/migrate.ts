import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { createLogger } from "@/lib/logger";

const logger = createLogger("db/migrate");

// Load environment variables from .env.local first, then .env as fallback
config({ path: ".env.local" });
config({ path: ".env" });

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  logger.log("⏳ Running migrations...");

  const start = Date.now();
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  const end = Date.now();

  logger.log("✅ Migrations completed in", end - start, "ms");
  process.exit(0);
};

runMigrate().catch((err) => {
  logger.error("❌ Migration failed");
  logger.error(err);
  process.exit(1);
});
