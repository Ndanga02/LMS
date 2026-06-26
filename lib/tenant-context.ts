import { headers } from "next/headers";
import { PLATFORM_TENANT_SLUG } from "./tenant-constants";
import { getTenantBySlug } from "./tenant";

export async function getRequestTenantSlug() {
  const headersList = await headers();
  return headersList.get("x-tenant-slug") ?? PLATFORM_TENANT_SLUG;
}

export async function getRequestTenant() {
  const slug = await getRequestTenantSlug();
  return getTenantBySlug(slug);
}