export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Key, BarChart3 } from "lucide-react";
import { createIntegrationKeyAction } from "@/app/actions/integration";
import { AdminLessonRow } from "@/components/admin-lesson-row";
import { CreateCourseForm } from "@/components/create-course-form";
import { AddLessonForm } from "@/components/add-lesson-form";
import { UpdateCourseForm } from "@/components/update-course-form";
import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ensureAppBootstrap } from "@/lib/bootstrap";
import { isDbError, prisma } from "@/lib/db";
import { hasTenantRole } from "@/lib/permissions";
import { requireSessionUser } from "@/lib/session";
import { getTenantBySlug } from "@/lib/tenant";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ newApiKey?: string }>;
};

export default async function TenantAdminPage({
  params,
  searchParams,
}: PageProps) {
  const { tenantSlug } = await params;
  const { newApiKey } = await searchParams;
  const sessionUser = await requireSessionUser(
    `/login?callbackUrl=/t/${tenantSlug}/admin`,
  );

  try {
    await ensureAppBootstrap();
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) notFound();

    const allowed = await hasTenantRole(tenant.id, sessionUser.id, [
      "TENANT_ADMIN",
    ]);
    if (!allowed) redirect(`/t/${tenantSlug}/courses`);

    // Redirect to onboarding if not complete
    if (!tenant.onboardingComplete) {
      redirect(`/t/${tenantSlug}/onboarding`);
    }

    const [coursesCount, enrollmentsCount, memberships, integration, coursesList, reviewStats] = await Promise.all([
      prisma.course.count({ where: { tenantId: tenant.id } }),
      prisma.enrollment.count({
        where: { tenantId: tenant.id, status: "ACTIVE" },
      }),
      prisma.tenantMembership.count({ where: { tenantId: tenant.id } }),
      prisma.tenantIntegration.findUnique({ where: { tenantId: tenant.id } }),
      prisma.course.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, slug: true, isPublished: true, durationMin: true } },
            },
          },
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, slug: true, isPublished: true, durationMin: true, sectionId: true, type: true },
            take: 20, // reasonable cap for admin list
          },
          _count: { select: { lessons: true, enrollments: true, sections: true } },
        },
      }),
      // For rating in the list
      prisma.courseReview.groupBy({
        by: ["courseId"],
        where: { course: { tenantId: tenant.id } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const ratingMap = new Map(
      reviewStats.map((stat) => [
        stat.courseId,
        {
          avg: stat._avg.rating ? Number(stat._avg.rating.toFixed(1)) : 0,
          count: stat._count.rating,
        },
      ])
    );

    const coursesWithRating = coursesList.map((c) => ({
      ...c,
      rating: ratingMap.get(c.id)?.avg ?? 0,
      reviewCount: ratingMap.get(c.id)?.count ?? 0,
    }));

    // Retention analytics (simple, fast queries)
    const activeEnrolls = await prisma.enrollment.findMany({
      where: { tenantId: tenant.id, status: "ACTIVE" },
      select: { progressPercent: true, lastAccessedAt: true, userId: true },
    });
    const avgProgress = activeEnrolls.length > 0
      ? Math.round(activeEnrolls.reduce((sum, e) => sum + (e.progressPercent || 0), 0) / activeEnrolls.length)
      : 0;
    const recentActive = new Set(
      activeEnrolls
        .filter(e => e.lastAccessedAt && (Date.now() - new Date(e.lastAccessedAt).getTime()) < 1000 * 60 * 60 * 24 * 7)
        .map(e => e.userId)
    ).size;

    return (
      <AppShell title={`${tenant.name} Admin`} tenant={{ name: tenant.name, slug: tenant.slug, logoUrl: tenant.logoUrl, logoDarkUrl: tenant.logoDarkUrl, primaryColor: tenant.primaryColor }}>
        <PageHeader
          title={tenant.name}
          description="Manage courses, members, and API integrations."
            action={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/t/${tenantSlug}/analytics`}>
                  <BarChart3 className="mr-2 size-4" />
                  Analytics
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/t/${tenantSlug}/courses`}>View courses</Link>
              </Button>
            </div>
          }
        />

        <SectionCards
          stats={[
            { label: "Courses", value: coursesCount, description: "Total courses" },
            {
              label: "Enrollments",
              value: enrollmentsCount,
              description: "Active enrollments",
            },
            { label: "Members", value: memberships, description: "Tenant members" },
          ]}
        />

        {/* Quick retention snapshot for tenant admins */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Avg Progress</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{avgProgress}%</div>
            <div className="text-[10px] text-muted-foreground">Across active enrollments</div>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Retention signals</div>
            <div className="mt-1 text-sm">Streaks, notes, quiz attempts &amp; bookmarks tracked automatically. {recentActive} recent active learners.</div>
          </div>
          <div className="rounded-2xl border bg-card p-4 text-xs text-muted-foreground">
            Use the API key for auto-enrollment from your site. Students get the full delightful experience with your branding.
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <Badge variant="outline">{tenant.slug}</Badge>
          <Badge variant="outline">{tenant.status}</Badge>
          <Badge variant="outline">{tenant.enrollmentMode}</Badge>
        </div>

        {/* Course Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Courses</CardTitle>
            <CardDescription>
              Create and manage courses for this tenant. Instructors and admins can publish content here.
              <span className="ml-2 text-[10px] text-muted-foreground">(Use the form above to create; add lessons below or on the course page. Supports VIDEO / TEXT / QUIZ etc.)</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Create form */}
            <CreateCourseForm tenantSlug={tenantSlug} />

            {/* Quick Edit Course */}
            {coursesList.length > 0 && (
              <UpdateCourseForm
                tenantSlug={tenantSlug}
                courses={coursesList.map((c: any) => ({
                  id: c.id,
                  title: c.title,
                  slug: c.slug,
                  priceCents: c.priceCents,
                  level: c.level,
                  status: c.status,
                  description: c.description,
                }))}
              />
            )}

            {/* Recent courses list */}
            <div>
              <h3 className="mb-3 font-medium">Recent Courses</h3>
              {coursesList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No courses yet. Create one above.</p>
              ) : (
                <div className="space-y-2">
                    {coursesWithRating.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <Link href={`/t/${tenantSlug}/courses/${c.slug}`} className="font-medium hover:underline">{c.title}</Link>
                        <span className="ml-2 text-xs text-muted-foreground">/{c.slug}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.status === "PUBLISHED" ? "default" : "secondary"}>{c.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {c._count.lessons} lessons • {c._count.sections} sections • {c._count.enrollments} enrolled
                          {c.rating > 0 && ` • ★ ${c.rating} (${c.reviewCount})`}
                        </span>
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/t/${tenantSlug}/courses/${c.slug}`}>View</Link>
                        </Button>
                        <Button size="sm" variant="secondary" asChild>
                          <Link href={`/t/${tenantSlug}/admin/courses/${c.slug}/edit`}>Edit</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Curriculum Management (edit / delete lessons) */}
            {coursesList.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="mb-3 font-medium">Curriculum Management</h3>
                <p className="mb-3 text-xs text-muted-foreground">Quick edit or remove lessons. For richer editing use the course page or add more lessons above.</p>
                <div className="space-y-6">
                  {coursesList.map((course: any) => {
                    const lessonMap = new Map<string, any>();
                    (course.lessons || []).forEach((l: any) => lessonMap.set(l.id, l));
                    (course.sections || []).forEach((s: any) => (s.lessons || []).forEach((l: any) => lessonMap.set(l.id, l)));
                    const allLessons = [...lessonMap.values()].slice(0, 12);
                    if (allLessons.length === 0) return null;
                    return (
                      <div key={course.id} className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <Link href={`/t/${tenantSlug}/courses/${course.slug}`} className="font-medium hover:underline">{course.title}</Link>
                          <span className="text-xs text-muted-foreground">{allLessons.length} lessons shown</span>
                        </div>
                        <div className="space-y-2">
                          {allLessons.map((lesson: any) => (
                            <AdminLessonRow
                              key={lesson.id}
                              tenantSlug={tenantSlug}
                              lesson={{
                                id: lesson.id,
                                title: lesson.title,
                                slug: lesson.slug,
                                isPublished: lesson.isPublished,
                                type: lesson.type,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Add Lesson */}
            {coursesList.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="mb-3 font-medium">Add Lesson to a Course</h3>
                <AddLessonForm
                  tenantSlug={tenantSlug}
                  courses={coursesList.map((c: any) => ({ id: c.id, title: c.title, slug: c.slug }))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage who has access to this tenant and their roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {memberships} member{memberships !== 1 ? "s" : ""} currently.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/t/${tenantSlug}/admin/members`}>Manage Members</Link>
            </Button>
          </CardContent>
        </Card>

        <section className="surface-glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Key className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Integration API</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            External websites can auto-enroll students via{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              POST /api/v1/integrations/enroll
            </code>
          </p>

          {integration ? (
            <p className="mb-4 text-sm">
              API key configured · auto-enroll{" "}
              <Badge variant="secondary" className="ml-1">
                {integration.autoEnrollEnabled ? "on" : "off"}
              </Badge>
            </p>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              No API key yet.
            </p>
          )}

          {newApiKey && (
            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-medium">New API key — copy now:</p>
              <code className="mt-2 block break-all text-xs">{newApiKey}</code>
            </div>
          )}

          <form action={createIntegrationKeyAction.bind(null, tenantSlug)}>
            <Button type="submit" variant="outline">
              {integration ? "Rotate API key" : "Generate API key"}
            </Button>
          </form>
        </section>
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell>
          <DbUnavailable title="Tenant admin unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}