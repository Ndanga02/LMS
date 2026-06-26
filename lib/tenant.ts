import { cache } from "react";
import { prisma } from "@/lib/db";
import { PLATFORM_TENANT_SLUG } from "@/lib/tenant-constants";

export { PLATFORM_TENANT_SLUG };

export const getTenantBySlug = cache(async (slug: string) => {
  return prisma.tenant.findUnique({
    where: { slug },
    include: { integration: true },
  });
});

export const getPlatformTenant = cache(async () => {
  return prisma.tenant.findFirst({
    where: { isPlatform: true },
  });
});

export async function ensurePlatformTenant() {
  return prisma.tenant.upsert({
    where: { slug: PLATFORM_TENANT_SLUG },
    create: {
      slug: PLATFORM_TENANT_SLUG,
      name: "SemtexTech LMS",
      description: "The main public marketplace and platform for SemtexTech courses. Lease your own branded tenant at /t/your-org.",
      isPlatform: true,
      status: "ACTIVE",
      enrollmentMode: "BOTH",
      websiteUrl: "https://semtextech.example",
    },
    update: {
      // keep existing platform fresh on bootstrap
      description: "The main public marketplace and platform for SemtexTech courses. Lease your own branded tenant at /t/your-org.",
    },
  });
}

export { getTenantSlugFromPathname } from "@/lib/tenant-constants";