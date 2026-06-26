export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { requireSessionUser } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant";
import { prisma, isDbError } from "@/lib/db";
import { DbUnavailable } from "@/components/db-unavailable";
import { QuizManager } from "@/components/quiz-manager";
import { ResourceManager } from "@/components/resource-manager";
import { Badge } from "@/components/ui/badge";

type Props = {
  params: Promise<{ tenantSlug: string; slug: string; lessonId: string }>;
};

export default async function LessonEditPage({ params }: Props) {
  const { tenantSlug, slug: courseSlug, lessonId } = await params;

  try {
    const sessionUser = await requireSessionUser(
      `/login?callbackUrl=/t/${tenantSlug}/admin/courses/${courseSlug}/lessons/${lessonId}/edit`,
    );

    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) notFound();

    const userId = sessionUser?.id;
    if (!userId) redirect("/login");

    const allowed = await hasTenantRole(tenant.id, userId, [
      "TENANT_ADMIN",
      "INSTRUCTOR",
    ]);
    if (!allowed) redirect(`/t/${tenantSlug}/courses`);

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        isPublished: true,
        content: true,
        videoUrl: true,
        durationMin: true,
        courseId: true,
        course: {
          select: { title: true, tenantId: true },
        },
        quiz: {
          select: {
            id: true,
            questions: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                question: true,
                options: true,
                correctIndex: true,
                order: true,
              },
            },
          },
        },
        resources: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            url: true,
            type: true,
            order: true,
          },
        },
      },
    });

    if (!lesson || lesson.course.tenantId !== tenant.id) notFound();

    const isQuizLesson = lesson.type === "QUIZ";

    return (
      <AppShell
        title={`Edit Lesson: ${lesson.title}`}
        tenant={{
          name: tenant.name,
          slug: tenant.slug,
          logoUrl: tenant.logoUrl,
          logoDarkUrl: tenant.logoDarkUrl,
          primaryColor: tenant.primaryColor,
        }}
      >
        <PageHeader
          title={lesson.title}
          description={`Editing lesson in "${lesson.course.title}"`}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href={`/t/${tenantSlug}/admin/courses/${courseSlug}/edit`}>
                <ArrowLeft className="size-4" /> Back to course builder
              </Link>
            </Button>
          }
        />

        <div className="mb-6 space-y-2">
          <div className="flex gap-2">
            <Badge variant={lesson.isPublished ? "default" : "secondary"}>
              {lesson.isPublished ? "Published" : "Draft"}
            </Badge>
            <Badge variant="outline">{lesson.type}</Badge>
            {lesson.durationMin && (
              <Badge variant="outline">{lesson.durationMin} min</Badge>
            )}
          </div>
        </div>

        {isQuizLesson && lesson.quiz ? (
          <div className="space-y-6">
            <QuizManager
              tenantSlug={tenantSlug}
              quizId={lesson.quiz.id}
              questions={lesson.quiz.questions.map((q) => ({
                id: q.id,
                question: q.question,
                options: q.options as string[],
                correctIndex: q.correctIndex,
                order: q.order,
              }))}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This lesson is of type <strong>{lesson.type}</strong>. Quiz management is available for QUIZ-type lessons.
          </p>
        )}

        <div className="mt-8 rounded-xl border p-4">
          <ResourceManager
            tenantSlug={tenantSlug}
            lessonId={lesson.id}
            initialResources={lesson.resources || []}
          />
        </div>
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell>
          <DbUnavailable title="Lesson editor unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}
