"use client";

import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2, Clock, Play, AlertCircle } from "lucide-react";
import { LessonViewer } from "@/components/lesson-viewer";
import { Button } from "@/components/ui/button";

type LessonSummary = {
  id: string;
  title: string;
  slug: string;
  type: "VIDEO" | "TEXT" | "QUIZ" | "FILE" | "ASSIGNMENT";
  durationMin: number | null;
  dueDate: string | null;
  content: string | null;
  videoUrl: string | null;
  order: number;
  isPublished: boolean;
  resources: { id: string; title: string; url: string; type: string | null; order: number }[];
  quiz: { id: string; questions: { id: string; question: string; options: string[]; correctIndex: number; order: number }[]; passingScore?: number } | null;
};

type SectionSummary = {
  id: string;
  title: string;
  order: number;
  description: string | null;
  lessons: LessonSummary[];
};

type Props = {
  sections: SectionSummary[];
  flatLessons: LessonSummary[];
  completedLessonIds: Set<string>;
  tenantSlug: string;
  courseSlug: string;
  courseId: string;
  userId: string | null;
  initialNotes?: Record<string, string>;
  initialBookmarks?: Record<string, { id: string; positionSeconds: number | null; label: string | null; note: string | null }[]>;
  enrolled: boolean;
};

export function InteractiveCurriculum({
  sections,
  flatLessons,
  completedLessonIds,
  tenantSlug,
  courseSlug,
  courseId,
  enrolled,
  initialNotes = {},
  initialBookmarks = {},
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedId && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId]);

  const allLessons = [
    ...flatLessons,
    ...sections.flatMap((s) => s.lessons || []),
  ];

  const selectedLesson = allLessons.find((l) => l.id === selectedId);

  if (!enrolled) {
    // Non-enrolled: simple beautiful list (no player)
    return (
      <div className="space-y-2">
        {allLessons.map((lesson) => (
          <div key={lesson.id} className="surface-glass flex items-center justify-between rounded-xl border border-border/60 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{lesson.order || 0}</span>
              <div>
                <div className="font-medium">{lesson.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {lesson.durationMin && <span className="flex items-center gap-1"><Clock className="size-3" /> {lesson.durationMin} min</span>}
                  {lesson.dueDate && (
                    <span className={`flex items-center gap-1 ${new Date(lesson.dueDate) < new Date() ? "text-orange-500" : ""}`}>
                      <AlertCircle className="size-3" />
                      Due {new Date(lesson.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Sign in to start</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Curriculum list — click to open premium experience */}
      <div className="space-y-3">
        {sections.length > 0 ? (
          <>
            {sections.map((section, sIdx) => (
              <div key={section.id} className="curriculum-section">
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">Section {sIdx + 1}</span>
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-semibold">{section.title}</span>
                </div>
                <div className="space-y-2">
                  {(section.lessons || []).map((lesson) => {
                    const done = completedLessonIds.has(lesson.id);
                    const active = selectedId === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedId(lesson.id)}
                        className={`lesson-card w-full text-left ${done ? "completed" : ""} ${active ? "ring-1 ring-primary/60" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{lesson.order || 0}</span>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {lesson.title}
                                {done && <CheckCircle2 className="size-4 text-primary" />}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {lesson.durationMin && <span>{lesson.durationMin} min • {lesson.type}</span>}
                                {lesson.dueDate && (
                                  <span className={new Date(lesson.dueDate) < new Date() ? "text-orange-500" : ""}>
                                    Due {new Date(lesson.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-primary"><Play className="size-4" /></div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {flatLessons.length > 0 && (
              <div className="curriculum-section">
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-medium text-muted-foreground">Other lessons</span>
                </div>
                <div className="space-y-2">
                  {flatLessons.map((lesson) => {
                    const done = completedLessonIds.has(lesson.id);
                    const active = selectedId === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedId(lesson.id)}
                        className={`lesson-card w-full text-left ${done ? "completed" : ""} ${active ? "ring-1 ring-primary/60" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{lesson.order || 0}</span>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {lesson.title}
                                {done && <CheckCircle2 className="size-4 text-primary" />}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {lesson.durationMin && <span>{lesson.durationMin} min • {lesson.type}</span>}
                                {lesson.dueDate && (
                                  <span className={new Date(lesson.dueDate) < new Date() ? "text-orange-500" : ""}>
                                    Due {new Date(lesson.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-primary"><Play className="size-4" /></div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          flatLessons.map((lesson) => {
            const done = completedLessonIds.has(lesson.id);
            const active = selectedId === lesson.id;
            return (
              <button key={lesson.id} onClick={() => setSelectedId(lesson.id)} className={`lesson-card w-full text-left ${done ? "completed" : ""} ${active ? "ring-1 ring-primary/60" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{lesson.order || 0}</span>
                    <div>
                      <div className="font-medium flex items-center gap-2">{lesson.title} {done && <CheckCircle2 className="size-4 text-primary" />}</div>
                      {lesson.durationMin && <div className="text-xs text-muted-foreground">{lesson.durationMin} min • {lesson.type}</div>}
                    </div>
                  </div>
                  <Play className="size-4 text-primary" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* The delightful player + notes + community experience */}
      {selectedLesson && (
        <div ref={playerRef} className="rounded-3xl border border-primary/20 bg-card p-2 shadow-xl">
          <div className="p-4">
            <LessonViewer
              lesson={selectedLesson}
              tenantSlug={tenantSlug}
              courseSlug={courseSlug}
              courseId={courseId}
              initialNote={initialNotes[selectedLesson.id]}
              initialBookmarks={initialBookmarks[selectedLesson.id] || []}
              isCompleted={completedLessonIds.has(selectedLesson.id)}
              onComplete={() => {
                // simple reload for progress update (or parent revalidate in future)
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}

      {!selectedLesson && enrolled && (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Click any lesson above to open the premium player, take notes, bookmark moments, and join the discussion.
        </div>
      )}
    </div>
  );
}
