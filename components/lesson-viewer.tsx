"use client";

import React, { useState, useTransition, useEffect } from "react";
import { VideoPlayer } from "@/components/video-player";
import { QuizPlayer } from "@/components/quiz-player";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  saveLessonNoteAction,
  addCourseCommentAction,
  getLessonNoteAction,
  getLessonBookmarksAction,
  getLessonProgressAction,
  getCourseCommentsAction,
} from "@/app/actions/retention";
import { markLessonCompleteAction } from "@/app/actions/progress";
import { toast } from "sonner";
import { BookOpen, MessageSquare, Bookmark, CheckCircle2, Play } from "lucide-react";
import { AssignmentWrapper } from "@/components/assignment-wrapper";

type Lesson = {
  id: string;
  title: string;
  slug: string;
  content?: string | null;
  videoUrl?: string | null;
  type: "VIDEO" | "TEXT" | "QUIZ" | "FILE" | "ASSIGNMENT";
  durationMin?: number | null;
  dueDate?: string | null;
  resources?: Array<{ id: string; title: string; url: string; type?: string | null }>;
};

type Note = { content: string } | null;
type Bookmark = { id: string; positionSeconds: number | null; label: string | null; createdAt: Date };

type LessonViewerProps = {
  lesson: Lesson & { quiz?: { id: string; questions: { id: string; question: string; options: string[]; correctIndex: number; order: number }[]; passingScore?: number } | null };
  tenantSlug: string;
  courseSlug: string;
  initialNote?: Note;
  initialBookmarks?: Bookmark[];
  isCompleted?: boolean;
  courseId: string;
  enrolled?: boolean;
  onComplete?: () => void;
};

