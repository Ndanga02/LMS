export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { CourseCard } from "@/components/course-card";
import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { ensureAppBootstrap } from "@/lib/bootstrap";
import { getPublishedCourses } from "@/lib/courses";
import { isDbError } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getSessionUser, resolveDbUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getTenantBySlug } from "@/lib/tenant";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function TenantCoursesPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  try {
    await ensureAppBootstrap();
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant || tenant.status !== "ACTIVE") notFound();

    const sessionUser = await getSessionUser();
    const userId = sessionUser ? await resolveDbUserId(sessionUser) : null;
    const courses = await getPublishedCourses(tenant.id);

    let enrolledCourseIds = new Set<string>();
    if (userId) {
      const enrolls = await prisma.enrollment.findMany({
        where: { userId, tenantId: tenant.id, status: "ACTIVE" },
        select: { courseId: true },
      });
      enrolledCourseIds = new Set(enrolls.map((e) => e.courseId));
    }

    return (
      <AppShell title={tenant.name} tenant={{ name: tenant.name, slug: tenant.slug, logoUrl: tenant.logoUrl, logoDarkUrl: tenant.logoDarkUrl, primaryColor: tenant.primaryColor }}>
        <PageHeader
          title={tenant.name}
          description="Courses offered by this organization."
        />

        {courses.length === 0 ? (
          <p className="text-muted-foreground">No published courses yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                title={course.title}
                slug={course.slug}
                description={course.description}
                priceCents={course.priceCents}
                currency={course.currency}
                lessonCount={course._count.lessons}
                enrollmentCount={course._count.enrollments}
                rating={(course as any).rating}
                reviewCount={(course as any).reviewCount}
                href={`/t/${tenantSlug}/courses/${course.slug}`}
                enrolled={enrolledCourseIds.has(course.id)}
              />
            ))}
          </div>
        )}
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell>
          <DbUnavailable title="Tenant courses unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}