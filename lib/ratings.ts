import { prisma } from "@/lib/db";

export type RatingMap = Map<string, { avg: number; count: number }>;

export async function getRatingMap(courseIds: string[]): Promise<RatingMap> {
  if (courseIds.length === 0) return new Map();

  const stats = await prisma.courseReview.groupBy({
    by: ["courseId"],
    where: { courseId: { in: courseIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return new Map(
    stats.map((r) => [r.courseId, {
      avg: Number(r._avg.rating?.toFixed(1) ?? 0),
      count: r._count.rating,
    }]),
  );
}

export async function getCourseRating(courseId: string) {
  const map = await getRatingMap([courseId]);
  return map.get(courseId) ?? { avg: 0, count: 0 };
}
