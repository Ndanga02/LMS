"use client";

import { useState } from "react";
import { gradeSubmissionAction } from "@/app/actions/assignments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, Clock, User } from "lucide-react";

type Submission = {
  id: string;
  textContent: string | null;
  fileUrls: string[];
  status: string;
  submittedAt: Date | null;
  user: { id: string; name: string | null; email: string; image: string | null };
  grade: { score: number; passed: boolean; feedback: string | null; gradedAt: Date } | null;
};

type Props = {
  lessonId: string;
  initialSubmissions: Submission[];
  tenantSlug: string;
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  LATE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  GRADED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export function SubmissionGrader({ lessonId, initialSubmissions, tenantSlug }: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions);

  async function handleGrade(studentId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("lessonId", lessonId);
    fd.set("studentId", studentId);

    try {
      await gradeSubmissionAction(tenantSlug, fd);
      const score = parseInt(fd.get("score") as string);
      const feedback = fd.get("feedback")?.toString() || null;
      setSubmissions((prev) =>
        prev.map((s) =>
          s.user.id === studentId
            ? { ...s, status: "GRADED" as const, grade: { score, passed: score >= 60, feedback, gradedAt: new Date() } }
            : s,
        ),
      );
      toast.success("Grade saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to grade");
    }
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No submissions yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <Card key={submission.id} className="border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarImage src={submission.user.image ?? undefined} />
                  <AvatarFallback>
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {submission.user.name || submission.user.email}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "Not submitted"}
                  </div>
                </div>
              </div>
              <Badge className={STATUS_COLORS[submission.status] ?? ""}>
                {submission.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {submission.textContent && (
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {submission.textContent}
              </div>
            )}

            {submission.grade ? (
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span className="font-medium">Graded: {submission.grade.score}%</span>
                  {submission.grade.feedback && (
                    <span className="text-xs text-muted-foreground">— {submission.grade.feedback}</span>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleGrade(submission.user.id, e)} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    name="score"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Score (0–100)"
                    required
                    className="w-28"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <Button type="submit" size="sm">
                    Grade
                  </Button>
                </div>
                <Textarea
                  name="feedback"
                  placeholder="Optional feedback..."
                  rows={2}
                  className="resize-y text-sm"
                />
              </form>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
