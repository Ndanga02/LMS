"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getTenantBySlug } from "@/lib/tenant";
import { awardAchievement } from "@/lib/achievements";
import { upsertLessonNote, createLessonBookmark, getLessonNote, getLessonBookmarks } from "@/lib/notes";
import { saveVideoPosition, getLessonProgress } from "@/lib/progress";
import { sendStreakReminderEmail } from "@/lib/emails";
import { getUserStreak } from "@/lib/streaks";

// Save last video position (called from client video player)
export async function saveVideoPositionAction(lessonId: string, positionSeconds: number, tenantSlug = "platform", courseSlug?: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  await saveVideoPosition(userId, lessonId, positionSeconds);

  // Touch enrollment last accessed (best effort)
  if (courseSlug) {
    try {
      const tenant = await getTenantBySlug(tenantSlug);
      if (tenant) {
        const course = await prisma.course.findUnique({ where: { tenantId_slug: { tenantId: tenant.id, slug: courseSlug } } });
        if (course) {
          await prisma.enrollment.updateMany({
            where: { userId, courseId: course.id },
            data: { lastAccessedAt: new Date() },
          });
        }
      }
    } catch {
      // non-fatal
    }
  }
}

// Upsert personal lesson note (retention gold)
export async function saveLessonNoteAction(formData: FormData) {
  const lessonId = formData.get("lessonId")?.toString();
  const content = formData.get("content")?.toString() || "";
  const tenantSlug = formData.get("tenantSlug")?.toString() || "platform";
  const courseSlug = formData.get("courseSlug")?.toString();

  if (!lessonId) throw new Error("Missing lesson");

  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  await upsertLessonNote(userId, lessonId, content);

  // Award note-taker achievement on first note
  if (content.trim().length > 8) {
    await awardAchievement(userId, "note-taker");
  }

  const base = tenantSlug === "platform" ? "" : `/t/${tenantSlug}`;
  revalidatePath(`${base}/courses/${courseSlug}`);
}

// Create bookmark at timestamp
export async function addLessonBookmarkAction(formData: FormData) {
  const lessonId = formData.get("lessonId")?.toString();
  const position = parseInt(formData.get("positionSeconds")?.toString() || "0", 10);
  const label = formData.get("label")?.toString() || undefined;
  const tenantSlug = formData.get("tenantSlug")?.toString() || "platform";
  const courseSlug = formData.get("courseSlug")?.toString();

  if (!lessonId) throw new Error("Missing lesson");

  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  await createLessonBookmark(userId, lessonId, position, label);

  // Optional light gamification
  const count = await prisma.lessonBookmark.count({ where: { userId, lessonId } });
  if (count >= 3) {
    await awardAchievement(userId, "bookmark-pro");
  }

  const base = tenantSlug === "platform" ? "" : `/t/${tenantSlug}`;
  revalidatePath(`${base}/courses/${courseSlug}`);
}

// Submit quiz attempt + award on pass
export async function submitQuizAttemptAction(formData: FormData) {
  const quizId = formData.get("quizId")?.toString();
  const lessonId = formData.get("lessonId")?.toString();
  const answersRaw = formData.get("answers")?.toString(); // JSON {qId: index}
  const tenantSlug = formData.get("tenantSlug")?.toString() || "platform";
  const courseSlug = formData.get("courseSlug")?.toString();

  if (!quizId || !lessonId || !answersRaw) throw new Error("Invalid quiz submission");

  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true, lesson: { select: { courseId: true } } },
  });
  if (!quiz) throw new Error("Quiz not found");

  const answers = JSON.parse(answersRaw) as Record<string, number>;
  let correct = 0;
  for (const q of quiz.questions) {
    if (answers[q.id] === q.correctIndex) correct++;
  }
  const score = Math.round((correct / Math.max(1, quiz.questions.length)) * 100);
  const passed = score >= quiz.passingScore;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      score,
      passed,
      answers,
      enrollmentId: (await prisma.enrollment.findUnique({
        where: { courseId_userId: { courseId: quiz.lesson.courseId, userId } },
        select: { id: true },
      }))?.id,
    },
  });

  // Auto-grade: create a Grade record for the quiz
  await prisma.grade.upsert({
    where: { lessonId_userId: { lessonId, userId } },
    create: {
      userId,
      lessonId,
      courseId: quiz.lesson.courseId,
      score,
      passed,
      gradedById: null, // auto-graded
      quizAttemptId: attempt.id,
    },
    update: {
      score,
      passed,
      quizAttemptId: attempt.id,
      gradedAt: new Date(),
    },
  });

  if (passed) {
    await awardAchievement(userId, "quiz-master");
    const { markLessonComplete } = await import("@/lib/progress");
    await markLessonComplete(userId, lessonId, quiz.lesson.courseId);
  }

  const base = tenantSlug === "platform" ? "" : `/t/${tenantSlug}`;
  revalidatePath(`${base}/courses/${courseSlug}`);

  return { score, passed };
}

// Add course / lesson comment (community)
export async function addCourseCommentAction(formData: FormData) {
  const courseId = formData.get("courseId")?.toString();
  const lessonId = formData.get("lessonId")?.toString() || null;
  const content = (formData.get("content")?.toString() || "").trim();
  const tenantSlug = formData.get("tenantSlug")?.toString() || "platform";
  const courseSlug = formData.get("courseSlug")?.toString();

  if (!courseId || !content) throw new Error("Comment required");

  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  await prisma.courseComment.create({
    data: { courseId, lessonId, userId, content },
  });

  await awardAchievement(userId, "reviewer"); // reuse reviewer badge for first comment too

  const base = tenantSlug === "platform" ? "" : `/t/${tenantSlug}`;
  revalidatePath(`${base}/courses/${courseSlug}`);
}

// Lightweight getters for the lesson viewer (notes, bookmarks)
export async function getLessonNoteAction(lessonId: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);
  return getLessonNote(userId, lessonId);
}

export async function getLessonBookmarksAction(lessonId: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);
  return getLessonBookmarks(userId, lessonId);
}

export async function getLessonProgressAction(lessonId: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);
  return getLessonProgress(userId, lessonId);
}

export async function sendStreakReminderAction(formData?: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  const streak = await getUserStreak(userId);

  if (user?.email && streak.current > 0) {
    await sendStreakReminderEmail({
      to: user.email,
      name: user.name || "",
      currentStreak: streak.current,
    });
  }
}

export async function getCourseCommentsAction(courseId: string, lessonId?: string | null) {
  const sessionUser = await requireSessionUser();
  // We don't filter by user for public discussion, but could add later
  return prisma.courseComment.findMany({
    where: { 
      courseId, 
      lessonId: lessonId || null,
      parentId: null, // top level for now
    },
    include: {
      user: { select: { name: true, image: true } },
      replies: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}
