"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/markdown-editor";
import { updateCourseAction } from "@/app/actions/course";
import { Loader2 } from "lucide-react";

type UpdateCourseFormProps = {
  tenantSlug: string;
  courses: Array<{ id: string; title: string; slug: string; priceCents: number; level: string; status: string; description?: string | null }>;
};

export function UpdateCourseForm({ tenantSlug, courses }: UpdateCourseFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateCourseAction(tenantSlug, formData);
        toast.success("Course updated");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update course";
        toast.error("Update failed", { description: message });
      }
    });
  };

  if (courses.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="border-t pt-4 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="edit-courseId">Select course to edit</Label>
        <select id="edit-courseId" name="courseId" className="w-full rounded-md border bg-background p-2 text-sm" required disabled={isPending}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="edit-title">New Title (leave blank to keep)</Label>
        <Input id="edit-title" name="title" placeholder="Updated title" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="edit-slug">New Slug</Label>
        <Input id="edit-slug" name="slug" placeholder="new-slug" pattern="[a-z0-9-]+" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="edit-priceCents">Price (cents)</Label>
        <Input id="edit-priceCents" name="priceCents" type="number" placeholder="0" min="0" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="edit-status">Status</Label>
        <select id="edit-status" name="status" className="w-full rounded-md border bg-background p-2 text-sm" disabled={isPending}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="edit-description">Description (markdown supported)</Label>
        <MarkdownEditor name="description" placeholder="Updated description..." rows={6} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="edit-whatYouWillLearn">What You Will Learn (one per line)</Label>
        <Textarea id="edit-whatYouWillLearn" name="whatYouWillLearn" placeholder="..." rows={2} disabled={isPending} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="edit-requirements">Requirements (one per line)</Label>
        <Textarea id="edit-requirements" name="requirements" placeholder="..." rows={1} disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="edit-tags">Tags (comma sep)</Label>
        <Input id="edit-tags" name="tags" placeholder="ts,web" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="edit-category">Category</Label>
        <Input id="edit-category" name="category" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="edit-thumbnailUrl">Thumbnail URL</Label>
        <Input id="edit-thumbnailUrl" name="thumbnailUrl" disabled={isPending} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Course"
          )}
        </Button>
      </div>
    </form>
  );
}
