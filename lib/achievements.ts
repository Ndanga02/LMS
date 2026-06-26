import { prisma } from "@/lib/db";

export type AchievementCode =
  | "first-lesson"
  | "streak-3"
  | "streak-7"
  | "quiz-master"
  | "course-complete"
  | "note-taker"
  | "bookmark-pro"
  | "reviewer";

export async function awardAchievement(userId: string, code: AchievementCode, tenantId?: string | null) {
  const achievement = await prisma.achievement.findUnique({ where: { code } });
  if (!achievement) return null;

  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });
  if (existing) return existing;

  const earned = await prisma.userAchievement.create({
    data: {
      userId,
      achievementId: achievement.id,
      tenantId: tenantId ?? null,
    },
    include: { achievement: true },
  });

  // Award points
  await prisma.user.update({
    where: { id: userId },
    data: { totalPoints: { increment: achievement.points } },
  });

  return earned;
}

export async function getUserAchievements(userId: string) {
  return prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { earnedAt: "desc" },
  });
}

export async function getAllAchievements() {
  return prisma.achievement.findMany({ orderBy: { points: "asc" } });
}
