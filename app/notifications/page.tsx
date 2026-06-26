export const dynamic = "force-dynamic";

import Link from "next/link";
import { Bell, CheckCheck, Trash2, ArrowLeft, MessageCircle, Trophy, Megaphone, UserPlus, Flame, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DbUnavailable } from "@/components/db-unavailable";
import { isDbError } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  dismissNotificationAction,
} from "@/app/actions/notifications";

const typeIcons: Record<string, React.ReactNode> = {
  comment_reply: <MessageCircle className="size-4" />,
  achievement_unlocked: <Trophy className="size-4" />,
  course_update: <Megaphone className="size-4" />,
  enrollment: <UserPlus className="size-4" />,
  streak_reminder: <Flame className="size-4" />,
  calendar_reminder: <CalendarDays className="size-4" />,
};

export default async function NotificationsPage() {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/notifications");

  try {
    const userId = await resolveDbUserId(sessionUser);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return (
      <AppShell title="Notifications">
        <div className="flex flex-1 flex-col gap-6 @container/main">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl tracking-tight">Notifications</h1>
              <p className="text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "All caught up"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <form action={markAllNotificationsReadAction}>
                  <Button type="submit" variant="secondary" size="sm" className="gap-1.5">
                    <CheckCheck className="size-4" />
                    Mark all read
                  </Button>
                </form>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="size-4" /> Back
                </Link>
              </Button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bell className="size-7" />
                </div>
                <CardTitle className="font-serif text-xl">No notifications</CardTitle>
                <CardDescription>
                  Notifications about comment replies, achievements, and course updates will appear here.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                    !notification.readAt ? "border-primary/20 bg-primary/5" : ""
                  }`}
                >
                  <span className="mt-1 shrink-0 text-muted-foreground">
                    {typeIcons[notification.type] ?? <Bell className="size-5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{notification.title}</span>
                      {!notification.readAt && (
                        <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                          New
                        </Badge>
                      )}
                    </div>
                    {notification.body && (
                      <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    {notification.link && (
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link href={notification.link}>
                          <span className="sr-only">View</span>
                          →
                        </Link>
                      </Button>
                    )}
                    {!notification.readAt && (
                      <form action={markNotificationReadAction.bind(null, notification.id)}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Mark as read"
                        >
                          <CheckCheck className="size-4" />
                        </Button>
                      </form>
                    )}
                    <form action={dismissNotificationAction.bind(null, notification.id)}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        title="Dismiss"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell title="Notifications">
          <DbUnavailable title="Notifications unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}
