"use client";

import { useTransition, useState, useOptimistic, startTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, ExternalLink, Loader2 } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { addResourceAction, deleteResourceAction } from "@/app/actions/resources";

type Resource = {
  id: string;
  title: string;
  url: string;
  type: string | null;
  order: number;
};

type Props = {
  tenantSlug: string;
  lessonId: string;
  initialResources: Resource[];
};

export function ResourceManager({ tenantSlug, lessonId, initialResources }: Props) {
  const [isPending, startTransition] = useTransition();
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("pdf");

  const handleAddByUrl = () => {
    if (!title.trim() || !url.trim()) return;

    const fd = new FormData();
    fd.append("lessonId", lessonId);
    fd.append("title", title.trim());
    fd.append("url", url.trim());
    fd.append("type", type);

    startTransition(async () => {
      try {
        await addResourceAction(tenantSlug, fd);
        toast.success("Resource added");
        setTitle("");
        setUrl("");
        setShowForm(false);
        window.location.reload();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add resource";
        toast.error("Error", { description: message });
      }
    });
  };

  const handleUploadComplete = (fileUrl: string, filename: string) => {
    setUrl(fileUrl);
    setTitle(filename.replace(/\.[^/.]+$/, ""));
  };

  const handleDelete = (resourceId: string) => {
    const fd = new FormData();
    fd.append("resourceId", resourceId);

    startTransition(async () => {
      try {
        await deleteResourceAction(tenantSlug, fd);
        setResources((prev) => prev.filter((r) => r.id !== resourceId));
        toast.success("Resource removed");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete resource";
        toast.error("Error", { description: message });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Resources ({resources.length})</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add resource"}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <Label className="text-xs">Resource type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
            >
              <option value="pdf">PDF</option>
              <option value="zip">ZIP / Archive</option>
              <option value="link">External Link</option>
              <option value="code">Code File</option>
              <option value="other">Other</option>
            </select>
          </div>

          {type === "link" ? (
            <>
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" />
              </div>
              <div>
                <Label className="text-xs">URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              </div>
              <Button size="sm" onClick={handleAddByUrl} disabled={isPending || !title || !url}>
                {isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                Add
              </Button>
            </>
          ) : (
            <>
              <FileUpload
                label={`Upload ${type.toUpperCase()} file`}
                accept={
                  type === "pdf"
                    ? ".pdf"
                    : type === "zip"
                      ? ".zip"
                      : type === "code"
                        ? ".py,.js,.ts,.jsx,.tsx,.css,.html,.sql"
                        : ".pdf,.zip,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
                }
                onUploadComplete={handleUploadComplete}
              />
              {url && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" />
                  </div>
                  <Button size="sm" onClick={handleAddByUrl} disabled={isPending || !title}>
                    {isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                    Attach to lesson
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {resources.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground">No resources attached to this lesson.</p>
      )}

      <div className="space-y-1">
        {resources.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="size-1.5 rounded-full bg-primary shrink-0" />
              <span className="truncate">{r.title}</span>
              {r.type && (
                <span className="text-[10px] uppercase text-muted-foreground shrink-0">{r.type}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={r.url.startsWith("http") ? r.url : `/api/v1/files/${r.url}`}
                target="_blank"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3.5" />
              </a>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
