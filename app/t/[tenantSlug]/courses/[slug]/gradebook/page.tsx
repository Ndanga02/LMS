export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GradebookView } from "@/components/gradebook-view";
import { DbUnavailable } from "@/components/db-unavailable";
import { ensureAppBootstrap } from "@/lib/bootstrap";
import { getTenantBySlug } from "@/lib/tenant";
import { getCourseGradebook } from "@/lib/gradebook";
import { isDbError, prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";

type PageProps = {
  params: Promise<{ tenantSlug: string; slug: string }>;
};

export default async function GradebookPage({ params }: PageProps) {
  const { tenantSlug, slug } = await params;

  try {
    await ensureAppBootstrap();
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant || tenant.status !== "ACTIVE") notFound();

    const sessionUser = await requireSessionUser();
    const userId = await resolveDbUserId(sessionUser);
    const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR"]);
    if (!allowed) notFound();

    const course = await prisma.course.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      select: { id: true, title: true },
    });
    if (!course) notFound();

    const gradebook = await getCourseGradebook(course.id);
    if (!gradebook) notFound();

    return (
      <AppShell>
        <div className="mx-auto max-w-6xl p-4 md:p-6">
          <div className="mb-6">
            <h1 className="font-serif text-2xl font-bold tracking-tight">Gradebook</h1>
            <p className="text-sm text-muted-foreground">{course.title}</p>
          </div>

          <GradebookView
            gradebook={{
              course: gradebook.course,
              gradableLessons: gradebook.gradableLessons.map((l) => ({
                ...l,
                dueDate: l.dueDate?.toISOString() ?? null,
              })),
              rows: gradebook.rows.map((row) => ({
                user: row.user,
                enrolledAt: row.enrolledAt.toISOString(),
                overallGrade: row.overallGrade,
                lessonGrades: row.lessonGrades.map((lg) => ({
                  lessonId: lg.lessonId,
                  lessonTitle: lg.lessonTitle,
                  lessonType: lg.lessonType,
                  dueDate: lg.dueDate?.toISOString() ?? null,
                  grade: lg.grade
                    ? {
                        score: lg.grade.score,
                        passed: lg.grade.passed,
                        feedback: lg.grade.feedback,
                        gradedAt: lg.grade.gradedAt.toISOString(),
                      }
                    : null,
                  submission: lg.submission
                    ? {
                        id: lg.submission.id,
                        status: lg.submission.status,
                        submittedAt: lg.submission.submittedAt?.toISOString() ?? null,
                      }
                    : null,
                })),
              })),
            }}
            tenantSlug={tenantSlug}
            courseSlug={slug}
          />
        </div>
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell>
          <DbUnavailable />
        </AppShell>
      );
    }
    throw error;
  }
}
