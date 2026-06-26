"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { recordAuditEvent } from "@/lib/audit";
import { getTenantBySlug } from "@/lib/tenant";

const createCourseSchema = z.object({
  title: z.string().min(3).max(120),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(10000).optional(),
  priceCents: z.coerce.number().int().min(0).max(1000000),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"]).default("ALL_LEVELS"),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  isMarketplaceListed: z.boolean().default(false),
  whatYouWillLearn: z.string().optional(), // newline separated in form
  requirements: z.string().optional(),
  tags: z.string().optional(), // comma separated
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  estimatedDurationMin: z.coerce.number().int().min(1).optional(),
  category: z.string().optional(),
  isFeatured: z.boolean().default(false),
  maxStudents: z.coerce.number().int().min(1).optional(),
});

export async function createCourseAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("You do not have permission to create courses for this tenant.");

  const raw = {
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    priceCents: formData.get("priceCents"),
    level: formData.get("level") || "ALL_LEVELS",
    status: formData.get("status") || "DRAFT",
    isMarketplaceListed: formData.get("isMarketplaceListed") === "on",
    maxStudents: formData.get("maxStudents") || undefined,
  };

  const parsed = createCourseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid course data: " + JSON.stringify(parsed.error.flatten()));
  }

  const data = parsed.data;

  // Check slug uniqueness within tenant
  const existing = await prisma.course.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: data.slug } },
  });
  if (existing) {
    throw new Error(`A course with slug "${data.slug}" already exists in this tenant.`);
  }

  const whatYouWillLearn = data.whatYouWillLearn ? data.whatYouWillLearn.split("\n").map(s => s.trim()).filter(Boolean) : [];
  const requirements = data.requirements ? data.requirements.split("\n").map(s => s.trim()).filter(Boolean) : [];
  const tags = data.tags ? data.tags.split(",").map(s => s.trim()).filter(Boolean) : [];

  const course = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: userId,
      title: data.title,
      slug: data.slug,
      description: data.description,
      priceCents: data.priceCents,
      currency: "USD",
      level: data.level,
      status: data.status,
      isMarketplaceListed: data.isMarketplaceListed && tenant.isPlatform,
      whatYouWillLearn,
      requirements,
      tags,
      thumbnailUrl: data.thumbnailUrl || null,
      estimatedDurationMin: data.estimatedDurationMin || null,
      category: data.category || null,
      isFeatured: data.isFeatured && tenant.isPlatform,
      maxStudents: data.maxStudents ?? null,
    },
  });

  await recordAuditEvent({
    action: "course.created",
    actorId: userId,
    tenantId: tenant.id,
    targetId: course.id,
    metadata: { slug: course.slug, title: course.title },
  });

  revalidatePath(`/t/${tenantSlug}/admin`);
  revalidatePath(`/t/${tenantSlug}/courses`);

  redirect(`/t/${tenantSlug}/courses/${course.slug}`);
}

const updateCourseSchema = createCourseSchema.partial().extend({ courseId: z.string().cuid() });

export async function updateCourseAction(tenantSlug: string, formData: FormData) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, ["TENANT_ADMIN", "INSTRUCTOR"]);
  if (!allowed) throw new Error("You do not have permission to edit courses for this tenant.");

  const raw = {
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    priceCents: formData.get("priceCents"),
    level: formData.get("level"),
    status: formData.get("status"),
    isMarketplaceListed: formData.get("isMarketplaceListed") === "on",
  };

  const parsed = updateCourseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid course data: " + JSON.stringify(parsed.error.flatten()));
  }

  const data = parsed.data;

  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    select: { tenantId: true, slug: true },
  });
  if (!course || course.tenantId !== tenant.id) {
    throw new Error("Course not found or access denied.");
  }

  // If slug changing, check uniqueness
  if (data.slug && data.slug !== course.slug) {
    const existing = await prisma.course.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: data.slug } },
    });
    if (existing) throw new Error(`Slug "${data.slug}" already in use.`);
  }

  const whatYouWillLearn = data.whatYouWillLearn ? data.whatYouWillLearn.split("\n").map(s => s.trim()).filter(Boolean) : undefined;
  const requirements = data.requirements ? data.requirements.split("\n").map(s => s.trim()).filter(Boolean) : undefined;
  const tags = data.tags ? data.tags.split(",").map(s => s.trim()).filter(Boolean) : undefined;

  await prisma.course.update({
    where: { id: data.courseId },
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      priceCents: data.priceCents,
      level: data.level as any,
      status: data.status as any,
      isMarketplaceListed: data.isMarketplaceListed && tenant.isPlatform,
      whatYouWillLearn,
      requirements,
      tags,
      thumbnailUrl: data.thumbnailUrl || undefined,
      estimatedDurationMin: data.estimatedDurationMin ?? undefined,
      category: data.category || undefined,
      isFeatured: data.isFeatured && tenant.isPlatform,
    },
  });

  await recordAuditEvent({
    action: "course.updated",
    actorId: userId,
    tenantId: tenant.id,
    targetId: data.courseId,
    metadata: { slug: data.slug || course.slug },
  });

  revalidatePath(`/t/${tenantSlug}/admin`);
  revalidatePath(`/t/${tenantSlug}/courses`);
  revalidatePath(`/t/${tenantSlug}/courses/${data.slug || course.slug}`);

  redirect(`/t/${tenantSlug}/admin`);
}
