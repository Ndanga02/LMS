import type { PlatformRole, TenantRole } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db";

export async function getMembership(tenantId: string, userId: string) {
  return prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
}

export async function isSuperAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });
  return user?.platformRole === "SUPER_ADMIN";
}

export async function isTenantActive(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  });
  return tenant?.status === "ACTIVE";
}

export async function hasTenantRole(
  tenantId: string,
  userId: string,
  roles: TenantRole[],
) {
  if (await isSuperAdmin(userId)) return true;

  if (!(await isTenantActive(tenantId))) return false;

  const membership = await getMembership(tenantId, userId);
  return membership ? roles.includes(membership.role) : false;
}

export async function requireTenantRole(
  tenantId: string,
  userId: string,
  roles: TenantRole[],
) {
  const allowed = await hasTenantRole(tenantId, userId, roles);
  if (!allowed) {
    throw new Error("You do not have permission to perform this action.");
  }
}
