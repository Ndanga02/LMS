"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant";

const addResourceSchema = z.object({
  lessonId: z.string().cuid(),
  title: z.string().min(1).max(200),
  url: z.string().min(1),
  type: z.string().max(50).optional(),
});

export async function addResourceAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("Permission denied");

  const raw = {
    lessonId: formData.get("lessonId"),
    title: formData.get("title"),
    url: formData.get("url"),
    type: formData.get("type") || undefined,
  };

  const parsed = addResourceSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid resource data: " + JSON.stringify(parsed.error.flatten()));
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.lessonId },
    select: { courseId: true, course: { select: { tenantId: true, slug: true } } },
  });
  if (!lesson || lesson.course.tenantId !== tenant.id) {
    throw new Error("Lesson not found in this tenant.");
  }

  const last = await prisma.lessonResource.findFirst({
    where: { lessonId: parsed.data.lessonId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.lessonResource.create({
    data: {
      lessonId: parsed.data.lessonId,
      title: parsed.data.title,
      url: parsed.data.url,
      type: parsed.data.type ?? null,
      order: (last?.order ?? 0) + 1,
    },
  });

  revalidatePath(`/t/${tenantSlug}/courses/${lesson.course.slug}`);
  revalidatePath(`/t/${tenantSlug}/admin`);

  return { success: true };
}

export async function deleteResourceAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("Permission denied");

  const resourceId = formData.get("resourceId")?.toString();
  if (!resourceId) throw new Error("Resource ID required");

  const resource = await prisma.lessonResource.findUnique({
    where: { id: resourceId },
    select: { lesson: { select: { course: { select: { tenantId: true, slug: true } } } } },
  });
  if (!resource || resource.lesson.course.tenantId !== tenant.id) {
    throw new Error("Resource not found.");
  }

  await prisma.lessonResource.delete({ where: { id: resourceId } });

  revalidatePath(`/t/${tenantSlug}/courses/${resource.lesson.course.slug}`);
  revalidatePath(`/t/${tenantSlug}/admin`);

  return { success: true };
}
