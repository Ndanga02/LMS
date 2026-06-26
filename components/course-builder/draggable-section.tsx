"use client";

import { useState } from "react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronRight, Plus, Pencil, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DraggableLesson } from "@/components/course-builder/draggable-lesson";
import type { LessonType } from "@/lib/generated/prisma";

type Lesson = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  type: LessonType;
  durationMin: number | null;
};

type DraggableSectionProps = {
  tenantSlug: string;
  courseSlug: string;
  section: {
    id: string;
    title: string;
    order: number;
    lessons: Lesson[];
  };
  selectedLessons: Set<string>;
  onSelectLesson: (id: string, checked: boolean) => void;
  onLessonDragEnd: (event: DragEndEvent) => void;
  onRename: (sectionId: string, title: string) => void;
  onDelete: (sectionId: string) => void;
};

export function DraggableSection({
  tenantSlug,
  courseSlug,
  section,
  selectedLessons,
  onSelectLesson,
  onLessonDragEnd,
  onRename,
  onDelete,
}: DraggableSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== section.title) {
      onRename(section.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const lessonIds = section.lessons.map((l) => l.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border bg-card"
    >
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <button
          {...attributes}
          {...listeners}
          className="touch-none text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder section"
        >
          <GripVertical className="size-4" />
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <Layers className="size-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setEditTitle(section.title);
                  setIsEditing(false);
                }
              }}
              className="h-7 text-sm"
              autoFocus
            />
          ) : (
            <span className="text-sm font-medium">{section.title}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{section.lessons.length} lessons</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setIsEditing(true)}
          title="Rename section"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(section.id)}
          title="Delete section"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {isOpen && (
        <div className="p-2">
          {section.lessons.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No lessons. Add one using the form above.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onLessonDragEnd}
            >
              <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {section.lessons.map((lesson) => (
                    <DraggableLesson
                      key={lesson.id}
                      tenantSlug={tenantSlug}
                      courseSlug={courseSlug}
                      lesson={lesson}
                      isSelected={selectedLessons.has(lesson.id)}
                      onSelect={onSelectLesson}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}
