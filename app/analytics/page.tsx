export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, BookOpen, Flame, Brain, Clock, Award, Target, TrendingUp, Bookmark, MessageSquare, Notebook } from "lucide-react";
import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StudentWeeklyChart } from "./weekly-chart";
import { StudentQuizCard } from "./quiz-card";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { isDbError } from "@/lib/db";
import { getStudentAnalytics } from "@/lib/queries/analytics";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default async function StudentAnalyticsPage() {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/analytics");
  const userId = await resolveDbUserId(sessionUser);

  try {
    const data = await getStudentAnalytics(userId);

    return (
      <AppShell title="Analytics">
        <PageHeader
          title="Your Analytics"
          description="Track your learning journey — progress, streaks, quiz performance, and more."
          action={
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Back to Dashboard</Link>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="size-4 text-primary" /> In progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{data.overview.inProgress}</p>
              <p className="text-xs text-muted-foreground">{data.overview.completed} completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Target className="size-4 text-primary" /> Lessons done
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{data.overview.lessonsDone}</p>
              <p className="text-xs text-muted-foreground">Across all courses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Flame className="size-4 text-orange-500" /> Day streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{data.overview.streak.current}</p>
              <p className="text-xs text-muted-foreground">Longest: {data.overview.streak.longest} days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Award className="size-4 text-primary" /> Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{data.overview.streak.totalPoints}</p>
              <p className="text-xs text-muted-foreground">{data.overview.achievementCount} achievements</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" /> Weekly Activity
            </CardTitle>
            <CardDescription>Lessons completed per week over the last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentWeeklyChart data={data.weeklyActivity} />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="size-4 text-primary" /> Quiz Performance
              </CardTitle>
              <CardDescription>Your quiz history and average scores</CardDescription>
            </CardHeader>
            <CardContent>
              <StudentQuizCard
                total={data.quizPerformance.total}
                passed={data.quizPerformance.passed}
                avgScore={data.quizPerformance.avgScore}
                recentAttempts={data.quizPerformance.attempts.slice(0, 5)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4 text-primary" /> Learning Stats
              </CardTitle>
              <CardDescription>Your engagement across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-4 text-center">
                  <Notebook className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{data.learningStats.notes}</p>
                  <p className="text-xs text-muted-foreground">Notes</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <Bookmark className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{data.learningStats.bookmarks}</p>
                  <p className="text-xs text-muted-foreground">Bookmarks</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <MessageSquare className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{data.learningStats.comments}</p>
                  <p className="text-xs text-muted-foreground">Comments</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <Clock className="mx-auto size-5 text-primary" />
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{formatDuration(data.overview.watchTimeSeconds)}</p>
                  <p className="text-xs text-muted-foreground">Watch time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-primary" /> Course Breakdown
            </CardTitle>
            <CardDescription>Your progress per course</CardDescription>
          </CardHeader>
          <CardContent>
            {data.courseBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Enroll in a course to see your breakdown.</p>
            ) : (
              <div className="space-y-3">
                {data.courseBreakdown.map((c) => {
                  const href = c.tenantSlug === "platform" ? `/courses/${c.slug}` : `/t/${c.tenantSlug}/courses/${c.slug}`;
                  return (
                    <div key={c.id} className="rounded-lg border px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={href} className="text-sm font-medium hover:underline">{c.title}</Link>
                          <p className="text-xs text-muted-foreground">{c.tenantName}</p>
                        </div>
                        <Badge variant={c.status === "COMPLETED" ? "default" : "secondary"}>
                          {c.status === "COMPLETED" ? "Completed" : `${c.progressPercent}%`}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{c.lessonsDone} / {c.lessonsTotal} lessons</span>
                        {c.hasCertificate && <Badge variant="outline" className="text-[10px]">Certified</Badge>}
                      </div>
                      <Progress value={c.progressPercent} className="mt-2 h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </AppShell>
    );
  } catch (error) {
    console.error("Analytics page error:", error);
    if (isDbError(error)) {
      return (
        <AppShell title="Analytics">
          <DbUnavailable title="Analytics unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}
