import { prisma } from "@/lib/db";

// ─── Student Analytics (3 queries total) ─────────────────────────

export async function getStudentAnalytics(userId: string) {
  const weeks = 8;
  const now = Date.now();
  const startDate = new Date(now - weeks * 7 * 86400000);

  // Query 1: enrollments + user + lesson progress (parallel, 3 queries)
  const [enrollments, user, lessonProgress] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true, title: true, slug: true,
            tenant: { select: { slug: true, name: true } },
          },
        },
        certificate: { select: { id: true } },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreakDays: true, longestStreakDays: true, totalPoints: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId },
      select: { completedAt: true, watchSeconds: true, lessonId: true },
    }),
  ]);

  // Query 2: lessons for enrolled courses (sequential, 1 query)
  const enrolledCourseIds = [...new Set(enrollments.map((e) => e.course.id))];
  const lessons = enrolledCourseIds.length > 0
    ? await prisma.lesson.findMany({
        where: { courseId: { in: enrolledCourseIds }, isPublished: true },
        select: { id: true, courseId: true },
      })
    : [];

  // Query 3: quiz + learning stats + achievement count
  const [quizAttempts, notesCount, bookmarksCount, commentsCount, achievementCount] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId },
      include: { quiz: { include: { lesson: { select: { title: true } } } } },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
    prisma.lessonNote.count({ where: { userId } }),
    prisma.lessonBookmark.count({ where: { userId } }),
    prisma.courseComment.count({ where: { userId } }),
    prisma.userAchievement.count({ where: { userId } }),
  ]);

  // ─── Aggregate in memory ───

  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED");
  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE");

  const lessonsDone = lessonProgress.filter((l) => l.completedAt).length;
  const totalWatchSeconds = lessonProgress.reduce((s, l) => s + (l.watchSeconds ?? 0), 0);

  // Weekly activity buckets
  const weekBuckets: { week: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = now - i * 7 * 86400000;
    const we = ws + 7 * 86400000;
    weekBuckets.push({
      week: new Date(ws).toLocaleDateString("en", { month: "short", day: "numeric" }),
      count: lessonProgress.filter((l) => l.completedAt && +l.completedAt >= ws && +l.completedAt < we).length,
    });
  }

  // Quiz stats
  const totalQuizzes = quizAttempts.length;
  const passedQuizzes = quizAttempts.filter((a) => a.passed).length;
  const avgScore = totalQuizzes > 0 ? Math.round(quizAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / totalQuizzes) : 0;

  // Course breakdown
  const lessonMap = new Map<string, number>();
  for (const l of lessons) {
    lessonMap.set(l.courseId, (lessonMap.get(l.courseId) ?? 0) + 1);
  }
  const completedLessonMap = new Map<string, number>();
  for (const lp of lessonProgress) {
    if (!lp.completedAt) continue;
    const l = lessons.find((l) => l.id === lp.lessonId);
    if (l) {
      completedLessonMap.set(l.courseId, (completedLessonMap.get(l.courseId) ?? 0) + 1);
    }
  }

  const courseBreakdown = enrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    slug: e.course.slug,
    tenantSlug: e.course.tenant.slug,
    tenantName: e.course.tenant.name,
    status: e.status,
    progressPercent: e.progressPercent,
    lessonsTotal: lessonMap.get(e.course.id) ?? 0,
    lessonsDone: completedLessonMap.get(e.course.id) ?? 0,
    hasCertificate: e.certificate !== null,
  }));

  return {
    overview: {
      inProgress: activeEnrollments.length,
      completed: completedEnrollments.length,
      lessonsDone,
      watchTimeSeconds: totalWatchSeconds,
      achievementCount,
      streak: {
        current: user?.currentStreakDays ?? 0,
        longest: user?.longestStreakDays ?? 0,
        totalPoints: user?.totalPoints ?? 0,
      },
    },
    weeklyActivity: weekBuckets,
    quizPerformance: {
      total: totalQuizzes,
      passed: passedQuizzes,
      avgScore,
      attempts: quizAttempts,
    },
    learningStats: {
      notes: notesCount,
      bookmarks: bookmarksCount,
      comments: commentsCount,
    },
    courseBreakdown,
  };
}

// ─── Instructor Analytics (4 queries total) ──────────────────────

