export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CourseBuilderShell } from "@/components/course-builder/course-builder-shell";
import { requireSessionUser } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant";
import { prisma, isDbError } from "@/lib/db";
import { DbUnavailable } from "@/components/db-unavailable";
import type { LessonType } from "@/lib/generated/prisma";

type Props = {
  params: Promise<{ tenantSlug: string; slug: string }>;
};

export default async function CourseEditPage({ params }: Props) {
  const { tenantSlug, slug } = await params;
  const sessionUser = await requireSessionUser(
    `/login?callbackUrl=/t/${tenantSlug}/admin/courses/${slug}/edit`,
  );

  try {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) notFound();

    const allowed = await hasTenantRole(tenant.id, sessionUser.id, [
      "TENANT_ADMIN",
      "INSTRUCTOR",
    ]);
    if (!allowed) redirect(`/t/${tenantSlug}/courses`);

    const course = await prisma.course.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      select: {
        id: true,
        title: true,
        slug: true,
        sections: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                slug: true,
                isPublished: true,
                type: true,
                durationMin: true,
                sectionId: true,
              },
            },
          },
        },
        lessons: {
          where: { sectionId: null },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            slug: true,
            isPublished: true,
            type: true,
            durationMin: true,
            sectionId: true,
          },
        },
      },
    });

    if (!course) notFound();

    return (
      <AppShell
        title={`Edit: ${course.title}`}
        tenant={{
          name: tenant.name,
          slug: tenant.slug,
          logoUrl: tenant.logoUrl,
          logoDarkUrl: tenant.logoDarkUrl,
          primaryColor: tenant.primaryColor,
        }}
      >
        <PageHeader
          title={`Edit: ${course.title}`}
          description="Drag and drop to reorder sections and lessons. Use bulk actions for multiple lessons."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href={`/t/${tenantSlug}/admin`}>
                <ArrowLeft className="size-4" /> Back to admin
              </Link>
            </Button>
          }
        />

        <CourseBuilderShell
          tenantSlug={tenantSlug}
          courseSlug={slug}
          courseTitle={course.title}
          sections={course.sections.map((s) => ({
            ...s,
            lessons: s.lessons.map((l) => ({ ...l, type: l.type as LessonType })),
          }))}
          ungroupedLessons={course.lessons.map((l) => ({
            ...l,
            type: l.type as LessonType,
          }))}
        />
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell>
          <DbUnavailable title="Course builder unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}
