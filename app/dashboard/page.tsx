export const dynamic = "force-dynamic";

import Link from "next/link";
import { GraduationCap, Sparkles, Flame, Trophy } from "lucide-react";
import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/page-hero";
import { SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardCharts } from "@/components/dashboard-charts";
import { ensureAppBootstrap } from "@/lib/bootstrap";
import { getUserEnrollments } from "@/lib/enrollments";
import { getCourseProgress } from "@/lib/progress";
import { getUserStreak } from "@/lib/streaks";
import { getUserAchievements } from "@/lib/achievements";
import { sendStreakReminderAction } from "@/app/actions/retention";
import { isDbError, prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { getMarketplaceCourses } from "@/lib/courses";
import { getUpcomingEvents } from "@/lib/calendar";
import { UpcomingEvents } from "@/components/upcoming-events";

// Simple colored graph data using orange primary theme
function computeProgressBuckets(enrollments: { progressPercent: number }[]) {
  const buckets = { '0-25%': 0, '26-50%': 0, '51-75%': 0, '76-100%': 0 };
  enrollments.forEach((e) => {
    const p = e.progressPercent ?? 0;
    if (p <= 25) buckets['0-25%']++;
    else if (p <= 50) buckets['26-50%']++;
    else if (p <= 75) buckets['51-75%']++;
    else buckets['76-100%']++;
  });
  return buckets;
}

function computeTenantActivity(memberships: { tenant: { slug: string; name: string } }[], enrollments: { course: { tenant: { slug: string } } }[]) {
  return memberships.map((m) => {
    const count = enrollments.filter(
      (e) => e.course.tenant.slug === m.tenant.slug
    ).length;
    return {
      name: m.tenant.name,
      enrollments: count,
      slug: m.tenant.slug,
    };
  });
}

export default async function DashboardPage() {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/dashboard");
  const firstName = sessionUser.name?.split(" ")[0];

  try {
    await ensureAppBootstrap();
    const userId = await resolveDbUserId(sessionUser);

    const [enrollments, memberships, streak, achievements, upcomingEvents] = await Promise.all([
      getUserEnrollments(userId),
      prisma.tenantMembership.findMany({
        where: { userId },
        include: { tenant: true },
        orderBy: { createdAt: "desc" },
      }),
      getUserStreak(userId),
      getUserAchievements(userId),
      getUpcomingEvents({ userId, limit: 5, daysAhead: 30 }),
    ]);

    // Compute recommendations *after* enrollments is available (avoids TDZ / "before initialization" error)
    // Personalized by overlapping tags from user's current enrollments (stronger retention hook)
    const userTags = new Set<string>();
    enrollments.forEach((e) => (e.course.tags || []).forEach((t: string) => userTags.add(t.toLowerCase())));

    const allMarketplace = await getMarketplaceCourses();
    const recCourses = allMarketplace
      .filter((course) => !enrollments.some((e) => e.course.id === course.id))
      .sort((a, b) => {
        const aScore = (a.tags || []).filter((t: string) => userTags.has(t.toLowerCase())).length;
        const bScore = (b.tags || []).filter((t: string) => userTags.has(t.toLowerCase())).length;
        return bScore - aScore; // prefer tag overlap
      })
      .slice(0, 3);

    const totalLessons = enrollments.reduce(
      (sum, e) => sum + e.course._count.lessons,
      0,
    );

    const progressBuckets = computeProgressBuckets(enrollments);
    const tenantActivity = computeTenantActivity(memberships, enrollments);

    return (
      <AppShell title="Dashboard">
        <div className="flex flex-1 flex-col gap-4 @container/main md:gap-6">
          <PageHero
            eyebrow="Your learning hub"
            title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
            description="Track progress, manage enrollments, and jump back into courses."
            action={
              <Button asChild size="lg">
                <Link href="/courses">
                  <Sparkles className="size-4" />
                  Browse courses
                </Link>
              </Button>
            }
          />

          <SectionCards
            stats={[
              {
                label: "Active courses",
                value: enrollments.length,
                description: "Courses you are enrolled in",
                trend: enrollments.length > 0 ? "Learning" : undefined,
              },
              {
                label: "Lessons available",
                value: totalLessons,
                description: "Across all enrollments",
              },
              {
                label: "Organizations",
                value: memberships.length,
                description: "Tenant memberships",
              },
              {
                label: "Role",
                value: sessionUser.platformRole ?? "USER",
                description: "Platform access level",
              },
            ]}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-primary/5 shadow-sm shadow-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif">
                  <GraduationCap className="size-5 text-primary" />
                  My courses
                </CardTitle>
                <CardDescription>Continue where you left off</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {enrollments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-primary/20 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                    No enrollments yet.{" "}
                    <Link href="/courses" className="font-medium text-primary underline">
                      Browse the catalog
                    </Link>
                  </div>
                ) : (
                  enrollments.map((enrollment) => {
                    const href =
                      enrollment.course.tenant.slug === "platform"
                        ? `/courses/${enrollment.course.slug}`
                        : `/t/${enrollment.course.tenant.slug}/courses/${enrollment.course.slug}`;

                    return (
                      <div
                        key={enrollment.id}
                        className="rounded-xl border border-primary/10 p-4 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{enrollment.course.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {enrollment.course.tenant.name}
                            </p>
                          </div>
                          <Badge variant="secondary">{enrollment.source}</Badge>
                        </div>
                        {(() => {
                          // Real progress will be computed client-side or we can pass precomputed
                          // For now show enrollment.progressPercent (updated on complete)
                          const pct = enrollment.progressPercent ?? 0;
                          return (
                            <>
                              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span className="font-medium text-foreground">{pct}%</span>
                              </div>
                              <Progress value={pct} className="mt-1.5 h-2" />
                            </>
                          );
                        })()}
                        <Button size="sm" className="mt-3" asChild>
                          <Link href={href}>Continue</Link>
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/5 shadow-sm shadow-primary/5">
              <CardHeader>
                <CardTitle className="font-serif">Organizations</CardTitle>
                <CardDescription>Tenants you belong to</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {memberships.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No memberships yet.
                  </p>
                ) : (
                  memberships.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-primary/10 p-3"
                    >
                      <div>
                        <p className="font-medium">{m.tenant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          /{m.tenant.slug}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{m.role}</Badge>
                        {(m.role === "TENANT_ADMIN" ||
                          sessionUser.platformRole === "SUPER_ADMIN") && (
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/t/${m.tenant.slug}/admin`}>Admin</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events Calendar Section */}
          <UpcomingEvents events={upcomingEvents} />

          {/* RETENTION DELIGHT: Streak + Achievements */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary/10 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-serif">
                  <Flame className="size-5 text-primary streak-flame" /> Current Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-semibold tabular-nums tracking-tighter">{streak.current}</span>
                  <span className="text-xl text-muted-foreground">days</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Longest: {streak.longest} days • Come back tomorrow to keep it alive.</div>
                {streak.current >= 3 && (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">On fire — keep the momentum!</div>
                )}
                <form action={sendStreakReminderAction} className="mt-3">
                  <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">Send me a streak reminder email</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-serif">
                  <Trophy className="size-5 text-primary" /> Achievements
                </CardTitle>
                <CardDescription>{achievements.length} earned</CardDescription>
              </CardHeader>
              <CardContent>
                {achievements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Complete lessons and quizzes to start earning badges and points.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {achievements.slice(0, 6).map((ua) => (
                      <div key={ua.id} className="achievement-badge earned" title={ua.achievement.description || ""}>
                        <span>{ua.achievement.icon || "🏆"}</span>
                        <span>{ua.achievement.title}</span>
                      </div>
                    ))}
                    {achievements.length > 6 && <Badge variant="outline">+{achievements.length - 6} more</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personalized recommendations for retention */}
            {recCourses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Recommended for you</CardTitle>
                  <CardDescription>Based on the catalog — keep your streak going</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {recCourses.map((c: any) => (
                      <Link key={c.id} href={c.tenant.slug === "platform" ? `/courses/${c.slug}` : `/t/${c.tenant.slug}/courses/${c.slug}`} className="block rounded-xl border p-3 hover:bg-muted/30 text-sm">
                        <div className="font-medium line-clamp-1">{c.title}</div>
                        <div className="text-xs text-muted-foreground">{c.tenant.name} • {c._count?.lessons || 0} lessons</div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Analytics Charts - orange primary theme with Recharts */}
          <DashboardCharts
            progressBuckets={progressBuckets}
            tenantActivity={tenantActivity}
            enrollments={enrollments}
          />

          {/* Simple personalized recommendations (retention) */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> Keep learning
              </CardTitle>
              <CardDescription>Recommended based on your activity across tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Browse the full <Link href="/courses" className="text-primary underline">marketplace catalog</Link> or your tenant course lists. New lessons and quizzes are added regularly to help you maintain your streak.
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell title="Dashboard">
          <div className="flex flex-1 flex-col gap-6">
            <PageHero
              eyebrow="Your learning hub"
              title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
              description="You are signed in. Connect the database to load enrollments and stats."
            />
            <DbUnavailable title="Dashboard data unavailable" />
          </div>
        </AppShell>
      );
    }
    throw error;
  }
}