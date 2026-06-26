"use client";

import { useTransition, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/markdown-editor";
import { addLessonAction, createMuxUploadUrlAction, checkMuxUploadAction } from "@/app/actions/lesson";
import { Loader2, Upload } from "lucide-react";

type AddLessonFormProps = {
  tenantSlug: string;
  courses: Array<{ id: string; title: string; slug: string }>;
};

export function AddLessonForm({ tenantSlug, courses }: AddLessonFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"" | "uploading" | "processing" | "done" | "error">("");
  const [videoUrl, setVideoUrl] = useState("");
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await addLessonAction(tenantSlug, formData);
        toast.success("Lesson added");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add lesson";
        toast.error("Add lesson failed", { description: message });
      }
    });
  };

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (xhrRef.current) xhrRef.current.abort();
    xhrRef.current = null;
    pollRef.current = null;
    setIsUploading(false);
  }, []);

  const handleMuxUpload = (file: File) => {
    if (!file) return;
    cleanup();

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("uploading");

    let uploadId: string | null = null;

    // Step 1: get upload URL
    createMuxUploadUrlAction()
      .then(({ uploadUrl, uploadId: id }) => {
        if (!uploadUrl) throw new Error("No upload URL");
        uploadId = id ?? null;

        // Step 2: upload with XHR for accurate progress
        return new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(pct);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Upload network error")));
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
          xhr.send(file);
        });
      })
      .then(() => {
        setUploadProgress(100);
        setUploadStatus("processing");
        toast.success("Upload complete! Waiting for Mux to process...");

        // Step 3: poll for playback ID
        if (!uploadId) {
          setUploadStatus("done");
          setIsUploading(false);
          toast.info("No upload ID returned. Paste the Mux Playback ID manually.");
          return;
        }

        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const result = await checkMuxUploadAction(uploadId!);
            if (result?.playbackId) {
              if (pollRef.current) clearInterval(pollRef.current);
              setVideoUrl(result.playbackId);
              setUploadStatus("done");
              setIsUploading(false);
              toast.success("Video ready! Playback ID filled in.");
            }
          } catch { /* keep polling */ }
          if (attempts >= 20) {
            if (pollRef.current) clearInterval(pollRef.current);
            toast.info("Still processing on Mux. You can paste the Playback ID from your Mux dashboard.");
            setUploadStatus("done");
            setIsUploading(false);
          }
        }, 6000);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Mux upload failed";
        toast.error("Upload failed", { description: message });
        setUploadStatus("error");
        setIsUploading(false);
      });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="lesson-courseId">Course</Label>
        <select id="lesson-courseId" name="courseId" className="w-full rounded-md border bg-background p-2 text-sm" required disabled={isPending}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title} ({c.slug})</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="lesson-title">Lesson Title</Label>
        <Input id="lesson-title" name="title" placeholder="Welcome to the course" required disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="lesson-slug">Slug</Label>
        <Input id="lesson-slug" name="slug" placeholder="welcome" required pattern="[a-z0-9-]+" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="lesson-type">Type</Label>
        <select id="lesson-type" name="type" className="w-full rounded-md border bg-background p-2 text-sm" disabled={isPending}>
          <option value="VIDEO">Video</option>
          <option value="TEXT">Text / Article</option>
          <option value="QUIZ">Quiz</option>
          <option value="FILE">File / Download</option>
          <option value="ASSIGNMENT">Assignment</option>
        </select>
      </div>
      <div>
        <Label htmlFor="lesson-videoUrl">Video URL or Mux Playback ID (for VIDEO type)</Label>
        <Input
          id="lesson-videoUrl"
          name="videoUrl"
          placeholder="https://stream.mux.com/abc123.m3u8 or paste Mux ID"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          disabled={isPending}
        />
        <div className="mt-2 space-y-1">
          <Label className="text-xs">Or upload directly to Mux (recommended for adaptive video)</Label>
          <div className="flex items-center gap-2">
            <label
              className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                isUploading ? "cursor-not-allowed opacity-50" : "hover:bg-accent"
              }`}
            >
              <Upload className="size-3.5" />
              {isUploading ? "Uploading..." : "Choose video"}
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleMuxUpload(file);
                  e.target.value = "";
                }}
                disabled={isUploading || isPending}
                className="hidden"
              />
            </label>
            {uploadStatus === "uploading" && (
              <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
            )}
            {uploadStatus === "processing" && (
              <span className="text-xs text-amber-500">Processing on Mux...</span>
            )}
            {uploadStatus === "done" && (
              <span className="text-xs text-green-600">Ready</span>
            )}
            {uploadStatus === "error" && (
              <span className="text-xs text-destructive">Failed</span>
            )}
          </div>
          {uploadStatus === "uploading" && (
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="lesson-durationMin">Duration (minutes, optional)</Label>
        <Input id="lesson-durationMin" name="durationMin" type="number" min="1" placeholder="10" disabled={isPending} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="lesson-content">Content / Description</Label>
        <MarkdownEditor name="content" placeholder="Write lesson content using markdown..." disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="lesson-dueDate">Due Date (optional)</Label>
        <Input id="lesson-dueDate" name="dueDate" type="datetime-local" disabled={isPending} />
      </div>
      <div>
        <Label htmlFor="lesson-sectionTitle">Section (optional — creates if new)</Label>
        <Input id="lesson-sectionTitle" name="sectionTitle" placeholder="Module 1: Basics" disabled={isPending} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="lesson-isPublished" name="isPublished" defaultChecked className="h-4 w-4" disabled={isPending} />
        <Label htmlFor="lesson-isPublished" className="text-sm">Published immediately</Label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" disabled={isPending || isUploading}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Lesson"
          )}
        </Button>
        <span className="ml-3 text-xs text-muted-foreground">Lessons will appear in the course curriculum for enrolled students.</span>
      </div>
    </form>
  );
}
