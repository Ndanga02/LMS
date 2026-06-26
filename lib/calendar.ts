import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";

export type CalendarEventType =
  | "assignment_due"
  | "quiz_due"
  | "lesson_schedule"
  | "live_session"
  | "office_hours"
  | "course_event"
  | "custom";

export type CreateCalendarEventInput = {
  tenantId: string;
  courseId?: string | null;
  userId?: string | null;
  createdById: string;
  title: string;
  description?: string | null;
  startDate: Date;
  endDate?: Date | null;
  allDay?: boolean;
  eventType: CalendarEventType;
  url?: string | null;
  color?: string | null;
};

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput> & {
  id: string;
};

export type CalendarEventWithRelations = Awaited<ReturnType<typeof getEventById>>;

export const EVENT_COLORS: Record<CalendarEventType, string> = {
  assignment_due: "#f97316",
  quiz_due: "#8b5cf6",
  lesson_schedule: "#06b6d4",
  live_session: "#10b981",
  office_hours: "#f59e0b",
  course_event: "#3b82f6",
  custom: "#6b7280",
};

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  assignment_due: "Assignment Due",
  quiz_due: "Quiz Due",
  lesson_schedule: "Lesson",
  live_session: "Live Session",
  office_hours: "Office Hours",
  course_event: "Course Event",
  custom: "Event",
};

export async function createCalendarEvent(input: CreateCalendarEventInput) {
  const event = await prisma.calendarEvent.create({
    data: {
      tenantId: input.tenantId,
      courseId: input.courseId ?? null,
      userId: input.userId ?? null,
      createdById: input.createdById,
      title: input.title,
      description: input.description ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      allDay: input.allDay ?? false,
      eventType: input.eventType,
      url: input.url ?? null,
      color: input.color ?? EVENT_COLORS[input.eventType],
    },
    include: {
      course: { select: { title: true, slug: true } },
      user: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
    },
  });

  return event;
}

export async function updateCalendarEvent(input: UpdateCalendarEventInput) {
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.startDate !== undefined) data.startDate = input.startDate;
  if (input.endDate !== undefined) data.endDate = input.endDate;
  if (input.allDay !== undefined) data.allDay = input.allDay;
  if (input.eventType !== undefined) {
    data.eventType = input.eventType;
    if (!input.color) data.color = EVENT_COLORS[input.eventType];
  }
  if (input.url !== undefined) data.url = input.url;
  if (input.color !== undefined) data.color = input.color;
  if (input.courseId !== undefined) data.courseId = input.courseId;
  if (input.userId !== undefined) data.userId = input.userId;

  return prisma.calendarEvent.update({
    where: { id: input.id },
    data,
    include: {
      course: { select: { title: true, slug: true } },
      user: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function deleteCalendarEvent(id: string) {
  return prisma.calendarEvent.delete({ where: { id } });
}

export async function getEventById(id: string) {
  return prisma.calendarEvent.findUnique({
    where: { id },
    include: {
      course: { select: { title: true, slug: true } },
      user: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getCalendarEventsByDateRange(params: {
  tenantId?: string;
  userId?: string;
  startDate: Date;
  endDate: Date;
}) {
  const where: Record<string, unknown> = {
    startDate: { lte: params.endDate },
    endDate: params.endDate ? { gte: params.startDate } : undefined,
  };

  if (params.tenantId) where.tenantId = params.tenantId;
  if (params.userId) {
    where.OR = [
      { userId: params.userId },
      { userId: null },
    ];
  }

  // Clean up undefined endDate filter
  if (!params.endDate) delete where.endDate;

  return prisma.calendarEvent.findMany({
    where: where as any,
    include: {
      course: { select: { title: true, slug: true } },
      user: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { startDate: "asc" },
  });
}

export async function getUpcomingEvents(params: {
  userId: string;
  limit?: number;
  daysAhead?: number;
}) {
  const now = new Date();
  const maxDate = new Date(now.getTime() + (params.daysAhead ?? 30) * 86400000);

  // Get courses the user is enrolled in
  const enrolledCourses = await prisma.enrollment.findMany({
    where: { userId: params.userId, status: "ACTIVE" },
    select: { courseId: true },
  });
  const enrolledCourseIds = enrolledCourses.map((e) => e.courseId);

  if (enrolledCourseIds.length === 0) return [];

  return prisma.calendarEvent.findMany({
    where: {
      startDate: { gte: now, lte: maxDate },
      courseId: { in: enrolledCourseIds },
      OR: [
        { userId: params.userId },
        { userId: null },
      ],
    },
    include: {
      course: { select: { title: true, slug: true, tenant: { select: { slug: true } } } },
      createdBy: { select: { name: true } },
    },
    orderBy: { startDate: "asc" },
    take: params.limit ?? 10,
  });
}

export async function getCourseEventsForStudent(params: {
  userId: string;
  courseId: string;
}) {
  return prisma.calendarEvent.findMany({
    where: {
      courseId: params.courseId,
      OR: [
        { userId: params.userId },
        { userId: null },
      ],
    },
    orderBy: { startDate: "asc" },
  });
}

export async function autoGenerateLessonEvents(params: {
  lessonId: string;
  courseId: string;
  tenantId: string;
  createdById: string;
}) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    select: { title: true, slug: true, dueDate: true, type: true, course: { select: { slug: true } } },
  });
  if (!lesson?.dueDate) return null;

  const eventType: CalendarEventType =
    lesson.type === "QUIZ" ? "quiz_due"
    : lesson.type === "ASSIGNMENT" ? "assignment_due"
    : "lesson_schedule";

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: { slug: true },
  });
  const url = tenant
    ? `/t/${tenant.slug}/courses/${lesson.course.slug}`
    : `/courses/${lesson.course.slug}`;

  return createCalendarEvent({
    tenantId: params.tenantId,
    courseId: params.courseId,
    createdById: params.createdById,
    title: `${lesson.title} (${EVENT_TYPE_LABELS[eventType]})`,
    startDate: lesson.dueDate,
    endDate: null,
    allDay: false,
    eventType,
    url,
    color: EVENT_COLORS[eventType],
  });
}

export async function getEventsDueSoon(params: {
  userId: string;
  withinHours?: number;
}) {
  const now = new Date();
  const deadline = new Date(now.getTime() + (params.withinHours ?? 24) * 3600000);

  return prisma.calendarEvent.findMany({
    where: {
      startDate: { gte: now, lte: deadline },
      OR: [
        { userId: params.userId },
        { userId: null },
      ],
      eventType: { in: ["assignment_due", "quiz_due"] },
    },
    include: {
      course: { select: { title: true, slug: true } },
    },
    orderBy: { startDate: "asc" },
  });
}
