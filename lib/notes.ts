import { prisma } from "@/lib/db";

export async function getLessonNote(userId: string, lessonId: string) {
  return prisma.lessonNote.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
}

export async function upsertLessonNote(userId: string, lessonId: string, content: string) {
  return prisma.lessonNote.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, content },
    update: { content, updatedAt: new Date() },
  });
}

export async function getLessonBookmarks(userId: string, lessonId: string) {
  return prisma.lessonBookmark.findMany({
    where: { userId, lessonId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createLessonBookmark(
  userId: string,
  lessonId: string,
  positionSeconds: number | null,
  label?: string,
  note?: string
) {
  return prisma.lessonBookmark.create({
    data: { userId, lessonId, positionSeconds, label, note },
  });
}
