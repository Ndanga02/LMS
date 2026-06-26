import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Supabase Prisma setup:
// - For CLI (migrate, db push, etc.): use DIRECT_URL (session pooler on 5432) — more reliable for large schema changes / DDL to avoid hangs on transaction pooler.
// - App runtime (lib/db.ts): uses DATABASE_URL (transaction pooler with pgbouncer=true on 6543) for queries.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),   // session pooler for schema ops / migrations (stable for large DDL)
  },
});