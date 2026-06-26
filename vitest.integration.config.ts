import { defineConfig } from "vitest/config";
import path from "path";
import { execSync } from "child_process";

// Use TEST_DATABASE_URL, defaulting to local test postgres
const testDbUrl = process.env.TEST_DATABASE_URL || "postgresql://lms_test:lms_test@localhost:5433/lms_test";
process.env.DATABASE_URL = testDbUrl;
process.env.DIRECT_URL = testDbUrl;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    globalSetup: "./tests/integration/global-setup.ts",
    setupFiles: ["./tests/integration/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/lib/generated/prisma": path.resolve(__dirname, "lib/generated/prisma"),
    },
  },
});
