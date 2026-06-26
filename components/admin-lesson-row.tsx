"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateLessonAction, deleteLessonAction } from "@/app/actions/lesson";
import { Loader2 } from "lucide-react";

type LessonRowProps = {
  tenantSlug: string;
  lesson: {
    id: string;
    title: string;
    slug: string;
    isPublished: boolean;
    type?: string;
  };
};

export function AdminLessonRow({ tenantSlug, lesson }: LessonRowProps) {
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startUpdateTransition(async () => {
      try {
        await updateLessonAction(tenantSlug, formData);
        toast.success("Lesson updated");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Update failed";
        toast.error("Failed to update lesson", { description: message });
      }
    });
  };

  const handleDelete = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirm(`Delete lesson "${lesson.title}"? This cannot be undone.`)) return;

    const formData = new FormData(e.currentTarget);

    startDeleteTransition(async () => {
      try {
        await deleteLessonAction(tenantSlug, formData);
        toast.success("Lesson deleted");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Delete failed";
        toast.error("Failed to delete lesson", { description: message });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border bg-muted/30 p-2 text-xs">
      <span className="flex-1 font-medium truncate min-w-0">
        {lesson.title} {!lesson.isPublished && <span className="text-amber-600">(draft)</span>}
        {lesson.type && <span className="ml-1 text-[9px] uppercase tracking-widest text-muted-foreground/70">· {lesson.type}</span>}
      </span>

      <form onSubmit={handleUpdate} className="flex flex-wrap items-center gap-1">
        <input type="hidden" name="lessonId" value={lesson.id} />
        <Input
          name="title"
          placeholder="New title"
          defaultValue=""
          className="h-6 w-28 text-xs"
        />
        <Input
          name="slug"
          placeholder="new-slug"
          defaultValue=""
          className="h-6 w-20 text-xs"
          pattern="[a-z0-9-]+"
        />
        <Input
          name="videoUrl"
          placeholder="video url"
          defaultValue=""
          className="h-6 w-32 text-xs"
        />
        <select name="type" defaultValue={lesson.type || "VIDEO"} className="h-6 rounded border bg-background px-1 text-[10px]">
          <option value="VIDEO">VIDEO</option>
          <option value="TEXT">TEXT</option>
          <option value="QUIZ">QUIZ</option>
          <option value="FILE">FILE</option>
          <option value="ASSIGNMENT">ASSIGNMENT</option>
        </select>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px]"
          disabled={isUpdatePending}
        >
          {isUpdatePending ? <Loader2 className="size-3 animate-spin" /> : "Update"}
        </Button>
      </form>

      <form onSubmit={handleDelete}>
        <input type="hidden" name="lessonId" value={lesson.id} />
        <Button
          type="submit"
          size="sm"
          variant="destructive"
          className="h-6 px-2 text-[10px]"
          disabled={isDeletePending}
        >
          {isDeletePending ? <Loader2 className="size-3 animate-spin" /> : "Delete"}
        </Button>
      </form>
    </div>
  );
}
