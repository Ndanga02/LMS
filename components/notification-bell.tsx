"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink, MessageCircle, Trophy, Megaphone, UserPlus, Flame, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/actions/notifications";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

const typeIcons: Record<string, React.ReactNode> = {
  comment_reply: <MessageCircle className="size-4" />,
  achievement_unlocked: <Trophy className="size-4" />,
  course_update: <Megaphone className="size-4" />,
  enrollment: <UserPlus className="size-4" />,
  streak_reminder: <Flame className="size-4" />,
  calendar_reminder: <CalendarDays className="size-4" />,
};

export function NotificationBell({
  initialUnread,
  initialNotifications,
}: {
  initialUnread: number;
  initialNotifications: Notification[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [notifications, setNotifications] = useState(initialNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)),
    );
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
    setUnread(0);
  };

  const displayed = notifications.slice(0, 5);

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Notifications</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {displayed.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y">
                {displayed.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50",
                      !notification.readAt && "bg-primary/5",
                    )}
                  >
                    <span className="mt-0.5 shrink-0 text-muted-foreground">
                      {typeIcons[notification.type] ?? <Bell className="size-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      {notification.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatTimeAgo(new Date(notification.createdAt))}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {!notification.readAt && (
                        <button
                          onClick={() => handleMarkRead(notification.id)}
                          className="rounded p-1 text-muted-foreground hover:text-foreground"
                          title="Mark as read"
                        >
                          <CheckCheck className="size-3.5" />
                        </button>
                      )}
                      {notification.link && (
                        <Link
                          href={notification.link}
                          onClick={() => {
                            if (!notification.readAt) handleMarkRead(notification.id);
                            setIsOpen(false);
                          }}
                          className="rounded p-1 text-muted-foreground hover:text-foreground"
                          title="View"
                        >
                          <ExternalLink className="size-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
              <Link href="/notifications" onClick={() => setIsOpen(false)}>
                View all notifications
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
