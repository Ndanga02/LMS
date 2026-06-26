"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant";
import { getCourseGradebook, getStudentGrades, upsertGrade } from "@/lib/gradebook";

export async function getCourseGradebookAction(tenantSlug: string, courseSlug: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR", "STUDENT"]);
  if (!allowed) throw new Error("Not authorized");

  const course = await prisma.course.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: courseSlug } },
    select: { id: true },
  });
  if (!course) throw new Error("Course not found");

  return getCourseGradebook(course.id);
}

export async function getMyGradesAction() {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);
  return getStudentGrades(userId);
}

export async function quickGradeAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const instructorId = await resolveDbUserId(sessionUser);

  const lessonId = formData.get("lessonId")?.toString();
  const studentId = formData.get("studentId")?.toString();
  const rawScore = formData.get("score")?.toString();
  const feedback = formData.get("feedback")?.toString() || null;

  if (!lessonId || !studentId || rawScore === undefined) {
    throw new Error("Missing required fields");
  }

  const score = Math.min(100, Math.max(0, parseInt(rawScore)));

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  });
  if (!lesson) throw new Error("Lesson not found");

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, instructorId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("Not authorized");

  await upsertGrade({
    userId: studentId,
    lessonId,
    courseId: lesson.courseId,
    score,
    feedback,
    gradedById: instructorId,
  });

  revalidatePath(`/t/${tenantSlug}/courses`);
  revalidatePath(`/t/${tenantSlug}/admin`);
}
