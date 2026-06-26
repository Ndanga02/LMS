import { ensurePlatformTenant } from "@/lib/tenant";

export async function ensureAppBootstrap() {
  return ensurePlatformTenant().catch(() => {});
}
