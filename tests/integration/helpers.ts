import { PrismaClient } from "@/lib/generated/prisma";

/**
 * Clean all tables in the test database.
 */
export async function cleanDatabase(prisma: PrismaClient) {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename === "_prisma_migrations") continue;
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
    } catch {
      // skip if table doesn't exist or can't be truncated
    }
  }
}

/**
 * Seed common test data.
 */
export async function seedTestData(prisma: PrismaClient) {
  const tenant = await prisma.tenant.create({
    data: {
      slug: "test-org",
      name: "Test Organization",
      status: "ACTIVE",
      enrollmentMode: "BOTH",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@test-org.com",
      name: "Admin User",
      platformRole: "USER",
    },
  });

  await prisma.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      userId: admin.id,
      role: "TENANT_ADMIN",
    },
  });

  const instructor = await prisma.user.create({
    data: {
      email: "instructor@test-org.com",
      name: "Instructor User",
      platformRole: "USER",
    },
  });

  await prisma.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      userId: instructor.id,
      role: "INSTRUCTOR",
    },
  });

  const course = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      title: "Test Course",
      slug: "test-course",
      status: "PUBLISHED",
      instructorId: instructor.id,
    },
  });

  const lesson = await prisma.lesson.create({
    data: {
      courseId: course.id,
      title: "Test Lesson",
      slug: "test-lesson",
      type: "TEXT",
      isPublished: true,
    },
  });

  return { tenant, admin, instructor, course, lesson };
}
