"use server";

import { redirect } from "next/navigation";
import { generateApiKey } from "@/lib/api-keys";
import { prisma } from "@/lib/db";
import { hasTenantRole } from "@/lib/permissions";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { recordAuditEvent } from "@/lib/audit";
import { getTenantBySlug } from "@/lib/tenant";

export async function createIntegrationKeyAction(tenantSlug: string) {
  const user = await requireSessionUser();
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found.");

  const canManage = await hasTenantRole(tenant.id, user.id, ["TENANT_ADMIN"]);
  if (!canManage) throw new Error("Unauthorized.");

  const { raw, hash } = generateApiKey();

  const userId = await resolveDbUserId(user);
  const existingKey = await prisma.tenantIntegration.findUnique({ where: { tenantId: tenant.id } });

  await recordAuditEvent({
    action: existingKey ? "api_key.rotated" : "api_key.generated",
    actorId: userId,
    tenantId: tenant.id,
    targetId: tenant.id,
  });

  await prisma.tenantIntegration.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      apiKeyHash: hash,
      autoEnrollEnabled: true,
    },
    update: {
      apiKeyHash: hash,
    },
  });

  redirect(`/t/${tenantSlug}/admin?newApiKey=${encodeURIComponent(raw)}`);
}