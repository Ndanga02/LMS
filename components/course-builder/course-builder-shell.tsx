"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { Plus, CheckSquare, Square, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DraggableSection } from "@/components/course-builder/draggable-section";
import {
  reorderSectionsAction,
  reorderLessonsAction,
  createSectionAction,
  updateSectionAction,
  deleteSectionAction,
  bulkPublishLessonsAction,
  bulkDeleteLessonsAction,
} from "@/app/actions/course-builder";

type LessonType = "VIDEO" | "TEXT" | "QUIZ" | "FILE" | "ASSIGNMENT";

type Lesson = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  type: LessonType;
  durationMin: number | null;
};

type Section = {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
};

type CourseBuilderShellProps = {
  tenantSlug: string;
  courseSlug: string;
  courseTitle: string;
  sections: Section[];
  ungroupedLessons: Lesson[];
};

export function CourseBuilderShell({
  tenantSlug,
  courseSlug,
  courseTitle,
  sections: initialSections,
  ungroupedLessons: initialUngrouped,
}: CourseBuilderShellProps) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [ungroupedLessons, setUngroupedLessons] = useState(initialUngrouped);
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const allLessonIds = [
    ...ungroupedLessons.map((l) => l.id),
    ...sections.flatMap((s) => s.lessons.map((l) => l.id)),
  ];

  const toggleSelectAll = useCallback(() => {
    if (selectedLessons.size === allLessonIds.length && allLessonIds.length > 0) {
      setSelectedLessons(new Set());
    } else {
      setSelectedLessons(new Set(allLessonIds));
    }
  }, [selectedLessons, allLessonIds]);

  const handleSelectLesson = useCallback((id: string, checked: boolean) => {
    setSelectedLessons((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const findSectionByLesson = (lessonId: string): string | null => {
    for (const section of sections) {
      if (section.lessons.some((l) => l.id === lessonId)) return section.id;
    }
    return null;
  };

  const handleSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);

    await reorderSectionsAction(
      tenantSlug,
      courseSlug,
      reordered.map((s) => s.id),
    );
    router.refresh();
  };

  const handleLessonDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sourceSectionId = findSectionByLesson(active.id as string);
    const targetSectionId = findSectionByLesson(over.id as string);

    if (sourceSectionId !== targetSectionId) return;

    const section = sections.find((s) => s.id === sourceSectionId);
    if (!section) return;

    const oldIndex = section.lessons.findIndex((l) => l.id === active.id);
    const newIndex = section.lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(section.lessons, oldIndex, newIndex);

    setSections((prev) =>
      prev.map((s) => (s.id === sourceSectionId ? { ...s, lessons: reordered } : s)),
    );

    await reorderLessonsAction(tenantSlug, courseSlug, sourceSectionId, reordered.map((l) => l.id));
    router.refresh();
  };

  const handleRenameSection = async (sectionId: string, title: string) => {
    const formData = new FormData();
    formData.set("sectionId", sectionId);
    formData.set("title", title);
    await updateSectionAction(tenantSlug, courseSlug, formData);
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s)),
    );
    router.refresh();
  };

  const handleDeleteSection = async (sectionId: string) => {
    const formData = new FormData();
    formData.set("sectionId", sectionId);

    const section = sections.find((s) => s.id === sectionId);
    if (section && section.lessons.length > 0) {
      setUngroupedLessons((prev) => [...prev, ...section.lessons]);
    }

    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    await deleteSectionAction(tenantSlug, courseSlug, formData);
    router.refresh();
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("title", newSectionTitle);
    await createSectionAction(tenantSlug, courseSlug, formData);
    setNewSectionTitle("");
    setIsSubmitting(false);
    router.refresh();
  };

  const handleBulkAction = async (action: "publish" | "unpublish" | "delete") => {
    if (selectedLessons.size === 0) return;
    setIsSubmitting(true);

    const formData = new FormData();
    selectedLessons.forEach((id) => formData.append("lessonId", id));

    if (action === "publish" || action === "unpublish") {
      formData.set("publish", action === "publish" ? "true" : "false");
      await bulkPublishLessonsAction(tenantSlug, courseSlug, formData);
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          lessons: s.lessons.map((l) =>
            selectedLessons.has(l.id) ? { ...l, isPublished: action === "publish" } : l,
          ),
        })),
      );
      setUngroupedLessons((prev) =>
        prev.map((l) =>
          selectedLessons.has(l.id) ? { ...l, isPublished: action === "publish" } : l,
        ),
      );
    } else {
      await bulkDeleteLessonsAction(tenantSlug, courseSlug, formData);
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          lessons: s.lessons.filter((l) => !selectedLessons.has(l.id)),
        })),
      );
      setUngroupedLessons((prev) => prev.filter((l) => !selectedLessons.has(l.id)));
    }

    setSelectedLessons(new Set());
    setIsSubmitting(false);
    router.refresh();
  };

  const allSectionIds = sections.map((s) => s.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">{courseTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {sections.length} sections · {allLessonIds.length} lessons
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={`/t/${tenantSlug}/courses/${courseSlug}`}>Preview course</a>
        </Button>
      </div>

      {allLessonIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            className="gap-1.5"
          >
            {selectedLessons.size === allLessonIds.length && allLessonIds.length > 0 ? (
              <Square className="size-4" />
            ) : (
              <CheckSquare className="size-4" />
            )}
            {selectedLessons.size > 0
              ? `${selectedLessons.size} selected`
              : "Select all"}
          </Button>
          {selectedLessons.size > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction("publish")}
                disabled={isSubmitting}
                className="gap-1.5 text-green-600"
              >
                <Eye className="size-4" /> Publish
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction("unpublish")}
                disabled={isSubmitting}
                className="gap-1.5 text-muted-foreground"
              >
                <EyeOff className="size-4" /> Unpublish
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction("delete")}
                disabled={isSubmitting}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext items={allSectionIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {sections.map((section) => (
              <DraggableSection
                key={section.id}
                tenantSlug={tenantSlug}
                courseSlug={courseSlug}
                section={section}
                selectedLessons={selectedLessons}
                onSelectLesson={handleSelectLesson}
                onLessonDragEnd={handleLessonDragEnd}
                onRename={handleRenameSection}
                onDelete={handleDeleteSection}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {ungroupedLessons.length > 0 && (
        <div className="rounded-xl border border-dashed border-primary/20 bg-muted/20 p-4">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Ungrouped lessons ({ungroupedLessons.length})
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            These lessons are not assigned to any section. Move them into a section or create a new one.
          </p>
          <div className="space-y-1.5">
            {ungroupedLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <div className="flex-1 truncate font-medium">{lesson.title}</div>
                <span className="text-xs text-muted-foreground">{lesson.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
          placeholder="New section title..."
          className="max-w-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddSection();
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAddSection}
          disabled={!newSectionTitle.trim() || isSubmitting}
        >
          <Plus className="size-4" /> Add section
        </Button>
      </div>
    </div>
  );
}
