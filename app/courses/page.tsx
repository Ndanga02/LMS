export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, Compass } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { CourseSearch } from "@/components/course-search";
import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/page-hero";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ensureAppBootstrap } from "@/lib/bootstrap";
import { searchCourses, getCourseCategories } from "@/lib/courses";
import { isDbError, prisma } from "@/lib/db";
import { getSessionUser, resolveDbUserId } from "@/lib/session";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    level?: string;
    price?: "free" | "paid";
    page?: string;
  }>;
};

export default async function CoursesPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const sessionUser = await getSessionUser();
  const userId = sessionUser ? await resolveDbUserId(sessionUser) : null;

  try {
    await ensureAppBootstrap();
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = 12;
    const [result, categories] = await Promise.all([
      searchCourses({
        query: filters.q,
        category: filters.category,
        level: filters.level as CourseLevel | undefined,
        price: filters.price,
        page,
        pageSize,
      }),
      getCourseCategories(),
    ]);

    const { courses, total, totalPages } = result;

    let enrolledCourseIds = new Set<string>();
    if (userId) {
      const enrolls = await prisma.enrollment.findMany({
        where: { userId, status: "ACTIVE" },
        select: { courseId: true },
      });
      enrolledCourseIds = new Set(enrolls.map((e) => e.courseId));
    }

    const hasActiveFilters = filters.q || filters.category || filters.level || filters.price;

    return (
      <AppShell title="Courses">
        <div className="flex flex-1 flex-col gap-6">
          <PageHero
            eyebrow="Marketplace"
            title="Course marketplace"
            description="Discover published courses from the platform and partner organizations."
            action={
              <Button variant="outline" size="lg" asChild>
                <Link href={sessionUser ? "/dashboard" : "/login"}>
                  <Compass className="size-4" />
                  {sessionUser ? "My learning" : "Sign in"}
                </Link>
              </Button>
            }
          />

          <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted/50" />}>
            <CourseSearch categories={categories} />
          </Suspense>

          {courses.length === 0 ? (
            <Card className="border-primary/10 shadow-sm shadow-primary/5">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BookOpen className="size-7" />
                </div>
                <CardTitle className="font-serif text-xl">
                  {hasActiveFilters ? "No matching courses" : "No courses yet"}
                </CardTitle>
                <CardDescription>
                  {hasActiveFilters
                    ? "Try adjusting your search or filters."
                    : "Run the seed script to create the platform tenant and a sample course."}
                </CardDescription>
              </CardHeader>
              {!hasActiveFilters && (
                <CardContent className="text-center">
                  <code className="rounded-xl border border-primary/10 bg-muted/50 px-4 py-2 font-mono text-sm">
                    pnpm db:seed
                  </code>
                </CardContent>
              )}
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                {hasActiveFilters && (
                  <p className="text-sm text-muted-foreground">
                    {total} result{total !== 1 ? "s" : ""}
                  </p>
                )}
                {!hasActiveFilters && (
                  <p className="text-sm text-muted-foreground">
                    {total} course{total !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    tenantName={
                      course.tenant.isPlatform ? undefined : course.tenant.name
                    }
                    rating={(course as any).rating}
                    reviewCount={(course as any).reviewCount}
                    enrolled={enrolledCourseIds.has(course.id)}
                    href={course.tenant.isPlatform ? `/courses/${course.slug}` : `/t/${course.tenant.slug}/courses/${course.slug}`}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    asChild={page > 1}
                  >
                    {page > 1 ? (
                      <Link href={`/courses?${new URLSearchParams({ ...filters, page: String(page - 1) } as Record<string, string>)}`}>
                        Previous
                      </Link>
                    ) : (
                      <span>Previous</span>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    asChild={page < totalPages}
                  >
                    {page < totalPages ? (
                      <Link href={`/courses?${new URLSearchParams({ ...filters, page: String(page + 1) } as Record<string, string>)}`}>
                        Next
                      </Link>
                    ) : (
                      <span>Next</span>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell title="Courses">
          <div className="flex flex-1 flex-col gap-6">
            <PageHero
              eyebrow="Marketplace"
              title="Course marketplace"
              description="Browse the catalog once your database is connected."
            />
            <DbUnavailable title="Course catalog unavailable" />
          </div>
        </AppShell>
      );
    }
    throw error;
  }
}
