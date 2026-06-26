import { prisma } from "@/lib/db";
import { updateRetentionOnCompletion } from "@/lib/services/retention";
import { issueCertificate } from "@/lib/services/certificate";
import { awardAchievement } from "@/lib/achievements";

const lastVideoSave = new Map<string, number>();
const THROTTLE_MS = 15_000;

function getVideoSaveKey(userId: string, lessonId: string) {
  return `${userId}:${lessonId}`;
}

function shouldThrottleVideoSave(userId: string, lessonId: string): boolean {
  const key = getVideoSaveKey(userId, lessonId);
  const last = lastVideoSave.get(key);
  const now = Date.now();
  if (last && now - last < THROTTLE_MS) return true;
  lastVideoSave.set(key, now);
  if (lastVideoSave.size > 1000) {
    const cutoff = now - THROTTLE_MS * 2;
    for (const [k, t] of lastVideoSave) {
      if (t < cutoff) lastVideoSave.delete(k);
    }
  }
  return false;
}

export async function getLessonProgress(userId: string, lessonId: string) {
  return prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
}

export async function getCourseProgress(userId: string, courseId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    select: { id: true },
  });

  if (lessons.length === 0) return { completed: 0, total: 0, percent: 0 };

  const progress = await prisma.lessonProgress.findMany({
    where: {
      userId,
      lessonId: { in: lessons.map((l) => l.id) },
      completedAt: { not: null },
    },
    select: { lessonId: true },
  });

  const completed = progress.length;
  const total = lessons.length;
  const percent = Math.round((completed / total) * 100);

  return { completed, total, percent };
}

export async function getEnrollmentProgress(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });
  if (!enrollment) return 0;
  return enrollment.progressPercent ?? 0;
}

async function upsertLessonProgress(userId: string, lessonId: string, courseId: string) {
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { completedAt: true },
  });

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, completedAt: new Date(), lastAccessedAt: new Date() },
    update: { completedAt: new Date(), lastAccessedAt: new Date() },
  });

  return !!existing?.completedAt;
}

async function updateEnrollmentProgress(userId: string, courseId: string) {
  const { percent } = await getCourseProgress(userId, courseId);

  await prisma.enrollment.update({
    where: { courseId_userId: { courseId, userId } },
    data: { progressPercent: percent, lastAccessedAt: new Date() },
  });

  return percent;
}

export async function markLessonComplete(userId: string, lessonId: string, courseId: string) {
  const wasAlreadyComplete = await upsertLessonProgress(userId, lessonId, courseId);

  const percent = await updateEnrollmentProgress(userId, courseId);

  await updateRetentionOnCompletion(userId, wasAlreadyComplete);

  if (percent === 100) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });
    if (enrollment) {
      await awardAchievement(userId, "course-complete");
      await issueCertificate(enrollment.id, userId, courseId, lessonId);
    }
  }

  return percent;
}

export async function updateLastAccessed(userId: string, lessonId: string) {
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, lastAccessedAt: new Date() },
    update: { lastAccessedAt: new Date() },
  });
}

export async function saveVideoPosition(userId: string, lessonId: string, positionSeconds: number) {
  if (shouldThrottleVideoSave(userId, lessonId)) return;

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, lastPositionSeconds: positionSeconds, lastAccessedAt: new Date() },
    update: { lastPositionSeconds: positionSeconds, lastAccessedAt: new Date() },
  });
}