export function LessonViewer({
  lesson,
  tenantSlug,
  courseSlug,
  initialNote,
  initialBookmarks = [],
  isCompleted,
  courseId,
  onComplete,
}: LessonViewerProps) {
  const [note, setNote] = useState(initialNote?.content || "");
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"notes" | "bookmarks" | "discuss">("notes");
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(!!isCompleted);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [lastPositionSeconds, setLastPositionSeconds] = useState(0);

  // Load personal notes + bookmarks + video progress when the selected lesson changes
  useEffect(() => {
    let cancelled = false;

    async function loadPersonalData() {
      setIsLoadingData(true);
      try {
        const [noteData, bookmarksData, progressData] = await Promise.all([
          getLessonNoteAction(lesson.id),
          getLessonBookmarksAction(lesson.id),
          getLessonProgressAction(lesson.id),
        ]);
        if (!cancelled) {
          setNote(noteData?.content || "");
          setBookmarks(bookmarksData || []);
          if (progressData?.lastPositionSeconds) {
            setLastPositionSeconds(progressData.lastPositionSeconds);
          }
        }
      } catch (e) {
        // silent; user can still create new
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    }

    loadPersonalData();
    return () => { cancelled = true; };
  }, [lesson.id]);

  const hasVideo = !!lesson.videoUrl;
  const isQuiz = lesson.type === "QUIZ" && lesson.quiz;

  const handleSaveNote = () => {
    const fd = new FormData();
    fd.append("lessonId", lesson.id);
    fd.append("content", note);
    fd.append("tenantSlug", tenantSlug);
    fd.append("courseSlug", courseSlug);

    startTransition(async () => {
      try {
        await saveLessonNoteAction(fd);
        toast.success("Note saved");
        // keep local state in sync immediately
        setNote(note);
      } catch (e) {
        toast.error("Failed to save note");
      }
    });
  };

  const handleMarkComplete = () => {
    const fd = new FormData();
    fd.append("tenantSlug", tenantSlug);
    fd.append("courseSlug", courseSlug);
    fd.append("lessonId", lesson.id);

    startTransition(async () => {
      try {
        await markLessonCompleteAction(fd);
        setCompleted(true);
        toast.success("Lesson complete", { description: "Streak and progress updated." });
        onComplete?.();
      } catch {
        toast.error("Could not mark complete");
      }
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const fd = new FormData();
    fd.append("courseId", courseId);
    fd.append("lessonId", lesson.id);
    fd.append("content", newComment.trim());
    fd.append("tenantSlug", tenantSlug);
    fd.append("courseSlug", courseSlug);

    startTransition(async () => {
      try {
        await addCourseCommentAction(fd);
        setNewComment("");
        // Optimistic append (real data would revalidate or fetch)
        setComments((c) => [
          ...c,
          {
            id: "tmp-" + Date.now(),
            content: newComment.trim(),
            createdAt: new Date(),
            user: { name: "You" },
          },
        ]);
        toast.success("Comment posted");
      } catch {
        toast.error("Failed to post comment");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">
              {lesson.type}
            </Badge>
            {lesson.durationMin && (
              <span className="text-xs text-muted-foreground">{lesson.durationMin} min</span>
            )}
            {completed && <CheckCircle2 className="size-4 text-primary" />}
          </div>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight">{lesson.title}</h3>
        </div>

        {!completed && (
          <Button onClick={handleMarkComplete} disabled={isPending} variant="outline" size="sm">
            Mark complete
          </Button>
        )}
      </div>

      {/* VIDEO / QUIZ / TEXT PLAYER AREA */}
      {hasVideo && lesson.videoUrl && (
        <VideoPlayer
          lessonId={lesson.id}
          videoUrl={lesson.videoUrl}
          initialPositionSeconds={lastPositionSeconds}
          tenantSlug={tenantSlug}
          courseSlug={courseSlug}
          lessonTitle={lesson.title}
          onMarkComplete={!completed ? handleMarkComplete : undefined}
        />
      )}

      {isQuiz && lesson.quiz && (
        <div className="surface-glass rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
            <Play className="size-4" /> Interactive Quiz
          </div>
          <QuizPlayer
            quizId={lesson.quiz.id}
            lessonId={lesson.id}
            questions={lesson.quiz.questions}
            tenantSlug={tenantSlug}
            courseSlug={courseSlug}
            passingScore={lesson.quiz.passingScore}
            onPassed={() => {
              setCompleted(true);
              onComplete?.();
            }}
          />
        </div>
      )}

      {/* Assignment submission */}
      {lesson.type === "ASSIGNMENT" && (
        <AssignmentWrapper
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          dueDate={lesson.dueDate ?? null}
          tenantSlug={tenantSlug}
          courseSlug={courseSlug}
        />
      )}

      {/* Lesson text content */}
      {lesson.content && (
        <div className="rounded-2xl border bg-card p-6">
          <MarkdownRenderer content={lesson.content} />
        </div>
      )}

      {/* Resources */}
      {lesson.resources && lesson.resources.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium">Resources</div>
          <ul className="space-y-1 text-sm">
            {lesson.resources.map((r) => (
              <li key={r.id}>
                <a
                  href={r.url.startsWith("http") ? r.url : `/api/v1/files/${r.url}`}
                  target="_blank"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {r.title} {r.type ? `· ${r.type}` : ""}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* RETENTION SIDEBAR / TABS: Notes + Bookmarks + Community */}
      <div className="surface-glass rounded-2xl">
        <div className="flex border-b px-1">
          {[
            { key: "notes", label: "My Notes", icon: BookOpen },
            { key: "bookmarks", label: "Bookmarks", icon: Bookmark },
            { key: "discuss", label: "Discussion", icon: MessageSquare },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as "notes" | "bookmarks" | "discuss")}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-medium transition ${activeTab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === "notes" && (
            <div className="space-y-3">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write your personal notes for this lesson. They are private to you."
                className="min-h-[140px] resize-y bg-background"
              />
              <Button size="sm" onClick={handleSaveNote} disabled={isPending}>
                Save private note
              </Button>
              <p className="text-[11px] text-muted-foreground">Notes help retention. Revisit anytime from your dashboard or here.</p>
            </div>
          )}

          {activeTab === "bookmarks" && (
            <div className="space-y-2 text-sm">
              {bookmarks.length === 0 ? (
                <p className="text-muted-foreground">No bookmarks yet. Use the player to drop one at important moments.</p>
              ) : (
                bookmarks.map((b) => (
                  <div key={b.id} className="bookmark-item">
                    <div>
                      <span className="font-mono text-xs text-primary">
                        {b.positionSeconds != null ? `${Math.floor(b.positionSeconds / 60)}:${String(b.positionSeconds % 60).padStart(2, "0")}` : ""}
                      </span>{" "}
                      {b.label || "Untitled bookmark"}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "discuss" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share an insight, question, or tip for fellow learners..."
                  className="min-h-[72px] flex-1"
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim() || isPending} className="self-end">
                  Post
                </Button>
              </div>

              <div className="space-y-3 pt-2">
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground">Be the first to start the conversation in this lesson.</p>
                )}
                {comments.map((c, idx) => (
                  <div key={idx} className="comment text-sm">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{c.user?.name || "Learner"}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{c.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
