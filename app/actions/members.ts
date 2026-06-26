"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { recordAuditEvent } from "@/lib/audit";
import { getTenantBySlug } from "@/lib/tenant";

export async function inviteMemberAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN"]);
  if (!allowed) throw new Error("Only tenant admins can invite members.");

  const email = formData.get("email")?.toString().toLowerCase().trim();
  const role = formData.get("role")?.toString() || "STUDENT";

  if (!email) throw new Error("Email is required.");

  if (!["TENANT_ADMIN", "INSTRUCTOR", "STUDENT"].includes(role)) {
    throw new Error("Invalid role.");
  }

  // Find or create the user by email
  let targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    targetUser = await prisma.user.create({
      data: { email, name: email.split("@")[0] },
    });
  }

  // Check if membership already exists
  const existing = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: targetUser.id } },
  });

  if (existing) {
    throw new Error(`${email} is already a member of this tenant.`);
  }

  await prisma.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      userId: targetUser.id,
      role: role as "TENANT_ADMIN" | "INSTRUCTOR" | "STUDENT",
    },
  });

  await recordAuditEvent({
    action: "user.role_changed",
    actorId: userId,
    tenantId: tenant.id,
    targetId: targetUser.id,
    metadata: { email, role, action: "member_invited" },
  });

  revalidatePath(`/t/${tenantSlug}/admin/members`);
  redirect(`/t/${tenantSlug}/admin/members`);
}

export async function updateMemberRoleAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN"]);
  if (!allowed) throw new Error("Only tenant admins can change member roles.");

  const membershipId = formData.get("membershipId")?.toString();
  const role = formData.get("role")?.toString();

  if (!membershipId || !role) throw new Error("Membership ID and role are required.");
  if (!["TENANT_ADMIN", "INSTRUCTOR", "STUDENT"].includes(role)) {
    throw new Error("Invalid role.");
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { email: true } } },
  });

  if (!membership || membership.tenantId !== tenant.id) {
    throw new Error("Membership not found.");
  }

  await prisma.tenantMembership.update({
    where: { id: membershipId },
    data: { role: role as "TENANT_ADMIN" | "INSTRUCTOR" | "STUDENT" },
  });

  await recordAuditEvent({
    action: "user.role_changed",
    actorId: userId,
    tenantId: tenant.id,
    targetId: membership.userId,
    metadata: { email: membership.user.email, previousRole: membership.role, newRole: role },
  });

  revalidatePath(`/t/${tenantSlug}/admin/members`);
  redirect(`/t/${tenantSlug}/admin/members`);
}

export async function removeMemberAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN"]);
  if (!allowed) throw new Error("Only tenant admins can remove members.");

  const membershipId = formData.get("membershipId")?.toString();
  if (!membershipId) throw new Error("Membership ID required.");

  const membership = await prisma.tenantMembership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { email: true } } },
  });

  if (!membership || membership.tenantId !== tenant.id) {
    throw new Error("Membership not found.");
  }

  await prisma.tenantMembership.delete({ where: { id: membershipId } });

  await recordAuditEvent({
    action: "user.role_changed",
    actorId: userId,
    tenantId: tenant.id,
    targetId: membership.userId,
    metadata: { email: membership.user.email, role: membership.role, action: "member_removed" },
  });

  revalidatePath(`/t/${tenantSlug}/admin/members`);
  redirect(`/t/${tenantSlug}/admin/members`);
}
