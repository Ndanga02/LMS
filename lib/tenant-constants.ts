/** Edge-safe tenant helpers — no Node/Prisma imports. */

export const PLATFORM_TENANT_SLUG = "platform";

export function getTenantSlugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([^/]+)/);
  return match?.[1] ?? null;
}