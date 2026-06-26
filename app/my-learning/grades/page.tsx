export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/app-shell";
import { MyGrades } from "@/components/my-grades";
import { DbUnavailable } from "@/components/db-unavailable";
import { isDbError } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { getStudentGrades } from "@/lib/gradebook";

export default async function MyGradesPage() {
  try {
    const sessionUser = await requireSessionUser();
    const userId = await resolveDbUserId(sessionUser);

    const gradesData = await getStudentGrades(userId);

    const serialized = gradesData.map((g) => ({
      course: { id: g.course.id, title: g.course.title, slug: g.course.slug },
      averageScore: g.averageScore,
      totalGraded: g.totalGraded,
      grades: g.grades.map((grade) => ({
        lessonId: grade.lessonId,
        lessonTitle: grade.lessonTitle,
        lessonType: grade.lessonType,
        score: grade.score,
        passed: grade.passed,
        feedback: grade.feedback,
        gradedAt: grade.gradedAt.toISOString(),
      })),
    }));

    return (
      <AppShell>
        <div className="mx-auto max-w-4xl p-4 md:p-6">
          <h1 className="mb-6 font-serif text-2xl font-bold tracking-tight">My Grades</h1>
          <MyGrades grades={serialized} />
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
