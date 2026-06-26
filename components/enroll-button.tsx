"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enrollInCourseAction } from "@/app/actions/enrollment";
import { Loader2 } from "lucide-react";

type EnrollButtonProps = {
  tenantSlug: string;
  courseSlug: string;
  priceCents: number;
  className?: string;
  children?: React.ReactNode;
};

export function EnrollButton({
  tenantSlug,
  courseSlug,
  priceCents,
  className,
  children,
}: EnrollButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleEnroll = () => {
    const formData = new FormData();
    // The server action expects to be called directly with bind or reads params differently.
    // Since enrollInCourseAction takes (tenantSlug, courseSlug) and internally uses formData for callback, 
    // we call it via a wrapper that matches the expected form action pattern.
    // For client transition we invoke the action directly (it accepts the bound style internally).

    startTransition(async () => {
      try {
        // We simulate the form submission the action expects.
        // The current enrollInCourseAction reads tenant/course from closure in bind usage.
        // To make it callable from client we call the server action function.
        await enrollInCourseAction(tenantSlug, courseSlug);
        // If it redirects inside the action we may not reach here, but toast on success path.
        toast.success(
          priceCents > 0 ? "Purchase recorded" : "Enrolled successfully",
          {
            description: "You now have access to the course content.",
          }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Enrollment failed";
        toast.error("Could not enroll", {
          description: message,
        });
      }
    });
  };

  return (
    <Button
      onClick={handleEnroll}
      disabled={isPending}
      className={className}
      size="lg"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          {priceCents > 0 ? "Processing..." : "Enrolling..."}
        </>
      ) : (
        children || (priceCents > 0 ? "Purchase now" : "Enroll now")
      )}
    </Button>
  );
}
