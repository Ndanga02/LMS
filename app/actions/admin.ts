"use server";

import { revalidatePath } from "next/cache";
import { prisma, isDbError } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";
import { recordAuditEvent } from "@/lib/audit";

async function requireSuperAdmin() {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/admin");
  const userId = await resolveDbUserId(sessionUser);
  const allowed = await isSuperAdmin(userId).catch(() => false);
  if (!allowed) {
    throw new Error("Not authorized");
  }
  return { id: userId };
}

export async function suspendUserAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("User ID required");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.platformRole === "SUPER_ADMIN") throw new Error("Cannot suspend a super admin");

  await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: new Date() },
  });

  await recordAuditEvent({
    action: "user.role_changed",
    actorId: actor.id,
    targetId: userId,
    metadata: { action: "suspended" },
  });

  revalidatePath("/admin");
}

export async function unsuspendUserAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("User ID required");

  await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: null },
  });

  await recordAuditEvent({
    action: "user.role_changed",
    actorId: actor.id,
    targetId: userId,
    metadata: { action: "unsuspended" },
  });

  revalidatePath("/admin");
}

export async function updateTenantStatusAction(formData: FormData) {
  const actor = await requireSuperAdmin();
  const tenantId = formData.get("tenantId") as string;
  const status = formData.get("status") as string;
  if (!tenantId || !status) throw new Error("Invalid input");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: status as any },
  });

  await recordAuditEvent({
    action: "tenant.updated",
    actorId: actor.id,
    targetId: tenantId,
    metadata: { status, previousStatus: tenant.status },
  });

  revalidatePath("/admin");
}
