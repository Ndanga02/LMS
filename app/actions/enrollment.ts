"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canEnrollViaPurchase,
  enrollUser,
  isEnrolled,
  purchaseAndEnroll,
} from "@/lib/enrollments";
import { getCourseForEnrollment } from "@/lib/courses";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { recordAuditEvent } from "@/lib/audit";
import { getTenantBySlug } from "@/lib/tenant";
import { deliverEnrollmentWebhook } from "@/lib/webhook";

export async function enrollInCourseAction(tenantSlug: string, courseSlug: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);   // Always resolves via email + ensures real User row exists (defensive against stale JWT ids)

  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant || tenant.status !== "ACTIVE") {
    throw new Error("Tenant not found or inactive.");
  }

  const course = await getCourseForEnrollment(tenant.id, courseSlug);
  if (!course || course.status !== "PUBLISHED") {
    throw new Error("Course not found or unavailable.");
  }

  if (!canEnrollViaPurchase(tenant.enrollmentMode)) {
    throw new Error("This tenant does not allow direct enrollment.");
  }

  if (await isEnrolled(course.id, userId)) {
    redirect(tenantSlug === "platform" ? `/courses/${courseSlug}` : `/t/${tenantSlug}/courses/${courseSlug}`);
  }

  let enrollment;
  if (course.priceCents > 0) {
    const result = await purchaseAndEnroll({
      tenantId: tenant.id,
      courseId: course.id,
      userId,
      amountCents: course.priceCents,
      currency: course.currency,
    });
    enrollment = result.enrollment;
  } else {
    enrollment = await enrollUser({
      tenantId: tenant.id,
      courseId: course.id,
      userId,
      source: "MANUAL",
    });
  }

  await recordAuditEvent({
    action: "enrollment.created",
    actorId: userId,
    tenantId: tenant.id,
    targetId: course.id,
    metadata: { courseSlug, source: course.priceCents > 0 ? "PURCHASE" : "MANUAL" },
  });

  await deliverEnrollmentWebhook(tenant.id, {
    event: "enrollment.created",
    enrollmentId: enrollment.id,
    courseSlug,
    userEmail: sessionUser.email ?? "",
  });

  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseSlug}`);
  revalidatePath(`/t/${tenantSlug}/courses`);
  revalidatePath(`/t/${tenantSlug}/courses/${courseSlug}`);

  redirect(
    tenantSlug === "platform"
      ? `/courses/${courseSlug}`
      : `/t/${tenantSlug}/courses/${courseSlug}`,
  );
}