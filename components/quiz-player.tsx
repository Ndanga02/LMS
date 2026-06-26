"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitQuizAttemptAction } from "@/app/actions/retention";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  order: number;
};

type QuizPlayerProps = {
  quizId: string;
  lessonId: string;
  questions: QuizQuestion[];
  tenantSlug: string;
  courseSlug: string;
  passingScore?: number;
  onPassed?: () => void;
};

export function QuizPlayer({ quizId, lessonId, questions, tenantSlug, courseSlug, passingScore = 66, onPassed }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const handleSelect = (qId: string, idx: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: idx }));
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSubmitting(true);

    const fd = new FormData();
    fd.append("quizId", quizId);
    fd.append("lessonId", lessonId);
    fd.append("answers", JSON.stringify(answers));
    fd.append("tenantSlug", tenantSlug);
    fd.append("courseSlug", courseSlug);

    try {
      const res = await submitQuizAttemptAction(fd);
      setResult(res);
      if (res.passed) {
        toast.success(`Passed with ${res.score}% — excellent!`, { description: "Achievement unlocked + lesson marked complete." });
        onPassed?.();
      } else {
        toast.error(`Score: ${res.score}% (need ${passingScore}%)`, { description: "Review and try again." });
      }
    } catch {
      toast.error("Quiz submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
          {result.passed ? <CheckCircle2 className="size-7 text-primary" /> : <XCircle className="size-7 text-amber-500" />}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{result.score}%</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {result.passed ? "You passed!" : `Passing score: ${passingScore}%`}
        </div>
        {result.passed && (
          <div className="mt-4 text-xs text-primary">Quiz Master achievement awarded. Keep the streak going!</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions
        .sort((a, b) => a.order - b.order)
        .map((q, qi) => (
          <div key={q.id} className="rounded-xl border p-4">
            <div className="mb-3 text-sm font-medium">
              {qi + 1}. {q.question}
            </div>
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(q.id, i)}
                  className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition ${answers[q.id] === i ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/60"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

      <Button onClick={handleSubmit} disabled={!allAnswered || submitting} className="w-full" size="lg">
        {submitting ? "Submitting..." : "Submit Answers"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Score {passingScore}% or higher to pass and earn credit.</p>
    </div>
  );
}
