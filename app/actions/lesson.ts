"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { recordAuditEvent } from "@/lib/audit";
import { getTenantBySlug } from "@/lib/tenant";
import { createMuxDirectUploadUrl, getMuxAssetPlaybackId } from "@/lib/mux-server";
import { autoGenerateLessonEvents } from "@/lib/calendar";

const muxIdRegex = /^[a-zA-Z0-9]+$/;

const addLessonSchema = z.object({
  courseId: z.string().cuid(),
  title: z.string().min(3).max(120),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  content: z.string().max(10000).optional(),
  videoUrl: z.string().optional().or(z.literal("")).transform((v) => {
    if (!v || v === "") return undefined;
    if (muxIdRegex.test(v)) return `https://stream.mux.com/${v}.m3u8`;
    return v;
  }),
  durationMin: z.coerce.number().int().min(1).max(300).optional(),
  isPublished: z.boolean().default(true),
  sectionTitle: z.string().min(1).max(120).optional(),
  type: z.enum(["VIDEO", "TEXT", "QUIZ", "FILE", "ASSIGNMENT"]).default("VIDEO"),
  dueDate: z.string().optional(),
});

export async function addLessonAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("You do not have permission to add lessons for this tenant.");

  const raw = {
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    content: formData.get("content") || undefined,
    videoUrl: formData.get("videoUrl") || undefined,
    durationMin: formData.get("durationMin") || undefined,
    isPublished: true,
    type: formData.get("type") || "VIDEO",
    dueDate: formData.get("dueDate") || undefined,
  };

  const parsed = addLessonSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid lesson data: " + JSON.stringify(parsed.error.flatten()));
  }

  const data = parsed.data;

  // Verify the course belongs to this tenant
  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    select: { tenantId: true, title: true },
  });

  if (!course || course.tenantId !== tenant.id) {
    throw new Error("Course not found in this tenant.");
  }

  // Check slug uniqueness within course
  const existing = await prisma.lesson.findUnique({
    where: { courseId_slug: { courseId: data.courseId, slug: data.slug } },
  });
  if (existing) {
    throw new Error(`A lesson with slug "${data.slug}" already exists in this course.`);
  }

  let sectionId: string | null = null;
  if (data.sectionTitle) {
    // Find or create section by title for this course (simple incremental support)
    const existingSection = await prisma.courseSection.findFirst({
      where: {
        courseId: data.courseId,
        title: data.sectionTitle,
      },
    });

    if (existingSection) {
      sectionId = existingSection.id;
    } else {
      const lastSection = await prisma.courseSection.findFirst({
        where: { courseId: data.courseId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      const newSection = await prisma.courseSection.create({
        data: {
          courseId: data.courseId,
          title: data.sectionTitle,
          order: (lastSection?.order ?? 0) + 1,
        },
      });
      sectionId = newSection.id;
    }
  }

  // Get next order (global or within section; for simplicity global for now)
  const lastLesson = await prisma.lesson.findFirst({
    where: { courseId: data.courseId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (lastLesson?.order ?? 0) + 1;

  const lesson = await prisma.lesson.create({
    data: {
      courseId: data.courseId,
      sectionId,
      title: data.title,
      slug: data.slug,
      content: data.content,
      videoUrl: data.videoUrl || null,
      durationMin: data.durationMin || null,
      order: nextOrder,
      isPublished: data.isPublished,
      type: data.type,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  if (lesson.dueDate) {
    await autoGenerateLessonEvents({
      lessonId: lesson.id,
      courseId: lesson.courseId,
      tenantId: tenant.id,
      createdById: userId,
    });
  }

  // Auto-create empty quiz shell for QUIZ type lessons (instructor can add questions later via DB or future UI)
  if (data.type === "QUIZ") {
    await prisma.quiz.create({
      data: {
        lessonId: lesson.id,
        title: `${data.title} Quiz`,
        passingScore: 70,
      },
    }).catch(() => {}); // ignore if already exists somehow
  }

  await recordAuditEvent({
    action: "lesson.created",
    actorId: userId,
    tenantId: tenant.id,
    targetId: lesson.id,
    metadata: { courseId: data.courseId, title: data.title, slug: data.slug, type: data.type },
  });

  revalidatePath(`/t/${tenantSlug}/admin`);
  revalidatePath(`/t/${tenantSlug}/courses`);

  // Fetch course slug for nice redirect
  const courseForRedirect = await prisma.course.findUnique({
    where: { id: data.courseId },
    select: { slug: true },
  });

  if (courseForRedirect) {
    redirect(`/t/${tenantSlug}/courses/${courseForRedirect.slug}`);
  }

  redirect(`/t/${tenantSlug}/admin`);
}

const updateLessonSchema = z.object({
  lessonId: z.string().cuid(),
  title: z.string().min(3).max(120).optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
  content: z.string().max(10000).optional().or(z.literal("")),
  videoUrl: z.string().optional().or(z.literal("")).transform((v) => {
    if (!v || v === "") return undefined;
    if (muxIdRegex.test(v)) return `https://stream.mux.com/${v}.m3u8`;
    return v;
  }),
  durationMin: z.coerce.number().int().min(1).max(300).optional(),
  isPublished: z.boolean().optional(),
  type: z.enum(["VIDEO", "TEXT", "QUIZ", "FILE", "ASSIGNMENT"]).optional(),
  dueDate: z.string().optional().or(z.literal("")),
});

export async function updateLessonAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("You do not have permission to edit lessons for this tenant.");

  const raw = {
    lessonId: formData.get("lessonId"),
    title: formData.get("title") || undefined,
    slug: formData.get("slug") || undefined,
    content: formData.get("content") || undefined,
    videoUrl: formData.get("videoUrl") || undefined,
    durationMin: formData.get("durationMin") || undefined,
    isPublished: formData.get("isPublished") === "on" ? true : formData.get("isPublished") === "off" ? false : undefined,
    dueDate: formData.get("dueDate") || undefined,
  };

  const parsed = updateLessonSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid lesson data: " + JSON.stringify(parsed.error.flatten()));
  }

  const data = parsed.data;

  const lesson = await prisma.lesson.findUnique({
    where: { id: data.lessonId },
    select: { courseId: true, course: { select: { tenantId: true, slug: true } } },
  });

  if (!lesson || lesson.course.tenantId !== tenant.id) {
    throw new Error("Lesson not found in this tenant.");
  }

  // If changing slug, check uniqueness
  if (data.slug && data.slug !== (await prisma.lesson.findUnique({ where: { id: data.lessonId }, select: { slug: true } }))?.slug) {
    const existing = await prisma.lesson.findUnique({
      where: { courseId_slug: { courseId: lesson.courseId, slug: data.slug } },
    });
    if (existing) throw new Error(`Slug "${data.slug}" already used in this course.`);
  }

  const updatedLesson = await prisma.lesson.update({
    where: { id: data.lessonId },
    data: {
      title: data.title,
      slug: data.slug,
      content: data.content === "" ? null : data.content,
      videoUrl: data.videoUrl === "" ? null : data.videoUrl,
      durationMin: data.durationMin ?? undefined,
      isPublished: data.isPublished,
      type: data.type,
      dueDate: data.dueDate === "" ? null : data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });

  if (updatedLesson.dueDate) {
    await autoGenerateLessonEvents({
      lessonId: updatedLesson.id,
      courseId: updatedLesson.courseId,
      tenantId: tenant.id,
      createdById: userId,
    });
  }

  await recordAuditEvent({
    action: "lesson.updated",
    actorId: userId,
    tenantId: tenant.id,
    targetId: data.lessonId,
    metadata: { courseId: lesson.courseId, title: data.title, slug: data.slug },
  });

  revalidatePath(`/t/${tenantSlug}/admin`);
  revalidatePath(`/t/${tenantSlug}/courses`);

  if (lesson.course.slug) {
    revalidatePath(`/t/${tenantSlug}/courses/${lesson.course.slug}`);
  }

  redirect(`/t/${tenantSlug}/admin`);
}

export async function deleteLessonAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("You do not have permission.");

  const lessonId = formData.get("lessonId")?.toString();
  if (!lessonId) throw new Error("Lesson ID required");

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { course: { select: { tenantId: true, slug: true } } },
  });

  if (!lesson || lesson.course.tenantId !== tenant.id) {
    throw new Error("Lesson not found.");
  }

  await prisma.lesson.delete({ where: { id: lessonId } });

  await recordAuditEvent({
    action: "lesson.deleted",
    actorId: userId,
    tenantId: tenant.id,
    targetId: lessonId,
    metadata: { courseSlug: lesson.course.slug },
  });

  revalidatePath(`/t/${tenantSlug}/admin`);
  revalidatePath(`/t/${tenantSlug}/courses`);

  if (lesson.course.slug) {
    revalidatePath(`/t/${tenantSlug}/courses/${lesson.course.slug}`);
  }

  redirect(`/t/${tenantSlug}/admin`);
}

export async function createMuxUploadUrlAction() {
  const sessionUser = await requireSessionUser();
  const { uploadUrl, uploadId } = await createMuxDirectUploadUrl();
  return { uploadUrl, uploadId };
}

export async function checkMuxUploadAction(uploadId: string) {
  const sessionUser = await requireSessionUser();
  return getMuxAssetPlaybackId(uploadId);
}
