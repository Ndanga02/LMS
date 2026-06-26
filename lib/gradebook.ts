import { prisma } from "@/lib/db";

export async function getCourseGradebook(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      slug: true,
      tenantId: true,
      lessons: {
        where: { type: { in: ["QUIZ", "ASSIGNMENT"] } },
        select: { id: true, title: true, type: true, dueDate: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!course) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "ACTIVE" },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { enrolledAt: "asc" },
  });

  const lessonIds = course.lessons.map((l) => l.id);

  const grades = await prisma.grade.findMany({
    where: { courseId, lessonId: { in: lessonIds } },
  });

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { lessonId: { in: lessonIds } },
  });

  const gradeMap = new Map<string, Grade>();
  for (const g of grades) {
    gradeMap.set(`${g.userId}_${g.lessonId}`, g);
  }

  const submissionMap = new Map<string, typeof submissions[0]>();
  for (const s of submissions) {
    submissionMap.set(`${s.userId}_${s.lessonId}`, s);
  }

  const rows = enrollments.map((enrollment) => {
    const lessonGrades = course.lessons.map((lesson) => {
      const key = `${enrollment.user.id}_${lesson.id}`;
      const grade = gradeMap.get(key);
      const submission = submissionMap.get(key);
      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonType: lesson.type,
        dueDate: lesson.dueDate,
        grade: grade ?? null,
        submission: submission ?? null,
      };
    });

    const totalScore = lessonGrades.reduce((sum, lg) => sum + (lg.grade?.score ?? 0), 0);
    const totalPossible = lessonGrades.length * 100;
    const overallGrade = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : null;

    return {
      user: enrollment.user,
      enrolledAt: enrollment.enrolledAt,
      lessonGrades,
      overallGrade,
    };
  });

  return {
    course: { id: course.id, title: course.title, slug: course.slug },
    gradableLessons: course.lessons,
    rows,
  };
}

export async function getStudentGrades(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      course: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const courseIds = enrollments.map((e) => e.course.id);
  const grades = await prisma.grade.findMany({
    where: { userId, courseId: { in: courseIds } },
    include: {
      lesson: { select: { id: true, title: true, type: true } },
    },
    orderBy: { gradedAt: "desc" },
  });

  return enrollments.map((enrollment) => {
    const courseGrades = grades.filter((g) => g.courseId === enrollment.course.id);
    const avg =
      courseGrades.length > 0
        ? Math.round(courseGrades.reduce((s, g) => s + g.score, 0) / courseGrades.length)
        : null;
    return {
      course: enrollment.course,
      grades: courseGrades.map((g) => ({
        lessonId: g.lessonId,
        lessonTitle: g.lesson.title,
        lessonType: g.lesson.type,
        score: g.score,
        passed: g.passed,
        feedback: g.feedback,
        gradedAt: g.gradedAt,
      })),
      averageScore: avg,
      totalGraded: courseGrades.length,
    };
  });
}

export async function upsertGrade(params: {
  userId: string;
  lessonId: string;
  courseId: string;
  score: number;
  feedback?: string | null;
  gradedById: string;
  submissionId?: string | null;
}) {
  const passed = params.score >= 60; // default passing threshold
  return prisma.grade.upsert({
    where: { lessonId_userId: { lessonId: params.lessonId, userId: params.userId } },
    create: {
      userId: params.userId,
      lessonId: params.lessonId,
      courseId: params.courseId,
      score: params.score,
      passed,
      feedback: params.feedback ?? null,
      gradedById: params.gradedById,
      submissionId: params.submissionId ?? null,
    },
    update: {
      score: params.score,
      passed,
      feedback: params.feedback ?? null,
      gradedById: params.gradedById,
      submissionId: params.submissionId ?? null,
      gradedAt: new Date(),
    },
    include: { submission: true, user: { select: { name: true, email: true } } },
  });
}

type Grade = {
  userId: string;
  lessonId: string;
  score: number;
  passed: boolean;
  feedback: string | null;
  gradedAt: Date;
};
