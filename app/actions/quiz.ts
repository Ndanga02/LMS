"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant";

const addQuestionSchema = z.object({
  quizId: z.string().cuid(),
  question: z.string().min(1).max(1000),
  options: z.array(z.string().min(1).max(500)).min(2).max(10),
  correctIndex: z.coerce.number().int().min(0),
});

const updateQuestionSchema = z.object({
  questionId: z.string().cuid(),
  question: z.string().min(1).max(1000).optional(),
  options: z.array(z.string().min(1).max(500)).min(2).max(10).optional(),
  correctIndex: z.coerce.number().int().min(0).optional(),
});

async function authorizeForLesson(tenantSlug: string, lessonId: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("Not authorized");

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { course: { select: { tenantId: true, slug: true } } },
  });
  if (!lesson || lesson.course.tenantId !== tenant.id) {
    throw new Error("Lesson not found in this tenant.");
  }

  return { userId, tenant, lesson };
}

export async function addQuizQuestionAction(tenantSlug: string, formData: FormData) {
  const quizId = formData.get("quizId") as string;
  if (!quizId) throw new Error("Quiz ID required");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { lessonId: true },
  });
  if (!quiz) throw new Error("Quiz not found");

  await authorizeForLesson(tenantSlug, quiz.lessonId);

  const raw = {
    quizId,
    question: formData.get("question") as string,
    options: formData.getAll("option") as string[],
    correctIndex: formData.get("correctIndex"),
  };

  const parsed = addQuestionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid question data: " + JSON.stringify(parsed.error.flatten()));
  }

  const { question, options, correctIndex } = parsed.data;

  if (correctIndex >= options.length) {
    throw new Error("Correct answer index is out of range.");
  }

  const maxOrder = await prisma.quizQuestion.aggregate({
    where: { quizId },
    _max: { order: true },
  });

  await prisma.quizQuestion.create({
    data: {
      quizId,
      question,
      options,
      correctIndex,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/t/${tenantSlug}/admin`);
}

export async function updateQuizQuestionAction(tenantSlug: string, formData: FormData) {
  const questionId = formData.get("questionId") as string;
  if (!questionId) throw new Error("Question ID required");

  const existing = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: { select: { lessonId: true } } },
  });
  if (!existing) throw new Error("Question not found");

  await authorizeForLesson(tenantSlug, existing.quiz.lessonId);

  const raw = {
    questionId,
    question: formData.get("question") as string || undefined,
    options: (formData.getAll("option") as string[]).filter(Boolean),
    correctIndex: formData.get("correctIndex") ? Number(formData.get("correctIndex")) : undefined,
  };

  if (raw.options && raw.options.length < 2) raw.options = undefined as unknown as string[];
  if (raw.correctIndex !== undefined && raw.options && raw.correctIndex >= raw.options.length) {
    throw new Error("Correct answer index is out of range.");
  }

  const updateData: Record<string, unknown> = {};
  if (raw.question) updateData.question = raw.question;
  if (raw.options) updateData.options = raw.options;
  if (raw.correctIndex !== undefined) updateData.correctIndex = raw.correctIndex;

  if (Object.keys(updateData).length === 0) return;

  await prisma.quizQuestion.update({
    where: { id: questionId },
    data: updateData,
  });

  revalidatePath(`/t/${tenantSlug}/admin`);
}

export async function deleteQuizQuestionAction(tenantSlug: string, formData: FormData) {
  const questionId = formData.get("questionId") as string;
  if (!questionId) throw new Error("Question ID required");

  const existing = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: { select: { lessonId: true } } },
  });
  if (!existing) throw new Error("Question not found");

  await authorizeForLesson(tenantSlug, existing.quiz.lessonId);

  await prisma.quizQuestion.delete({ where: { id: questionId } });

  revalidatePath(`/t/${tenantSlug}/admin`);
}

export async function reorderQuizQuestionsAction(tenantSlug: string, formData: FormData) {
  const quizId = formData.get("quizId") as string;
  if (!quizId) throw new Error("Quiz ID required");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { lessonId: true },
  });
  if (!quiz) throw new Error("Quiz not found");

  await authorizeForLesson(tenantSlug, quiz.lessonId);

  const questionIds = formData.getAll("questionId") as string[];
  if (questionIds.length === 0) return;

  await prisma.$transaction(
    questionIds.map((id, index) =>
      prisma.quizQuestion.update({
        where: { id, quizId },
        data: { order: index },
      }),
    ),
  );

  revalidatePath(`/t/${tenantSlug}/admin`);
}
