import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, cleanDatabase, seedTestData } from "./setup";

let data: Awaited<ReturnType<typeof seedTestData>>;

beforeAll(async () => {
  await cleanDatabase();
  data = await seedTestData();
});

afterAll(async () => {
  await cleanDatabase();
});

describe("Enrollment Management", () => {
  it("should enroll a user in a course", async () => {
    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId: data.tenant.id,
        courseId: data.course.id,
        userId: data.admin.id,
        source: "MANUAL",
        status: "ACTIVE",
      },
    });

    expect(enrollment.status).toBe("ACTIVE");
    expect(enrollment.courseId).toBe(data.course.id);
    expect(enrollment.userId).toBe(data.admin.id);
  });

  it("should upsert enrollment on re-enroll", async () => {
    const upserted = await prisma.enrollment.upsert({
      where: {
        courseId_userId: { courseId: data.course.id, userId: data.admin.id },
      },
      create: {
        tenantId: data.tenant.id,
        courseId: data.course.id,
        userId: data.admin.id,
        source: "PURCHASE",
        status: "ACTIVE",
      },
      update: { status: "ACTIVE", revokedAt: null, source: "PURCHASE" },
    });

    expect(upserted.source).toBe("PURCHASE");
    expect(upserted.status).toBe("ACTIVE");
  });

  it("should enroll a second user via integration source", async () => {
    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId: data.tenant.id,
        courseId: data.course.id,
        userId: data.instructor.id,
        source: "INTEGRATION",
        externalRef: "ext-ref-123",
        status: "ACTIVE",
      },
    });

    expect(enrollment.source).toBe("INTEGRATION");
    expect(enrollment.externalRef).toBe("ext-ref-123");
  });

  it("should list active enrollments for a user", async () => {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: data.admin.id, status: "ACTIVE" },
      include: { course: { select: { title: true } } },
    });

    expect(enrollments.length).toBeGreaterThanOrEqual(1);
    expect(enrollments[0].course.title).toBe("Test Course");
  });

  it("should mark enrollment as completed", async () => {
    const updated = await prisma.enrollment.update({
      where: {
        courseId_userId: { courseId: data.course.id, userId: data.admin.id },
      },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    expect(updated.status).toBe("COMPLETED");
    expect(updated.completedAt).not.toBeNull();
  });

  it("should track enrollment progress", async () => {
    const updated = await prisma.enrollment.update({
      where: {
        courseId_userId: { courseId: data.course.id, userId: data.instructor.id },
      },
      data: { progressPercent: 50, lastAccessedAt: new Date() },
    });

    expect(updated.progressPercent).toBe(50);
    expect(updated.lastAccessedAt).not.toBeNull();
  });

  it("should get enrollment counts per course", async () => {
    const count = await prisma.enrollment.count({
      where: { courseId: data.course.id },
    });

    expect(count).toBe(2);
  });
});
