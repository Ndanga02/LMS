"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CalendarDays,
  List,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
} from "@/app/actions/calendar";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  allDay: boolean;
  eventType: string;
  url: string | null;
  color: string | null;
  course?: { title: string; slug: string } | null;
  user?: { name: string | null; email: string } | null;
  createdBy?: { name: string | null } | null;
};

type CalendarView = "month" | "agenda";

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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  initialEvents,
  tenantSlug,
  isInstructor = false,
  courseSlugs = [],
}: {
  initialEvents: CalendarEvent[];
  tenantSlug: string;
  isInstructor?: boolean;
  courseSlugs?: string[];
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<CalendarView>("month");
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = `${event.startDate.getFullYear()}-${event.startDate.getMonth()}-${event.startDate.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const eventsInRange = useMemo(() => {
    return events
      .filter((e) => {
        const d = e.startDate;
        return d >= viewDate && d < new Date(year, month + 1, 1);
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events, viewDate, year, month]);

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function getEventsForDay(day: number) {
    const key = `${year}-${month}-${day}`;
    return eventsByDate.get(key) || [];
  }

  function handleDayClick(day: number) {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length > 0) {
      setSelectedEvent(dayEvents[0]);
      setShowDetailDialog(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-[200px] text-center font-serif text-xl font-semibold">
            {MONTHS[month]} {year}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border">
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setView("month")}
            >
              <CalendarDays className="mr-1 size-4" />
              Month
            </Button>
            <Button
              variant={view === "agenda" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setView("agenda")}
            >
              <List className="mr-1 size-4" />
              Agenda
            </Button>
          </div>

          {isInstructor && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 size-4" />
                  New Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <CreateEventForm
                  tenantSlug={tenantSlug}
                  courseSlugs={courseSlugs}
                  selectedDate={selectedDate}
                  onSuccess={() => {
                    setShowCreateDialog(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      {view === "month" ? (
        <div className="rounded-xl border bg-card">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b">
            {DAYS.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[100px] border-b border-r bg-muted/20 p-1"
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(new Date(year, month, day), today);

              return (
                <div
                  key={day}
                  className={cn(
                    "min-h-[100px] cursor-pointer border-b border-r p-1 transition-colors hover:bg-muted/30",
                    isToday && "bg-primary/5",
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday && "bg-primary text-primary-foreground",
                      )}
                    >
                      {day}
                    </span>
                    {isInstructor && dayEvents.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: event.color ? `${event.color}20` : undefined, color: event.color || undefined }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                          setShowDetailDialog(true);
                        }}
                      >
                        <div
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: event.color || undefined }}
                        />
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-2">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda View */
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsInRange.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No events scheduled for this month.
              </div>
            ) : (
              <div className="space-y-2">
                {eventsInRange.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                  >
                    <div
                      className="mt-1 size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color || undefined }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{event.title}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            EVENT_TYPE_BADGES[event.eventType] || "",
                          )}
                        >
                          {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatDate(event.startDate)}
                          {!event.allDay && ` at ${formatTime(event.startDate)}`}
                        </span>
                        {event.course && (
                          <span>{event.course.title}</span>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 shrink-0"
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowDetailDialog(true);
                      }}
                    >
                      <span className="sr-only">View</span>
                      →
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[450px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: selectedEvent.color || undefined }}
                  />
                  <DialogTitle className="font-serif">{selectedEvent.title}</DialogTitle>
                </div>
                <DialogDescription>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1",
                      EVENT_TYPE_BADGES[selectedEvent.eventType] || "",
                    )}
                  >
                    {EVENT_TYPE_LABELS[selectedEvent.eventType] || selectedEvent.eventType}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <span>
                    {formatDate(selectedEvent.startDate)}
                    {!selectedEvent.allDay && ` at ${formatTime(selectedEvent.startDate)}`}
                  </span>
                </div>
                {selectedEvent.endDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-muted-foreground" />
                    <span>
                      Ends: {formatDate(selectedEvent.endDate)}
                      {!selectedEvent.allDay && ` at ${formatTime(selectedEvent.endDate)}`}
                    </span>
                  </div>
                )}
                {selectedEvent.course && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Course:</span>
                    <span>{selectedEvent.course.title}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.description}
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2">
                {selectedEvent.url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedEvent.url}>View Details</a>
                  </Button>
                )}
                {isInstructor && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      const form = new FormData();
                      form.set("eventId", selectedEvent.id);
                      try {
                        await deleteCalendarEventAction(tenantSlug, form);
                        setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
                        setShowDetailDialog(false);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                  >
                    <Trash2 className="mr-1 size-3" />
                    Delete
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateEventForm({
  tenantSlug,
  courseSlugs,
  selectedDate,
  onSuccess,
}: {
  tenantSlug: string;
  courseSlugs: string[];
  selectedDate: Date | null;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await createCalendarEventAction(tenantSlug, formData);
      onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle className="font-serif">Create Event</DialogTitle>
        <DialogDescription>
          Schedule a course event, assignment due date, or live session.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g. Mid-term assignment due"
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="eventType">Type</Label>
          <Select name="eventType" defaultValue="course_event">
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assignment_due">Assignment Due</SelectItem>
              <SelectItem value="quiz_due">Quiz Due</SelectItem>
              <SelectItem value="lesson_schedule">Lesson Schedule</SelectItem>
              <SelectItem value="live_session">Live Session</SelectItem>
              <SelectItem value="office_hours">Office Hours</SelectItem>
              <SelectItem value="course_event">Course Event</SelectItem>
              <SelectItem value="custom">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="datetime-local"
              defaultValue={
                selectedDate
                  ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}T09:00`
                  : undefined
              }
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate">End Date (optional)</Label>
            <Input
              id="endDate"
              name="endDate"
              type="datetime-local"
            />
          </div>
        </div>

        {courseSlugs.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="courseSlug">Course (optional)</Label>
            <Select name="courseSlug">
              <SelectTrigger>
                <SelectValue placeholder="No course" />
              </SelectTrigger>
              <SelectContent>
                {courseSlugs.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="targetEmail">Target Student Email (optional)</Label>
          <Input
            id="targetEmail"
            name="targetEmail"
            type="email"
            placeholder="student@example.com"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Event details..."
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="allDay" name="allDay" />
          <Label htmlFor="allDay">All day event</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Event"}
        </Button>
      </DialogFooter>
    </form>
  );
}
