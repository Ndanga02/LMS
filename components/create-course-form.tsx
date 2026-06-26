"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/markdown-editor";
import { createCourseAction } from "@/app/actions/course";
import { Loader2 } from "lucide-react";

type CreateCourseFormProps = {
  tenantSlug: string;
};

export function CreateCourseForm({ tenantSlug }: CreateCourseFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createCourseAction(tenantSlug, formData);
        toast.success("Course created");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create course";
        toast.error("Create course failed", { description: message });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Introduction to TypeScript" required disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="slug">Slug (URL friendly)</Label>
        <Input id="slug" name="slug" placeholder="intro-to-typescript" required pattern="[a-z0-9-]+" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="priceCents">Price (cents, 0 = free)</Label>
        <Input id="priceCents" name="priceCents" type="number" defaultValue="0" min="0" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="level">Level</Label>
        <select id="level" name="level" className="w-full rounded-md border bg-background p-2 text-sm" disabled={isPending}>
          <option value="ALL_LEVELS">All Levels</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" className="w-full rounded-md border bg-background p-2 text-sm" disabled={isPending}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>
      <div className="flex items-end gap-2">
        <input type="checkbox" id="isMarketplaceListed" name="isMarketplaceListed" className="h-4 w-4" disabled={isPending} />
        <Label htmlFor="isMarketplaceListed" className="text-sm">List on main marketplace (if platform tenant)</Label>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="description">Description (markdown supported)</Label>
        <MarkdownEditor name="description" placeholder="Course overview with markdown..." rows={6} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="whatYouWillLearn">What You Will Learn (one per line)</Label>
        <Textarea id="whatYouWillLearn" name="whatYouWillLearn" placeholder="Understand multi-tenancy&#10;Build streaks and earn badges" rows={3} disabled={isPending} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="requirements">Requirements (one per line)</Label>
        <Textarea id="requirements" name="requirements" placeholder="Basic JavaScript knowledge&#10;Computer with internet" rows={2} disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input id="tags" name="tags" placeholder="typescript, beginner, web" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" placeholder="Programming" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
        <Input id="thumbnailUrl" name="thumbnailUrl" placeholder="https://..." disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="estimatedDurationMin">Est. Duration (min)</Label>
        <Input id="estimatedDurationMin" name="estimatedDurationMin" type="number" placeholder="120" disabled={isPending} />
      </div>
      <div className="flex items-end gap-2">
        <input type="checkbox" id="isFeatured" name="isFeatured" className="h-4 w-4" disabled={isPending} />
        <Label htmlFor="isFeatured" className="text-sm">Featured (platform only)</Label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Course"
          )}
        </Button>
      </div>
    </form>
  );
}