export async function getInstructorAnalytics(tenantId: string) {
  // Query 1: all enrollments + courses + reviews
  const [enrollments, courses, reviews] = await Promise.all([
    prisma.enrollment.findMany({
      where: { tenantId },
      select: { id: true, status: true, userId: true, progressPercent: true, lastAccessedAt: true, courseId: true },
    }),
    prisma.course.findMany({
      where: { tenantId },
      include: {
        instructor: { select: { name: true } },
        _count: { select: { enrollments: true, lessons: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.courseReview.groupBy({
      by: ["courseId"],
      where: { course: { tenantId } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  // Query 2: engagement data
  const courseIds = courses.map((c) => c.id);
  let notes: { userId: string }[] = [];
  let quizAttempts: { passed: boolean; userId: string }[] = [];
  let comments: { userId: string }[] = [];
  if (courseIds.length > 0) {
    [notes, quizAttempts, comments] = await Promise.all([
      prisma.lessonNote.findMany({
        where: { lesson: { courseId: { in: courseIds } } },
        select: { userId: true },
        take: 10000,
      }),
      prisma.quizAttempt.findMany({
        where: { quiz: { lesson: { courseId: { in: courseIds } } } },
        select: { passed: true, userId: true },
        take: 10000,
      }),
      prisma.courseComment.findMany({
        where: { courseId: { in: courseIds } },
        select: { userId: true },
        take: 10000,
      }),
    ]);
  }

  // Query 3: recent students (separate, no distinct issue)
  const recentStudents = await prisma.enrollment.findMany({
    where: { tenantId, status: "ACTIVE" },
    include: {
      user: { select: { id: true, name: true, email: true, lastActiveDate: true, currentStreakDays: true, totalPoints: true } },
      course: { select: { title: true, slug: true } },
    },
    orderBy: { lastAccessedAt: "desc" },
    take: 10,
  });

  // Query 4: enrollment trend
  const months = 6;
  const trendStart = new Date(Date.now() - months * 30 * 86400000);
  const trendEnrollments = await prisma.enrollment.findMany({
    where: { tenantId, enrolledAt: { gte: trendStart } },
    select: { enrolledAt: true },
    orderBy: { enrolledAt: "asc" },
  });

  // ─── Aggregate in memory ───

  // Overview
  const allStudents = new Set(enrollments.map((e) => e.userId));
  const activeStudents = new Set(enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.userId));
  const completedCount = enrollments.filter((e) => e.status === "COMPLETED").length;

  const ratingMap = new Map(reviews.map((r) => [r.courseId, { avg: Number((r._avg.rating ?? 0).toFixed(1)), count: r._count.rating }]));
  const allRatings = reviews.filter((r) => r._avg.rating);
  const avgRatingAll = allRatings.length > 0
    ? Number((allRatings.reduce((s, r) => s + (r._avg.rating ?? 0), 0) / allRatings.length).toFixed(1))
    : null;

  // Enrollment trend
  const d = new Date();
  const trend: { month: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const ms = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime();
    const me = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime();
    trend.push({
      month: new Date(ms).toLocaleDateString("en", { month: "short", year: "2-digit" }),
      count: trendEnrollments.filter((e) => +e.enrolledAt >= ms && +e.enrolledAt < me).length,
    });
  }

  // Course performance
  const completedCourseMap = new Map<string, number>();
  for (const e of enrollments) {
    if (e.status === "COMPLETED") {
      completedCourseMap.set(e.courseId, (completedCourseMap.get(e.courseId) ?? 0) + 1);
    }
  }

  const coursePerformance = courses.map((c) => {
    const total = c._count.enrollments;
    const completed = completedCourseMap.get(c.id) ?? 0;
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      instructor: c.instructor?.name ?? "—",
      lessons: c._count.lessons,
      enrollments: total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      rating: ratingMap.get(c.id)?.avg ?? 0,
      reviewCount: ratingMap.get(c.id)?.count ?? 0,
    };
  });

  return {
    overview: {
      courses: courses.length,
      totalStudents: allStudents.size,
      activeStudents: activeStudents.size,
      totalEnrollments: enrollments.length,
      completedEnrollments: completedCount,
      completionRate: enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0,
      avgRating: avgRatingAll,
    },
    enrollmentTrend: trend,
    coursePerformance,
    engagement: {
      notesCount: notes.length,
      studentsWithNotes: new Set(notes.map((n) => n.userId)).size,
      quizAttemptsCount: quizAttempts.length,
      passedCount: quizAttempts.filter((q) => q.passed).length,
      studentsWithQuizzes: new Set(quizAttempts.map((q) => q.userId)).size,
      commentsCount: comments.length,
      studentsWithComments: new Set(comments.map((c) => c.userId)).size,
    },
    recentStudents,
  };
}
