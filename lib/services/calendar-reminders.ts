import { prisma } from "@/lib/db";

export async function processCalendarReminders() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 3600000);
  const in1Hour = new Date(now.getTime() + 3600000);

  // Find events starting within 24 hours that haven't had reminders sent
  const dueEvents = await prisma.calendarEvent.findMany({
    where: {
      startDate: { gte: now, lte: in24Hours },
      eventType: { in: ["assignment_due", "quiz_due", "live_session"] },
    },
    include: {
      course: { select: { title: true, slug: true, tenant: { select: { slug: true } } } },
    },
  });

  let remindersSent = 0;

  for (const event of dueEvents) {
    const notificationTitle =
      event.eventType === "live_session"
        ? `Live session starting soon: ${event.title}`
        : event.eventType === "quiz_due"
          ? `Quiz due soon: ${event.title}`
          : `Assignment due soon: ${event.title}`;

    const isUrgent = event.startDate <= in1Hour;
    const hoursUntil = Math.round(
      (event.startDate.getTime() - now.getTime()) / 3600000,
    );

    const notificationBody = isUrgent
      ? `Starts in less than 1 hour!`
      : hoursUntil <= 1
        ? `Due in less than an hour!`
        : `Due in ${hoursUntil} hours`;

    const link = event.course
      ? `/courses/${event.course.slug}`
      : "/calendar";

    // Create notifications for targeted users
    if (event.userId) {
      await prisma.notification.create({
        data: {
          userId: event.userId,
          type: "calendar_reminder",
          title: notificationTitle,
          body: notificationBody,
          link,
        },
      });
      remindersSent++;
    } else {
      // Course-wide event — notify all enrolled students
      if (event.courseId) {
        const enrollments = await prisma.enrollment.findMany({
          where: {
            courseId: event.courseId,
            status: "ACTIVE",
          },
          select: { userId: true },
        });

        for (const enrollment of enrollments) {
          await prisma.notification.create({
            data: {
              userId: enrollment.userId,
              type: "calendar_reminder",
              title: notificationTitle,
              body: notificationBody,
              link,
            },
          });
          remindersSent++;
        }
      }
    }
  }

  return { remindersSent, eventsProcessed: dueEvents.length };
}
