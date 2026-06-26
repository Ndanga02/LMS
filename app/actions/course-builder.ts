"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, isDbError } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant";
import { recordAuditEvent } from "@/lib/audit";
import type { LessonType } from "@/lib/generated/prisma";

async function authorize(tenantSlug: string, sessionUserId: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");
  const allowed = await hasTenantRole(tenant.id, sessionUserId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("Not authorized");
  return tenant;
}

async function verifyCourseOwnership(tenantSlug: string, courseSlug: string) {
  const course = await prisma.course.findUnique({
    where: { tenantId_slug: { tenantId: (await getTenantBySlug(tenantSlug))!.id, slug: courseSlug } },
    select: { id: true, tenantId: true },
  });
  if (!course) throw new Error("Course not found");
  return course;
}

export async function reorderSectionsAction(
  tenantSlug: string,
  courseSlug: string,
  sectionIds: string[],
) {
  const sessionUser = await requireSessionUser();
  const tenant = await authorize(tenantSlug, sessionUser.id);
  const course = await verifyCourseOwnership(tenantSlug, courseSlug);

  await prisma.$transaction(
    sectionIds.map((id, index) =>
      prisma.courseSection.update({
        where: { id, courseId: course.id },
        data: { order: index },
      }),
    ),
  );

  revalidatePath(`/t/${tenantSlug}/admin/courses/${courseSlug}/edit`);
}

export async function reorderLessonsAction(
  tenantSlug: string,
  courseSlug: string,
  sectionId: string | null,
  lessonIds: string[],
) {
  const sessionUser = await requireSessionUser();
  await authorize(tenantSlug, sessionUser.id);
  const course = await verifyCourseOwnership(tenantSlug, courseSlug);

  await prisma.$transaction(
    lessonIds.map((id, index) =>
      prisma.lesson.update({
        where: { id, courseId: course.id },
        data: { order: index, sectionId },
      }),
    ),
  );

  revalidatePath(`/t/${tenantSlug}/admin/courses/${courseSlug}/edit`);
}

export async function createSectionAction(tenantSlug: string, courseSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  await authorize(tenantSlug, sessionUser.id);
  const course = await verifyCourseOwnership(tenantSlug, courseSlug);

  const title = formData.get("title") as string;
  if (!title?.trim()) throw new Error("Section title is required");

  const maxOrder = await prisma.courseSection.aggregate({
    where: { courseId: course.id },
    _max: { order: true },
  });

  await prisma.courseSection.create({
    data: {
      courseId: course.id,
      title: title.trim(),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/t/${tenantSlug}/admin/courses/${courseSlug}/edit`);
}

export async function updateSectionAction(tenantSlug: string, courseSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  await authorize(tenantSlug, sessionUser.id);
  const course = await verifyCourseOwnership(tenantSlug, courseSlug);

  const sectionId = formData.get("sectionId") as string;
  const title = formData.get("title") as string;

  if (!sectionId || !title?.trim()) throw new Error("Invalid input");

  await prisma.courseSection.update({
    where: { id: sectionId, courseId: course.id },
    data: { title: title.trim() },
  });

  revalidatePath(`/t/${tenantSlug}/admin/courses/${courseSlug}/edit`);
}

export async function deleteSectionAction(tenantSlug: string, courseSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  await authorize(tenantSlug, sessionUser.id);
  const course = await verifyCourseOwnership(tenantSlug, courseSlug);

  const sectionId = formData.get("sectionId") as string;
  if (!sectionId) throw new Error("Section ID required");

  const lessonsInSection = await prisma.lesson.count({
    where: { sectionId, courseId: course.id },
  });

  if (lessonsInSection > 0) {
    await prisma.lesson.updateMany({
      where: { sectionId, courseId: course.id },
      data: { sectionId: null },
    });
  }

  await prisma.courseSection.delete({
    where: { id: sectionId, courseId: course.id },
  });

  revalidatePath(`/t/${tenantSlug}/admin/courses/${courseSlug}/edit`);
}

export async function bulkPublishLessonsAction(tenantSlug: string, courseSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  await authorize(tenantSlug, sessionUser.id);
  await verifyCourseOwnership(tenantSlug, courseSlug);

  const lessonIds = formData.getAll("lessonId") as string[];
  const publish = formData.get("publish") === "true";

  if (lessonIds.length === 0) throw new Error("No lessons selected");

  await prisma.lesson.updateMany({
    where: { id: { in: lessonIds } },
    data: { isPublished: publish },
  });

  revalidatePath(`/t/${tenantSlug}/admin/courses/${courseSlug}/edit`);
}

export async function bulkDeleteLessonsAction(tenantSlug: string, courseSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  await authorize(tenantSlug, sessionUser.id);
  await verifyCourseOwnership(tenantSlug, courseSlug);

  const lessonIds = formData.getAll("lessonId") as string[];
  if (lessonIds.length === 0) throw new Error("No lessons selected");

  await prisma.lesson.deleteMany({
    where: { id: { in: lessonIds } },
  });

  revalidatePath(`/t/${tenantSlug}/admin/courses/${courseSlug}/edit`);
}
