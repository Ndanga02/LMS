"use client";

import { useState } from "react";
import { saveSubmissionAction } from "@/app/actions/assignments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Clock, FileUp, Send, CheckCircle2, AlertCircle } from "lucide-react";

type Submission = {
  id: string;
  textContent: string | null;
  fileUrls: string[];
  status: string;
  submittedAt: string | null;
  grade: { score: number; passed: boolean; feedback: string | null; gradedAt: string } | null;
} | null;

type Props = {
  lessonId: string;
  lessonTitle: string;
  dueDate: string | null;
  initialSubmission: Submission;
  tenantSlug: string;
  courseSlug: string;
};

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  DRAFT: { label: "Draft", class: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  SUBMITTED: { label: "Submitted", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  LATE: { label: "Late", class: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  GRADED: { label: "Graded", class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

export function AssignmentSubmission({
  lessonId,
  lessonTitle,
  dueDate,
  initialSubmission,
  tenantSlug,
  courseSlug,
}: Props) {
  const [textContent, setTextContent] = useState(initialSubmission?.textContent ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState(initialSubmission);

  const isSubmitted = submission && ["SUBMITTED", "LATE", "GRADED"].includes(submission.status);
  const isLate = dueDate ? new Date(dueDate) < new Date() : false;

  async function handleSave(submit: boolean) {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("lessonId", lessonId);
      fd.set("textContent", textContent);
      fd.set("submit", String(submit));
      await saveSubmissionAction(tenantSlug, fd);
      setSubmission((prev) =>
        prev
          ? { ...prev, textContent, status: submit ? (isLate ? "LATE" : "SUBMITTED") : "DRAFT", submittedAt: submit ? new Date().toISOString() : prev.submittedAt }
          : { id: "", textContent, fileUrls: [], status: submit ? (isLate ? "LATE" : "SUBMITTED") : "DRAFT", submittedAt: submit ? new Date().toISOString() : null, grade: null },
      );
      toast.success(submit ? "Assignment submitted" : "Draft saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-serif">
          <FileUp className="size-5 text-primary" />
          Assignment: {lessonTitle}
        </CardTitle>
        {dueDate && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            {isLate ? (
              <span className="text-orange-600 dark:text-orange-400">
                Due was {new Date(dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            ) : (
              <span>
                Due {new Date(dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {submission?.grade ? (
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium">Grade</span>
              <Badge variant={submission.grade.passed ? "default" : "destructive"} className="text-sm px-2 py-0.5">
                {submission.grade.score}%
              </Badge>
            </div>
            {submission.grade.feedback && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="font-medium">Feedback: </span>
                {submission.grade.feedback}
              </div>
            )}
          </div>
        ) : null}

        {submission?.status ? (
          <div className="flex items-center gap-2">
            <Badge className={STATUS_BADGES[submission.status]?.class ?? ""}>
              {STATUS_BADGES[submission.status]?.label ?? submission.status}
            </Badge>
            {submission.submittedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(submission.submittedAt).toLocaleString()}
              </span>
            )}
          </div>
        ) : null}

        {isSubmitted ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4" />
              Assignment submitted
            </div>
            <p className="mt-1 text-green-600 dark:text-green-400">
              {submission?.grade ? "Your instructor has graded this submission." : "Your instructor will review and grade your submission."}
            </p>
          </div>
        ) : (
          <>
            <Textarea
              placeholder="Write your answer or attach a note for your instructor..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={6}
              className="min-h-[120px] resize-y"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={submitting}
              >
                Save Draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={submitting || !textContent.trim()}
              >
                <Send className="mr-1.5 size-4" />
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
