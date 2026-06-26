"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant";
import { createOrUpdateSubmission, getSubmissionsForLesson } from "@/lib/assignments";
import { upsertGrade } from "@/lib/gradebook";

export async function saveSubmissionAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const lessonId = formData.get("lessonId")?.toString();
  const textContent = formData.get("textContent")?.toString() || null;
  const submit = formData.get("submit") === "true";

  if (!lessonId) throw new Error("Lesson ID required");

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true, course: { select: { slug: true } } },
  });
  if (!lesson) throw new Error("Lesson not found");

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: lesson.courseId, userId } },
    select: { id: true },
  });

  await createOrUpdateSubmission({
    lessonId,
    userId,
    enrollmentId: enrollment?.id,
    textContent,
    submit,
  });

  revalidatePath(`/t/${tenantSlug}/courses/${lesson.course.slug}`);
  revalidatePath(`/courses/${lesson.course.slug}`);
}

export async function gradeSubmissionAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const instructorId = await resolveDbUserId(sessionUser);

  const lessonId = formData.get("lessonId")?.toString();
  const studentId = formData.get("studentId")?.toString();
  const score = formData.get("score") ? parseInt(formData.get("score") as string) : undefined;
  const feedback = formData.get("feedback")?.toString() || null;

  if (!lessonId || !studentId || score === undefined) {
    throw new Error("Missing required fields");
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true, course: { select: { tenantId: true, slug: true } } },
  });
  if (!lesson) throw new Error("Lesson not found");

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || lesson.course.tenantId !== tenant.id) throw new Error("Not authorized");

  const allowed = await hasTenantRole(tenant.id, instructorId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("Not authorized");

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { lessonId_userId: { lessonId, userId: studentId } },
  });

  await upsertGrade({
    userId: studentId,
    lessonId,
    courseId: lesson.courseId,
    score: Math.min(100, Math.max(0, score)),
    feedback,
    gradedById: instructorId,
    submissionId: submission?.id,
  });

  if (submission) {
    await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: { status: "GRADED" },
    });
  }

  revalidatePath(`/t/${tenantSlug}/courses/${lesson.course.slug}/gradebook`);
  revalidatePath(`/t/${tenantSlug}/admin`);
}

export async function getMySubmissionAction(lessonId: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const sub = await prisma.assignmentSubmission.findUnique({
    where: { lessonId_userId: { lessonId, userId } },
    include: { grade: true },
  });
  if (!sub) return null;

  return {
    id: sub.id,
    textContent: sub.textContent,
    fileUrls: sub.fileUrls,
    status: sub.status,
    submittedAt: sub.submittedAt?.toISOString() ?? null,
    grade: sub.grade
      ? {
          score: sub.grade.score,
          passed: sub.grade.passed,
          feedback: sub.grade.feedback,
          gradedAt: sub.grade.gradedAt.toISOString(),
        }
      : null,
  };
}

export async function getSubmissionsAction(lessonId: string, tenantSlug: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("Not authorized");

  return getSubmissionsForLesson(lessonId);
}
