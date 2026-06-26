export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CheckCircle2, Clock, Play } from "lucide-react";
import { submitReviewAction } from "@/app/actions/review";
import { EnrollButton } from "@/components/enroll-button";
import { CertificateDisplay } from "@/components/certificate-display";
import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LessonViewer } from "@/components/lesson-viewer";
import { InteractiveCurriculum } from "@/components/interactive-curriculum";
import { ensureAppBootstrap } from "@/lib/bootstrap";
import { getCourseBySlug } from "@/lib/courses";
import { canEnrollViaPurchase, isEnrolled } from "@/lib/enrollments";
import { getCourseProgress } from "@/lib/progress";
import { auth } from "@/lib/auth";
import { isDbError, prisma } from "@/lib/db";
import { getPlatformTenant } from "@/lib/tenant";
import { getSessionUser, resolveDbUserId } from "@/lib/session";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatPrice(priceCents: number, currency: string) {
  if (priceCents === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

export default async function PlatformCoursePage({ params }: PageProps) {
  const { slug } = await params;

  try {
    await ensureAppBootstrap();
    const platform = await getPlatformTenant();
    if (!platform) notFound();

    const course = await getCourseBySlug(platform.id, slug);
    if (!course || course.status !== "PUBLISHED") notFound();

    const sessionUser = await getSessionUser();
    const userId = sessionUser ? await resolveDbUserId(sessionUser) : null;
    const enrolled = userId && (await isEnrolled(course.id, userId));
    const canEnroll = canEnrollViaPurchase(course.tenant.enrollmentMode);

    let courseProgress = 0;
    let completedLessonIds = new Set<string>();
    let certificate: { certificateCode: string; issuedAt: Date } | null = null;

    if (enrolled && userId) {
      const prog = await getCourseProgress(userId, course.id);
      courseProgress = prog.percent;

      const progressRecords = await prisma.lessonProgress.findMany({
        where: {
          userId,
          lessonId: {
            in: [
              ...course.lessons.map((l) => l.id),
              ...course.sections.flatMap((s) => s.lessons.map((l) => l.id)),
            ],
          },
          completedAt: { not: null },
        },
        select: { lessonId: true },
      });
      completedLessonIds = new Set(progressRecords.map((r) => r.lessonId));

      if (courseProgress === 100) {
        const enrollment = await prisma.enrollment.findUnique({
          where: { courseId_userId: { courseId: course.id, userId } },
        });
        if (enrollment) {
          certificate = await prisma.certificate.findUnique({
            where: { enrollmentId: enrollment.id },
            select: { certificateCode: true, issuedAt: true, finalScore: true },
          });
        }
      }
    }

    // Reviews (only show/submit if enrolled)
    let reviews: any[] = [];
    let avgRating = 0;
    if (enrolled) {
      reviews = await prisma.courseReview.findMany({
        where: { courseId: course.id },
        include: {
          user: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
      if (reviews.length > 0) {
        avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      }
    }

    return (
      <AppShell title={course.title}>
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            <PageHeader
              title={course.title}
              description={course.description ?? undefined}
            />

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {formatPrice(course.priceCents, course.currency)}
              </Badge>
              <Badge variant="outline">
                <BookOpen className="mr-1 size-3" />
                {course._count.lessons} lessons
              </Badge>
              <Badge variant="outline">
                {course._count.enrollments} students
              </Badge>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Curriculum</h2>
                {enrolled && <div className="text-sm text-muted-foreground">{course._count.enrollments} students enrolled</div>}
              </div>

              {/* NEW: Premium interactive curriculum with VideoPlayer, notes, bookmarks, quizzes, community */}
              <InteractiveCurriculum
                sections={course.sections || []}
                flatLessons={course.lessons || []}
                completedLessonIds={completedLessonIds}
                tenantSlug="platform"
                courseSlug={slug}
                courseId={course.id}
                userId={userId}
                enrolled={!!enrolled}
                initialNotes={{}}
                initialBookmarks={{}}
              />
            </section>

            {/* Reviews section - only for enrolled users */}
            {enrolled && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Reviews</h2>
                  {avgRating > 0 && (
                    <Badge variant="secondary">
                      {avgRating.toFixed(1)} / 5 ({reviews.length})
                    </Badge>
                  )}
                </div>

                {/* Submit review form */}
                <form
                  action={submitReviewAction.bind(null, "platform")}
                  className="surface-glass space-y-3 rounded-xl border border-border/60 p-4"
                >
                  <input type="hidden" name="courseId" value={course.id} />
                  <div>
                    <label className="text-sm font-medium">Your rating</label>
                    <select
                      name="rating"
                      className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                      defaultValue="5"
                      required
                    >
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Very good</option>
                      <option value="3">3 - Good</option>
                      <option value="2">2 - Fair</option>
                      <option value="1">1 - Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Comment (optional)</label>
                    <textarea
                      name="comment"
                      className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                      rows={3}
                      placeholder="What did you think of the course?"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="secondary">
                    Submit Review
                  </Button>
                </form>

                {/* Existing reviews */}
                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="surface-glass rounded-xl border border-border/60 p-4"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={i < review.rating ? "text-primary" : "text-muted"}>
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-sm font-medium">{review.user?.name || "Anonymous"}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Be the first to review this course!</p>
                )}
              </section>
            )}
          </div>

          <aside className="surface-glass h-fit rounded-2xl p-6 lg:sticky lg:top-24">
            {enrolled ? (
              <div className="space-y-4">
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Your progress</span>
                    <span className="font-semibold tabular-nums">{courseProgress}%</span>
                  </div>
                  <Progress value={courseProgress} className="h-2" />
                </div>

                {certificate ? (
                  <CertificateDisplay
                    certificateCode={certificate.certificateCode}
                    issuedAt={certificate.issuedAt}
                  />
                ) : courseProgress === 100 ? (
                  <div className="text-center text-xs text-muted-foreground">
                    Completing the last lesson will generate your certificate.
                  </div>
                ) : null}

                <div className="text-center text-sm text-muted-foreground">
                  Complete lessons below to increase your progress. Your dashboard will reflect real-time updates.
                </div>
                <Button className="w-full" asChild>
                  <Link href="/dashboard">View all courses</Link>
                </Button>
              </div>
            ) : canEnroll ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {course.priceCents > 0 ? "Purchase course" : "Enroll for free"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {course.priceCents > 0
                    ? "Instant access after purchase."
                    : "Start learning immediately — no payment required."}
                </p>
                {sessionUser ? (
                  <EnrollButton
                    tenantSlug="platform"
                    courseSlug={slug}
                    priceCents={course.priceCents}
                    className="w-full"
                  >
                    {course.priceCents > 0 ? "Purchase now" : "Enroll now"}
                  </EnrollButton>
                ) : (
                  <Button className="w-full" size="lg" asChild>
                    <Link href="/login">Sign in to enroll</Link>
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Direct enrollment is not available for this course.
              </p>
            )}
          </aside>
        </div>
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell>
          <DbUnavailable title="Course unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}