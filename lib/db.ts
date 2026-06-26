import { PrismaClient } from "./generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";

function buildConnectionString(url: string): string {
  // Clean quotes and any provider-specific query params if present
  let connectionString = url.trim().replace(/^["']|["']$/g, "");
  // Remove any neon-specific markers that might have been in old URLs
  connectionString = connectionString.replace(/\?neondb\?/g, "?");
  return connectionString;
}

// Use DATABASE_URL (Supabase transaction pooler recommended for app queries)
// Falls back to SUPABASE_URL or DIRECT_URL if needed.
const rawDatabaseUrl = env.DATABASE_URL || env.SUPABASE_URL || env.DIRECT_URL || process.env.DATABASE_URL;
if (!rawDatabaseUrl) {
  throw new Error("Missing DATABASE_URL (Supabase pooler). Set DATABASE_URL and DIRECT_URL in .env as per Supabase Prisma guide.");
}

const connectionString = buildConnectionString(rawDatabaseUrl);

// Supabase often requires explicit SSL config, especially with direct connections or certain networks.
// The Pooler (recommended for IPv4) usually works without extra options.
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Helps with Supabase cloud certs in many environments
  },
  // You can also add: max: 10, idleTimeoutMillis: 30000 for tuning
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function isDbConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as { code?: string; message?: string };
  const message = err.message ?? "";
  const code = String(err.code ?? "");

  return (
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "P1001" ||
    code === "P1002" ||
    code === "P1008" ||
    code === "P1017" ||
    message.includes("ETIMEDOUT") ||
    message.includes("fetch failed") ||
    message.includes("Can't reach database") ||
    message.includes("connection")
  );
}

export function isPrismaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as {
    name?: string;
    code?: string;
    clientVersion?: string;
  };

  return (
    typeof err.clientVersion === "string" ||
    (typeof err.name === "string" && err.name.startsWith("Prisma")) ||
    (typeof err.code === "string" && err.code.startsWith("P"))
  );
}

export function isDbError(error: unknown): boolean {
  return isDbConnectionError(error) || isPrismaError(error);
}