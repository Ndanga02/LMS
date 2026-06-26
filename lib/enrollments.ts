import type { EnrollmentSource } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db";

export async function isEnrolled(courseId: string, userId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });
  return enrollment?.status === "ACTIVE";
}

export async function checkCourseCapacity(courseId: string): Promise<void> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { maxStudents: true },
  });
  if (!course || course.maxStudents === null) return;

  const activeCount = await prisma.enrollment.count({
    where: { courseId, status: "ACTIVE" },
  });
  if (activeCount >= course.maxStudents) {
    throw new Error("This course has reached its maximum student capacity.");
  }
}

export async function getUserEnrollments(userId: string) {
  return prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      course: {
        include: {
          tenant: { select: { slug: true, name: true } },
          _count: { select: { lessons: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });
}

export async function ensureTenantMembership(
  tenantId: string,
  userId: string,
  role: "STUDENT" | "INSTRUCTOR" | "TENANT_ADMIN" = "STUDENT",
) {
  return prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: { tenantId, userId, role },
    update: {},
  });
}

type EnrollUserInput = {
  tenantId: string;
  courseId: string;
  userId: string;
  source: EnrollmentSource;
  externalRef?: string;
};

export async function enrollUser(input: EnrollUserInput) {
  await checkCourseCapacity(input.courseId);
  await ensureTenantMembership(input.tenantId, input.userId);

  return prisma.enrollment.upsert({
    where: {
      courseId_userId: { courseId: input.courseId, userId: input.userId },
    },
    create: {
      tenantId: input.tenantId,
      courseId: input.courseId,
      userId: input.userId,
      source: input.source,
      externalRef: input.externalRef,
      status: "ACTIVE",
    },
    update: {
      status: "ACTIVE",
      revokedAt: null,
      source: input.source,
      externalRef: input.externalRef,
    },
  });
}

export async function purchaseAndEnroll({
  tenantId,
  courseId,
  userId,
  amountCents,
  currency,
}: {
  tenantId: string;
  courseId: string;
  userId: string;
  amountCents: number;
  currency: string;
}) {
  const purchase = await prisma.purchase.create({
    data: {
      tenantId,
      courseId,
      userId,
      amountCents,
      currency,
      status: "COMPLETED",
      purchasedAt: new Date(),
    },
  });

  const enrollment = await enrollUser({
    tenantId,
    courseId,
    userId,
    source: "PURCHASE",
    externalRef: purchase.id,
  });

  return { purchase, enrollment };
}

export function canEnrollViaPurchase(enrollmentMode: string) {
  return enrollmentMode === "PURCHASE_ONLY" || enrollmentMode === "BOTH";
}

export function canEnrollViaIntegration(enrollmentMode: string) {
  return enrollmentMode === "INTEGRATION_ONLY" || enrollmentMode === "BOTH";
}