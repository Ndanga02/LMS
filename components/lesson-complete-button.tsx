"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markLessonCompleteAction } from "@/app/actions/progress";
import { CheckCircle2, Loader2 } from "lucide-react";

type LessonCompleteButtonProps = {
  tenantSlug: string;
  courseSlug: string;
  lessonId: string;
  className?: string;
};

export function LessonCompleteButton({
  tenantSlug,
  courseSlug,
  lessonId,
  className,
}: LessonCompleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleComplete = () => {
    const formData = new FormData();
    formData.append("tenantSlug", tenantSlug);
    formData.append("courseSlug", courseSlug);
    formData.append("lessonId", lessonId);

    startTransition(async () => {
      try {
        await markLessonCompleteAction(formData);
        toast.success("Lesson marked complete", {
          description: "Your progress has been updated.",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to mark complete";
        toast.error("Could not update progress", {
          description: message,
        });
      }
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleComplete}
      disabled={isPending}
      className={className}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          Saving...
        </>
      ) : (
        "Mark complete"
      )}
    </Button>
  );
}
