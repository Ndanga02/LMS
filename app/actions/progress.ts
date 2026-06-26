"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { markLessonComplete } from "@/lib/progress";
import { isEnrolled } from "@/lib/enrollments";
import { getCourseBySlug } from "@/lib/courses";
import { getTenantBySlug } from "@/lib/tenant";

export async function markLessonCompleteAction(formData: FormData) {
  const tenantSlug = formData.get("tenantSlug")?.toString() || "platform";
  const courseSlug = formData.get("courseSlug")?.toString();
  const lessonId = formData.get("lessonId")?.toString();

  if (!courseSlug || !lessonId) {
    throw new Error("Missing course or lesson identifier");
  }

  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const course = await getCourseBySlug(tenant.id, courseSlug);
  if (!course) throw new Error("Course not found");

  const enrolled = await isEnrolled(course.id, userId);
  if (!enrolled) throw new Error("Not enrolled in this course");

  await markLessonComplete(userId, lessonId, course.id);

  // Revalidate relevant paths
  const base = tenantSlug === "platform" ? "" : `/t/${tenantSlug}`;
  revalidatePath(`${base}/courses/${courseSlug}`);
  revalidatePath("/dashboard");
}
