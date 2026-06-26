"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole, isSuperAdmin } from "@/lib/permissions";
import { recordAuditEvent } from "@/lib/audit";
import { getTenantBySlug } from "@/lib/tenant";

const createTenantSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  enrollmentMode: z.enum(["PURCHASE_ONLY", "INTEGRATION_ONLY", "BOTH"]).default("BOTH"),
});

export async function updateTenantAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN"]);
  if (!allowed) throw new Error("Only tenant admins can update tenant settings.");

  const name = formData.get("name")?.toString() || tenant.name;
  const description = formData.get("description")?.toString() || undefined;
  const websiteUrl = formData.get("websiteUrl")?.toString() || undefined;
  const supportEmail = formData.get("supportEmail")?.toString() || undefined;
  const primaryColor = formData.get("primaryColor")?.toString() || undefined;
  const logoUrl = formData.get("logoUrl")?.toString() || undefined;
  const onboardingComplete = formData.get("onboardingComplete") === "true";

  const enrollmentMode = formData.get("enrollmentMode")?.toString();
  if (enrollmentMode && enrollmentMode !== tenant.enrollmentMode) {
    if (!["PURCHASE_ONLY", "INTEGRATION_ONLY", "BOTH"].includes(enrollmentMode)) {
      throw new Error("Invalid enrollment mode.");
    }

    if (enrollmentMode === "INTEGRATION_ONLY") {
      const directCount = await prisma.enrollment.count({
        where: {
          tenantId: tenant.id,
          source: { in: ["PURCHASE", "MANUAL"] },
          status: "ACTIVE",
        },
      });
      if (directCount > 0) {
        throw new Error(
          `Cannot switch to integration-only: ${directCount} active enrollment(s) from direct purchase or manual sources exist. Revoke them first.`,
        );
      }
    }

    if (enrollmentMode === "PURCHASE_ONLY") {
      const integrationCount = await prisma.enrollment.count({
        where: {
          tenantId: tenant.id,
          source: "INTEGRATION",
          status: "ACTIVE",
        },
      });
      if (integrationCount > 0) {
        throw new Error(
          `Cannot switch to purchase-only: ${integrationCount} active enrollment(s) from API integration exist. Revoke them first.`,
        );
      }
    }
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      name,
      description,
      websiteUrl,
      supportEmail,
      primaryColor: primaryColor || tenant.primaryColor,
      logoUrl: logoUrl || tenant.logoUrl,
      onboardingComplete,
      ...(enrollmentMode ? { enrollmentMode: enrollmentMode as any } : {}),
    },
  });

  await recordAuditEvent({
    action: "tenant.updated",
    actorId: userId,
    tenantId: tenant.id,
    metadata: { onboarding: onboardingComplete },
  });

  revalidatePath(`/t/${tenantSlug}/onboarding`);
  revalidatePath(`/t/${tenantSlug}/admin`);

  if (onboardingComplete) {
    redirect(`/t/${tenantSlug}/admin`);
  }
}

export async function createTenantAction(formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const isSuper = await isSuperAdmin(userId);
  if (!isSuper) {
    throw new Error("Only super admins can create tenants.");
  }

  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    enrollmentMode: formData.get("enrollmentMode") || "BOTH",
  };

  const parsed = createTenantSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid tenant data: " + JSON.stringify(parsed.error.flatten()));
  }

  const data = parsed.data;

  const { tenant } = await prisma.$transaction(async (tx) => {
    const existing = await tx.tenant.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new Error(`Slug "${data.slug}" is already taken.`);
    }

    const tenant = await tx.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        enrollmentMode: data.enrollmentMode,
        status: "ACTIVE",
        isPlatform: false,
      },
    });

    // Make the current super admin a TENANT_ADMIN of the new tenant
    await tx.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId,
        role: "TENANT_ADMIN",
      },
    });

    return { tenant };
  });

  await recordAuditEvent({
    action: "tenant.created",
    actorId: userId,
    tenantId: tenant.id,
    targetId: tenant.id,
    metadata: { slug: data.slug, name: data.name },
  });

  revalidatePath("/admin");
  revalidatePath(`/t/${data.slug}/admin`);
  revalidatePath(`/t/${data.slug}/onboarding`);

  redirect(`/t/${data.slug}/onboarding`);
}
