"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole, isSuperAdmin } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventsByDateRange,
  getUpcomingEvents,
  getEventsDueSoon,
  CalendarEventType,
  EVENT_TYPE_LABELS,
} from "@/lib/calendar";
import { recordAuditEvent } from "@/lib/audit";

const eventTypes = [
  "assignment_due",
  "quiz_due",
  "lesson_schedule",
  "live_session",
  "office_hours",
  "course_event",
  "custom",
] as const;

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  endDate: z.string().optional().refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date"),
  allDay: z.coerce.boolean().default(false),
  eventType: z.enum(eventTypes as any),
  color: z.string().max(9).optional(),
  courseSlug: z.string().optional(),
  targetEmail: z.string().email().optional(),
});

async function authorizeForTenant(
  tenantSlug: string,
  requiredRoles: string[],
) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const allowed = await hasTenantRole(tenant.id, userId, requiredRoles as any);
  if (!allowed) throw new Error("You do not have permission for this action.");

  return { userId, tenant, sessionUser };
}

function buildCourseUrl(tenantSlug: string, courseSlug?: string): string | null {
  if (!courseSlug) return null;
  return tenantSlug === "platform"
    ? `/courses/${courseSlug}`
    : `/t/${tenantSlug}/courses/${courseSlug}`;
}

export async function createCalendarEventAction(tenantSlug: string, formData: FormData) {
  const { userId, tenant } = await authorizeForTenant(tenantSlug, [
    "TENANT_ADMIN",
    "INSTRUCTOR",
  ]);

  const raw = {
    title: formData.get("title")?.toString(),
    description: formData.get("description")?.toString() || undefined,
    startDate: formData.get("startDate")?.toString(),
    endDate: formData.get("endDate")?.toString() || undefined,
    allDay: formData.get("allDay") === "on",
    eventType: formData.get("eventType")?.toString() || "custom",
    color: formData.get("color")?.toString() || undefined,
    courseSlug: formData.get("courseSlug")?.toString() || undefined,
    targetEmail: formData.get("targetEmail")?.toString() || undefined,
  };

  const parsed = createEventSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid event data: " + JSON.stringify(parsed.error.flatten()));
  }

  const data = parsed.data;
  const startDate = new Date(data.startDate);

  let courseId: string | null = null;
  let targetUserId: string | null = null;
  let eventUrl = buildCourseUrl(tenantSlug, data.courseSlug);

  if (data.courseSlug) {
    const course = await prisma.course.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: data.courseSlug } },
      select: { id: true },
    });
    if (course) courseId = course.id;
  }

  if (data.targetEmail) {
    const targetUser = await prisma.user.findUnique({
      where: { email: data.targetEmail },
      select: { id: true },
    });
    if (targetUser) targetUserId = targetUser.id;
  }

  const event = await createCalendarEvent({
    tenantId: tenant.id,
    courseId,
    userId: targetUserId,
    createdById: userId,
    title: data.title,
    description: data.description,
    startDate,
    endDate: data.endDate ? new Date(data.endDate) : null,
    allDay: data.allDay,
    eventType: data.eventType as CalendarEventType,
    url: eventUrl,
    color: data.color,
  });

  await recordAuditEvent({
    action: "settings.updated",
    actorId: userId,
    tenantId: tenant.id,
    targetId: event.id,
    metadata: { action: "calendar_event_created", eventType: data.eventType, title: data.title },
  });

  revalidatePath(`/calendar`);
  revalidatePath(`/t/${tenantSlug}/admin`);

  return { eventId: event.id };
}

const updateEventSchema = z.object({
  eventId: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  startDate: z.string().optional().refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date"),
  endDate: z.string().optional().refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date"),
  allDay: z.coerce.boolean().optional(),
  eventType: z.enum(eventTypes as any).optional(),
  color: z.string().max(9).optional(),
});

export async function updateCalendarEventAction(tenantSlug: string, formData: FormData) {
  const { userId, tenant } = await authorizeForTenant(tenantSlug, [
    "TENANT_ADMIN",
    "INSTRUCTOR",
  ]);

  const raw = {
    eventId: formData.get("eventId")?.toString(),
    title: formData.get("title")?.toString() || undefined,
    description: formData.get("description")?.toString() || undefined,
    startDate: formData.get("startDate")?.toString() || undefined,
    endDate: formData.get("endDate")?.toString() || undefined,
    allDay: formData.get("allDay") === "on" || undefined,
    eventType: formData.get("eventType")?.toString() || undefined,
    color: formData.get("color")?.toString() || undefined,
  };

  const parsed = updateEventSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid event data: " + JSON.stringify(parsed.error.flatten()));
  }

  const data = parsed.data;

  const existing = await prisma.calendarEvent.findUnique({
    where: { id: data.eventId },
    select: { tenantId: true },
  });
  if (!existing || existing.tenantId !== tenant.id) {
    throw new Error("Event not found.");
  }

  const updateData: Record<string, unknown> = { id: data.eventId };
  if (data.title) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : undefined;
  if (data.allDay !== undefined) updateData.allDay = data.allDay;
  if (data.eventType) updateData.eventType = data.eventType;
  if (data.color) updateData.color = data.color;

  await updateCalendarEvent(updateData as any);

  revalidatePath(`/calendar`);
  revalidatePath(`/t/${tenantSlug}/admin`);
}

export async function deleteCalendarEventAction(tenantSlug: string, formData: FormData) {
  const { userId, tenant } = await authorizeForTenant(tenantSlug, [
    "TENANT_ADMIN",
    "INSTRUCTOR",
  ]);

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) throw new Error("Event ID required");

  const existing = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { tenantId: true },
  });
  if (!existing || existing.tenantId !== tenant.id) {
    throw new Error("Event not found.");
  }

  await deleteCalendarEvent(eventId);

  await recordAuditEvent({
    action: "settings.updated",
    actorId: userId,
    tenantId: tenant.id,
    targetId: eventId,
    metadata: { action: "calendar_event_deleted" },
  });

  revalidatePath(`/calendar`);
  revalidatePath(`/t/${tenantSlug}/admin`);
}

export async function getCalendarEventsAction(
  tenantSlug: string,
  startDateStr: string,
  endDateStr: string,
) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");

  const isAdmin = await hasTenantRole(tenant.id, userId, [
    "TENANT_ADMIN",
    "INSTRUCTOR",
  ]);

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  // Admins see all events in the tenant; students see their own + course-wide
  const events = await getCalendarEventsByDateRange({
    tenantId: isAdmin ? tenant.id : undefined,
    userId: isAdmin ? undefined : userId,
    startDate,
    endDate,
  });

  return events;
}

export async function getMyUpcomingEventsAction() {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  return getUpcomingEvents({ userId, limit: 10, daysAhead: 30 });
}

export async function getDueSoonEventsAction() {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  return getEventsDueSoon({ userId, withinHours: 24 });
}
