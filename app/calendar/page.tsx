export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/app-shell";
import { CalendarView } from "@/components/calendar";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DbUnavailable } from "@/components/db-unavailable";
import { isDbError, prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant";
import { getRequestTenantSlug } from "@/lib/tenant-context";
import { getCalendarEventsByDateRange } from "@/lib/calendar";
import Link from "next/link";

export default async function CalendarPage() {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/calendar");
  const firstName = sessionUser.name?.split(" ")[0];

  try {
    const userId = await resolveDbUserId(sessionUser);
    const tenantSlug = await getRequestTenantSlug();
    const tenant = await getTenantBySlug(tenantSlug);

    if (!tenant) {
      return (
        <AppShell title="Calendar">
          <div className="flex flex-1 flex-col gap-6 p-6">
            <PageHeader title="Calendar" description="Your schedule and deadlines" />
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Tenant not found.
              </CardContent>
            </Card>
          </div>
        </AppShell>
      );
    }

    const isInstructor = await hasTenantRole(tenant.id, userId, [
      "TENANT_ADMIN",
      "INSTRUCTOR",
    ]);

    // Fetch events for current month range
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const events = await getCalendarEventsByDateRange({
      tenantId: isInstructor ? tenant.id : undefined,
      userId: isInstructor ? undefined : userId,
      startDate: monthStart,
      endDate: monthEnd,
    });

    // Get course slugs for the instructor's event form
    let courseSlugs: string[] = [];
    if (isInstructor) {
      const courses = await prisma.course.findMany({
        where: { tenantId: tenant.id },
        select: { slug: true },
      });
      courseSlugs = courses.map((c) => c.slug);
    }

    // Serialize events for client component
    const serializedEvents = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate?.toISOString() ?? null,
      allDay: e.allDay,
      eventType: e.eventType,
      url: e.url,
      color: e.color,
      course: e.course,
      user: e.user,
      createdBy: e.createdBy,
    }));

    return (
      <AppShell title="Calendar">
        <div className="flex flex-1 flex-col gap-6 @container/main p-6">
          <PageHeader
            title="Calendar"
            description="View your schedule, deadlines, and course events"
          />

          <CalendarView
            initialEvents={serializedEvents.map((e) => ({
              ...e,
              startDate: new Date(e.startDate),
              endDate: e.endDate ? new Date(e.endDate) : null,
            }))}
            tenantSlug={tenantSlug}
            isInstructor={isInstructor}
            courseSlugs={courseSlugs}
          />
        </div>
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell title="Calendar">
          <div className="flex flex-1 flex-col gap-6 p-6">
            <PageHeader title="Calendar" description="Your schedule and deadlines" />
            <DbUnavailable title="Calendar unavailable" />
          </div>
        </AppShell>
      );
    }
    throw error;
  }
}
