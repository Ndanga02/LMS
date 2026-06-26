"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type Props = {
  name: string;
  value?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
};

export function MarkdownEditor({ name, value, placeholder, rows = 12, disabled }: Props) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPreview(false)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            !preview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            preview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Preview
        </button>
      </div>
      {preview ? (
        <div className="min-h-[200px] rounded-lg border bg-card p-4">
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview</p>
          )}
        </div>
      ) : (
        <Textarea
          name={name}
          defaultValue={value}
          placeholder={placeholder ?? "Write markdown content..."}
          rows={rows}
          disabled={disabled}
          className="font-mono text-sm"
        />
      )}
    </div>
  );
}
