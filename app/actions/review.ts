"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { isEnrolled } from "@/lib/enrollments";
import { getTenantBySlug } from "@/lib/tenant";

const reviewSchema = z.object({
  courseId: z.string().cuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(5).max(1000).optional(),
});

export async function submitReviewAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const courseId = formData.get("courseId")?.toString();
  const rating = formData.get("rating");
  const comment = formData.get("comment")?.toString() || undefined;

  if (!courseId) throw new Error("Course ID required");

  const parsed = reviewSchema.parse({ courseId, rating, comment });

  // Must be enrolled to review
  const enrolled = await isEnrolled(parsed.courseId, userId);
  if (!enrolled) {
    throw new Error("You must be enrolled to leave a review.");
  }

  // Prevent duplicate reviews
  const existing = await prisma.courseReview.findUnique({
    where: {
      courseId_userId: {
        courseId: parsed.courseId,
        userId,
      },
    },
  });

  if (existing) {
    // Update existing
    await prisma.courseReview.update({
      where: { id: existing.id },
      data: {
        rating: parsed.rating,
        comment: parsed.comment,
      },
    });
  } else {
    await prisma.courseReview.create({
      data: {
        courseId: parsed.courseId,
        userId,
        rating: parsed.rating,
        comment: parsed.comment,
      },
    });
  }

  // Revalidate the course page
  const course = await prisma.course.findUnique({
    where: { id: parsed.courseId },
    select: { slug: true },
  });
  if (course) {
    const path = tenantSlug === "platform"
      ? `/courses/${course.slug}`
      : `/t/${tenantSlug}/courses/${course.slug}`;
    revalidatePath(path);
  }
}
