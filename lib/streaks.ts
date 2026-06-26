import { prisma } from "@/lib/db";

export async function updateUserStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveDate: true, currentStreakDays: true, longestStreakDays: true },
  });
  if (!user) return { current: 0, longest: 0 };

  const now = new Date();
  const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;

  let current = user.currentStreakDays || 0;

  if (!last) {
    current = 1;
  } else {
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 0) {
      // same day, do nothing
    } else if (diffDays === 1) {
      current = current + 1;
    } else {
      current = 1; // streak broken
    }
  }

  const longest = Math.max(user.longestStreakDays || 0, current);

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreakDays: current,
      longestStreakDays: longest,
      lastActiveDate: now,
    },
  });

  return { current, longest };
}

export async function getUserStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreakDays: true, longestStreakDays: true, lastActiveDate: true },
  });
  return {
    current: user?.currentStreakDays ?? 0,
    longest: user?.longestStreakDays ?? 0,
    lastActive: user?.lastActiveDate ?? null,
  };
}
