import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "e2e/**", "tests/**"],
    coverage: {
      provider: "v8",
      include: ["lib/**", "components/**", "app/actions/**", "app/api/**"],
      exclude: ["lib/__tests__/**", "lib/generated/**", "lib/ui/**", "components/ui/**"],
    },
    setupFiles: ["./lib/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/lib/generated/prisma": path.resolve(__dirname, "lib/generated/prisma"),
    },
  },
});
