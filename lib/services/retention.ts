import { updateUserStreak } from "@/lib/streaks";
import { awardAchievement } from "@/lib/achievements";

export async function updateRetentionOnCompletion(
  userId: string,
  wasAlreadyComplete: boolean,
) {
  const streak = await updateUserStreak(userId);

  if (!wasAlreadyComplete) {
    await awardAchievement(userId, "first-lesson");
    if (streak.current >= 3) await awardAchievement(userId, "streak-3");
    if (streak.current >= 7) await awardAchievement(userId, "streak-7");
  }

  return streak;
}
