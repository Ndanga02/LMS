import { prisma } from "@/lib/db";

export type AssignmentWithSubmission = {
  id: string;
  title: string;
  slug: string;
  dueDate: Date | null;
  submission: {
    id: string;
    textContent: string | null;
    fileUrls: string[];
    status: string;
    submittedAt: Date | null;
    grade: { score: number; passed: boolean; feedback: string | null; gradedAt: Date } | null;
  } | null;
};

export async function getAssignmentWithSubmission(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      slug: true,
      dueDate: true,
      submissions: {
        where: { userId },
        include: { grade: true },
      },
    },
  });
  if (!lesson) return null;
  return {
    id: lesson.id,
    title: lesson.title,
    slug: lesson.slug,
    dueDate: lesson.dueDate,
    submission: lesson.submissions[0] ?? null,
  };
}

export async function createOrUpdateSubmission(params: {
  lessonId: string;
  userId: string;
  enrollmentId?: string | null;
  textContent?: string | null;
  fileUrls?: string[];
  submit: boolean;
}) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    select: { dueDate: true, courseId: true },
  });
  if (!lesson) throw new Error("Lesson not found");

  const existing = await prisma.assignmentSubmission.findUnique({
    where: { lessonId_userId: { lessonId: params.lessonId, userId: params.userId } },
  });

  const isLate = lesson.dueDate ? new Date() > lesson.dueDate : false;
  const status = params.submit ? (isLate ? "LATE" : "SUBMITTED") : "DRAFT";

  if (existing) {
    return prisma.assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        textContent: params.textContent ?? existing.textContent,
        fileUrls: params.fileUrls ?? existing.fileUrls,
        status: params.submit ? status : existing.status,
        submittedAt: params.submit ? new Date() : existing.submittedAt,
      },
    });
  }

  return prisma.assignmentSubmission.create({
    data: {
      lessonId: params.lessonId,
      userId: params.userId,
      enrollmentId: params.enrollmentId ?? null,
      textContent: params.textContent ?? null,
      fileUrls: params.fileUrls ?? [],
      status,
      submittedAt: params.submit ? new Date() : null,
    },
  });
}

export async function getSubmissionsForLesson(lessonId: string) {
  return prisma.assignmentSubmission.findMany({
    where: { lessonId, status: { in: ["SUBMITTED", "LATE", "GRADED"] } },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      grade: true,
    },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getSubmissionsForCourse(courseId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId, type: "ASSIGNMENT" },
    select: { id: true, title: true },
  });
  return lessons;
}
