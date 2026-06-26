import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { getUserAchievements, getAllAchievements } from "@/lib/achievements";
import { isDbError } from "@/lib/db";
import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function AchievementsPage() {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/achievements");
  const userId = await resolveDbUserId(sessionUser);

  try {
    const [earned, all] = await Promise.all([
      getUserAchievements(userId),
      getAllAchievements(),
    ]);

  const earnedMap = new Map(earned.map(e => [e.achievementId, e]));

  return (
    <AppShell title="Achievements">
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Achievements</h1>
          <p className="text-muted-foreground">Collect them all by learning consistently.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((ach) => {
            const userAch = earnedMap.get(ach.id);
            const isEarned = !!userAch;

            return (
              <Card key={ach.id} className={isEarned ? "border-primary/40 bg-primary/5" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">{ach.icon || "🏆"}</div>
                    {isEarned && <Badge variant="default">Earned</Badge>}
                  </div>
                  <CardTitle className="text-xl">{ach.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{ach.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary font-medium">+{ach.points} points</span>
                    {isEarned && userAch && (
                      <span className="text-muted-foreground">
                        {new Date(userAch.earnedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Keep completing lessons, passing quizzes, and taking notes to unlock more!
          <div className="mt-2">
            <Link href="/dashboard" className="text-primary hover:underline">Back to Dashboard →</Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell title="Achievements">
          <div className="space-y-8">
            <h1 className="font-serif text-3xl tracking-tight">Achievements</h1>
            <DbUnavailable title="Achievements unavailable" />
          </div>
        </AppShell>
      );
    }
    throw error;
  }
}
