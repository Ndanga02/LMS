import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { isDbError, prisma } from "@/lib/db";
import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { BookOpen, Bookmark, Play } from "lucide-react";

export default async function MyLearningPage() {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/my-learning");
  const userId = await resolveDbUserId(sessionUser);

  try {
    const [notes, bookmarks, inProgress] = await Promise.all([
      prisma.lessonNote.findMany({
        where: { userId },
        include: {
          lesson: {
            select: {
              title: true,
              slug: true,
              course: { select: { title: true, slug: true, tenant: { select: { slug: true } } } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      prisma.lessonBookmark.findMany({
        where: { userId },
        include: {
          lesson: {
            select: {
              title: true,
              slug: true,
              course: { select: { title: true, slug: true, tenant: { select: { slug: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.enrollment.findMany({
        where: { userId, status: "ACTIVE", progressPercent: { gt: 0, lt: 100 } },
        include: {
          course: {
            select: {
              title: true,
              slug: true,
              tenant: { select: { slug: true } },
              _count: { select: { lessons: true } },
            },
          },
        },
        orderBy: { lastAccessedAt: "desc" },
        take: 6,
      }),
    ]);

  return (
    <AppShell title="My Learning">
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">My Learning</h1>
          <p className="text-muted-foreground">All your notes, bookmarks, and in-progress courses in one place.</p>
        </div>

        {/* Continue Learning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Play className="size-5" /> Continue Learning</CardTitle>
          </CardHeader>
          <CardContent>
            {inProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">You're all caught up! Browse new courses.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((enr) => {
                  const href = enr.course.tenant.slug === "platform" 
                    ? `/courses/${enr.course.slug}` 
                    : `/t/${enr.course.tenant.slug}/courses/${enr.course.slug}`;
                  return (
                    <Link key={enr.id} href={href} className="rounded-xl border p-4 hover:bg-muted/40 block">
                      <div className="font-medium line-clamp-2">{enr.course.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground flex justify-between">
                        <span>{enr.progressPercent}% complete</span>
                        <span>{enr.course._count.lessons} lessons</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="size-5" /> My Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet. Start taking notes in lessons!</p>}
            {notes.map((note) => {
              const course = note.lesson.course;
              const href = course.tenant.slug === "platform" 
                ? `/courses/${course.slug}` 
                : `/t/${course.tenant.slug}/courses/${course.slug}`;
              return (
                <div key={note.id} className="rounded-xl border p-4">
                  <div className="text-sm font-medium">{note.lesson.title}</div>
                  <div className="text-xs text-muted-foreground mb-2">in {course.title}</div>
                  <p className="text-sm whitespace-pre-wrap line-clamp-3 text-muted-foreground">{note.content}</p>
                  <Link href={href} className="text-xs text-primary mt-2 inline-block hover:underline">Go to lesson →</Link>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* My Bookmarks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bookmark className="size-5" /> My Bookmarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookmarks.length === 0 && <p className="text-sm text-muted-foreground">No bookmarks yet. Bookmark key moments while watching videos.</p>}
            {bookmarks.map((bm) => {
              const course = bm.lesson.course;
              const href = course.tenant.slug === "platform" 
                ? `/courses/${course.slug}` 
                : `/t/${course.tenant.slug}/courses/${course.slug}`;
              const time = bm.positionSeconds ? `${Math.floor(bm.positionSeconds / 60)}:${(bm.positionSeconds % 60).toString().padStart(2, "0")}` : "";
              return (
                <div key={bm.id} className="flex items-start justify-between gap-4 rounded-xl border p-4">
                  <div>
                    <div className="font-medium">{bm.lesson.title}</div>
                    <div className="text-xs text-muted-foreground">{course.title} {time && `• ${time}`}</div>
                    {bm.label && <div className="text-sm mt-1">{bm.label}</div>}
                    {bm.note && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{bm.note}</div>}
                  </div>
                  <Link href={href} className="text-xs text-primary hover:underline shrink-0">Open →</Link>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell title="My Learning">
          <div className="space-y-8">
            <div>
              <h1 className="font-serif text-3xl tracking-tight">My Learning</h1>
              <p className="text-muted-foreground">All your notes, bookmarks, and in-progress courses in one place.</p>
            </div>
            <DbUnavailable title="Learning data unavailable" />
          </div>
        </AppShell>
      );
    }
    throw error;
  }
}
