import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prismaV4: PrismaClient };

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Check your environment variables."
  );
}

const connectionString = process.env.DATABASE_URL;

// Supabase requires SSL for external connections (e.g. Vercel serverless)
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString,
  max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  idleTimeoutMillis: Number(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS ?? 30_000),
  connectionTimeoutMillis: Number(process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS ?? 5_000),
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prismaV4 ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaV4 = db;
