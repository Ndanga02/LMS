import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date | null;
  allDay: boolean;
  eventType: string;
  url: string | null;
  color: string | null;
  course?: { title: string; slug: string } | null;
};

const EVENT_TYPE_BADGES: Record<string, string> = {
  assignment_due: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  quiz_due: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  lesson_schedule: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  live_session: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  office_hours: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  course_event: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  custom: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  assignment_due: "Assignment Due",
  quiz_due: "Quiz Due",
  lesson_schedule: "Lesson",
  live_session: "Live Session",
  office_hours: "Office Hours",
  course_event: "Course Event",
  custom: "Event",
};

function formatEventDate(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);

  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function UpcomingEvents({
  events,
}: {
  events: CalendarEvent[];
}) {
  return (
    <Card className="border-primary/5 shadow-sm shadow-primary/5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <Calendar className="size-5 text-primary" />
            Upcoming
          </CardTitle>
          <CardDescription>Events and deadlines</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
          <Link href="/calendar">
            View all
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-primary/20 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No upcoming events
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-lg border border-primary/10 p-3 transition-colors hover:bg-muted/30"
              >
                <div
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: event.color || undefined }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {event.title}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[10px] px-1.5 py-0",
                        EVENT_TYPE_BADGES[event.eventType] || "",
                      )}
                    >
                      {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    <span>
                      {event.allDay
                        ? event.startDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        : formatEventDate(event.startDate)}
                    </span>
                    {event.course && (
                      <>
                        <span className="mx-1">·</span>
                        <span>{event.course.title}</span>
                      </>
                    )}
                  </div>
                </div>
                {event.url && (
                  <Button variant="ghost" size="sm" className="size-7 shrink-0" asChild>
                    <Link href={event.url}>
                      <span className="sr-only">View</span>
                      →
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
