"use client";

import { useT } from "@/lib/i18n/locale-provider";

type Attempt = {
  id: string;
  passed: boolean;
  score: number | null;
  completedAt: Date;
  quiz: { lesson: { title: string } };
};

type Props = {
  total: number;
  passed: number;
  avgScore: number;
  recentAttempts: Attempt[];
};

export function StudentQuizCard({ total, passed, avgScore, recentAttempts }: Props) {
  const t = useT();

  if (total === 0) {
    return <p className="py-4 text-sm text-muted-foreground">{t("common.noData")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-2xl font-semibold tabular-nums">{avgScore}%</p>
          <p className="text-xs text-muted-foreground">{t("analytics.avgScore")}</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-2xl font-semibold tabular-nums">{passed}/{total}</p>
          <p className="text-xs text-muted-foreground">{t("analytics.quizzesPassed")}</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-2xl font-semibold tabular-nums">
            {total > 0 ? Math.round((passed / total) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground">{t("analyticsIns.quizPassRate")}</p>
        </div>
      </div>

      {recentAttempts.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Recent attempts</p>
          {recentAttempts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-xs">
              <span className="truncate font-medium">{a.quiz.lesson.title}</span>
              <span className={a.passed ? "text-green-600" : "text-destructive"}>
                {a.score ?? "—"}% {a.passed ? "✓" : "✗"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
