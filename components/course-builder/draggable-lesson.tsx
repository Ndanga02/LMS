"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CheckCircle2, Eye, EyeOff, FileType, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { LessonType } from "@/lib/generated/prisma";

type DraggableLessonProps = {
  tenantSlug: string;
  courseSlug: string;
  lesson: {
    id: string;
    title: string;
    slug: string;
    isPublished: boolean;
    type: LessonType;
    durationMin: number | null;
  };
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
};

export function DraggableLesson({ tenantSlug, courseSlug, lesson, isSelected, onSelect }: DraggableLessonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-accent/30 data-[state=selected]:border-primary/40 data-[state=selected]:bg-primary/5"
      data-state={isSelected ? "selected" : undefined}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelect(lesson.id, checked === true)}
        className="shrink-0"
      />
      <button
        {...attributes}
        {...listeners}
        className="touch-none text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <span className="truncate font-medium">{lesson.title}</span>
        <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
          {lesson.type}
        </Badge>
        {lesson.durationMin && (
          <span className="shrink-0 text-xs text-muted-foreground">{lesson.durationMin}m</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" className="size-7" asChild>
          <Link
            href={`/t/${tenantSlug}/admin/courses/${courseSlug}/lessons/${lesson.id}/edit`}
            title="Edit lesson"
          >
            <Pencil className="size-3.5" />
          </Link>
        </Button>
        {lesson.isPublished ? (
          <Eye className="size-3.5 text-green-500" />
        ) : (
          <EyeOff className="size-3.5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
