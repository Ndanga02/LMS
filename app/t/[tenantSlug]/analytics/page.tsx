export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Users, TrendingUp, BarChart3, Star, Brain, BookOpen, MessageSquare,
  Notebook, Flame, GraduationCap,
} from "lucide-react";
import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EnrollmentTrendChart } from "./trend-chart";
import { requireSessionUser } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { isDbError } from "@/lib/db";
import { getTenantBySlug } from "@/lib/tenant";
import { getInstructorAnalytics } from "@/lib/queries/analytics";

type Props = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function InstructorAnalyticsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const sessionUser = await requireSessionUser(`/login?callbackUrl=/t/${tenantSlug}/analytics`);

  try {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) notFound();

    const allowed = await hasTenantRole(tenant.id, sessionUser.id, ["TENANT_ADMIN", "INSTRUCTOR"]);
    if (!allowed) redirect(`/t/${tenantSlug}/courses`);

    const data = await getInstructorAnalytics(tenant.id);

    return (
      <AppShell title={`${tenant.name} Analytics`} tenant={{ name: tenant.name, slug: tenant.slug, logoUrl: tenant.logoUrl, logoDarkUrl: tenant.logoDarkUrl, primaryColor: tenant.primaryColor }}>
        <PageHeader
          title="Course Analytics"
          description="Monitor student progress, engagement, and course performance."
          action={
            <Button variant="outline" asChild>
              <Link href={`/t/${tenantSlug}/admin`}>← Admin</Link>
            </Button>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Users className="size-4 text-primary" /> Total students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{data.overview.totalStudents}</p>
              <p className="text-xs text-muted-foreground">{data.overview.activeStudents} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <GraduationCap className="size-4 text-primary" /> Completion rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{data.overview.completionRate}%</p>
              <p className="text-xs text-muted-foreground">{data.overview.completedEnrollments} of {data.overview.totalEnrollments} enrollments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="size-4 text-primary" /> Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{data.overview.courses}</p>
              <p className="text-xs text-muted-foreground">Published on this tenant</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Star className="size-4 text-yellow-500" /> Avg rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{data.overview.avgRating ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Across all courses</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" /> Enrollment Trend
            </CardTitle>
            <CardDescription>New enrollments per month over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <EnrollmentTrendChart data={data.enrollmentTrend} />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4 text-primary" /> Course Performance
              </CardTitle>
              <CardDescription>Enrollments, completion rates, and ratings per course</CardDescription>
            </CardHeader>
            <CardContent>
              {data.coursePerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.coursePerformance.map((c) => (
                    <div key={c.id} className="rounded-lg border px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/t/${tenantSlug}/courses/${c.slug}`} className="text-sm font-medium hover:underline">
                            {c.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">{c.instructor}</p>
                        </div>
                        <Badge variant={c.completionRate > 50 ? "default" : "secondary"} className="shrink-0">
                          {c.completionRate}%
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{c.enrollments} enrolled</span>
                        <span>{c.lessons} lessons</span>
                        <span className="flex items-center gap-0.5">
                          <Star className="size-3 text-yellow-500" /> {c.rating.toFixed(1)} ({c.reviewCount})
                        </span>
                      </div>
                      <Progress value={c.completionRate} className="mt-2 h-1" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="size-4 text-primary" /> Student Engagement
              </CardTitle>
              <CardDescription>Interaction metrics across courses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Notebook className="size-4 text-primary" /> Notes
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{data.engagement.notesCount}</p>
                    <p className="text-[10px] text-muted-foreground">{data.engagement.studentsWithNotes} students</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Brain className="size-4 text-primary" /> Quiz attempts
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{data.engagement.quizAttemptsCount}</p>
                    <p className="text-[10px] text-muted-foreground">{data.engagement.passedCount} passed ({data.engagement.studentsWithQuizzes} students)</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="size-4 text-primary" /> Comments
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{data.engagement.commentsCount}</p>
                    <p className="text-[10px] text-muted-foreground">{data.engagement.studentsWithComments} students</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" /> Recent Students
            </CardTitle>
            <CardDescription>Most recently active students across your courses</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active students yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recentStudents.map((e) => (
                  <div key={`${e.userId}-${e.courseId}`} className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {(e.user.name ?? e.user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{e.user.name ?? "Unnamed"}</p>
                        <p className="truncate text-xs text-muted-foreground">{e.course.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      {e.user.currentStreakDays > 0 && (
                        <span className="flex items-center gap-1 text-orange-500">
                          <Flame className="size-3" /> {e.user.currentStreakDays}
                        </span>
                      )}
                      <span>{e.user.totalPoints} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </AppShell>
    );
  } catch (error) {
    console.error("Instructor analytics error:", error);
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
