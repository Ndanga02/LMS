import { prisma } from "@/lib/db";
import { cache } from "react";
import { getRatingMap } from "@/lib/ratings";
import type { Prisma } from "@/lib/generated/prisma";

export const getPublishedCourses = cache(async (tenantId: string) => {
  return prisma.course.findMany({
    where: { tenantId, status: "PUBLISHED" },
    include: {
      instructor: { select: { name: true, image: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
    orderBy: { publishedAt: "desc" },
  });
});

export const getMarketplaceCourses = cache(async () => {
  const courses = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ tenant: { isPlatform: true } }, { isMarketplaceListed: true }],
    },
    include: {
      tenant: { select: { name: true, slug: true, isPlatform: true, logoUrl: true } },
      instructor: { select: { name: true, image: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  const reviewStats = await prisma.courseReview.groupBy({
    by: ["courseId"],
    _avg: { rating: true },
    _count: { rating: true },
  });

  const ratingMap = new Map(
    reviewStats.map((r) => [r.courseId, { avg: Number(r._avg.rating?.toFixed(1) ?? 0), count: r._count.rating }]),
  );

  return courses.map((course) => ({
    ...course,
    rating: ratingMap.get(course.id)?.avg ?? 0,
    reviewCount: ratingMap.get(course.id)?.count ?? 0,
  }));
});

export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";

export type SearchFilters = {
  query?: string;
  category?: string;
  level?: CourseLevel;
  price?: "free" | "paid";
  page?: number;
  pageSize?: number;
};

export const searchCourses = cache(async (filters: SearchFilters) => {
  const where: Prisma.CourseWhereInput = {
    status: "PUBLISHED",
    OR: [{ tenant: { isPlatform: true } }, { isMarketplaceListed: true }],
  };

  if (filters.query) {
    where.AND = [
      {
        OR: [
          { title: { contains: filters.query, mode: "insensitive" } },
          { description: { contains: filters.query, mode: "insensitive" } },
          { tags: { has: filters.query } },
        ],
      },
    ];
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.level) {
    where.level = filters.level;
  }

  if (filters.price === "free") {
    where.priceCents = 0;
  } else if (filters.price === "paid") {
    where.priceCents = { gt: 0 };
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const skip = (page - 1) * pageSize;

  const [courses, total, reviewStats] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        tenant: { select: { name: true, slug: true, isPlatform: true, logoUrl: true } },
        instructor: { select: { name: true, image: true } },
        _count: { select: { lessons: true, enrollments: true } },
      },
      orderBy: { publishedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.course.count({ where }),
    prisma.courseReview.groupBy({
      by: ["courseId"],
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const ratingMap = new Map(
    reviewStats.map((r) => [r.courseId, { avg: Number(r._avg.rating?.toFixed(1) ?? 0), count: r._count.rating }]),
  );

  return {
    courses: courses.map((course) => ({
      ...course,
      rating: ratingMap.get(course.id)?.avg ?? 0,
      reviewCount: ratingMap.get(course.id)?.count ?? 0,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

export const getCourseCategories = cache(async () => {
  const result = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      category: { not: null },
      OR: [{ tenant: { isPlatform: true } }, { isMarketplaceListed: true }],
    },
    select: { category: true },
    distinct: ["category"],
  });
  return result.map((r) => r.category).filter(Boolean) as string[];
});

export const getCourseBySlug = cache(async (tenantId: string, slug: string) => {
  return prisma.course.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    include: {
      tenant: { select: { id: true, name: true, slug: true, isPlatform: true, enrollmentMode: true, logoUrl: true } },
      instructor: { select: { name: true, image: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              resources: { orderBy: { order: "asc" } },
              quiz: { include: { questions: { orderBy: { order: "asc" } } } },
            },
          },
        },
      },
      lessons: {
        where: { sectionId: null },
        orderBy: { order: "asc" },
        include: {
          resources: { orderBy: { order: "asc" } },
          quiz: { include: { questions: { orderBy: { order: "asc" } } } },
        },
      },
      _count: { select: { lessons: true, enrollments: true } },
    },
  });
});

export const getCourseForEnrollment = cache(async (tenantId: string, slug: string) => {
  return prisma.course.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    select: { id: true, status: true, priceCents: true, currency: true },
  });
});

export const getCourseWithProgress = cache(async (tenantId: string, slug: string, userId: string) => {
  const course = await getCourseBySlug(tenantId, slug);
  if (!course) return null;

  const allLessonIds = [
    ...course.lessons.map((l) => l.id),
    ...course.sections.flatMap((s) => s.lessons.map((l) => l.id)),
  ];

  const progressRecords = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: allLessonIds } },
    select: { lessonId: true, completedAt: true, lastPositionSeconds: true },
  });

  const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

  return { ...course, progressMap };
});
