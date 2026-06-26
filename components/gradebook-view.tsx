"use client";

import { useState } from "react";
import { quickGradeAction } from "@/app/actions/gradebook";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, CheckCircle2, AlertCircle, Clock } from "lucide-react";

type GradebookRow = {
  user: { id: string; name: string | null; email: string; image: string | null };
  enrolledAt: string;
  overallGrade: number | null;
  lessonGrades: {
    lessonId: string;
    lessonTitle: string;
    lessonType: string;
    dueDate: string | null;
    grade: { score: number; passed: boolean; feedback: string | null; gradedAt: string } | null;
    submission: { id: string; status: string; submittedAt: string | null } | null;
  }[];
};

type GradebookData = {
  course: { id: string; title: string; slug: string };
  gradableLessons: { id: string; title: string; type: string; dueDate: string | null; order: number }[];
  rows: GradebookRow[];
};

type Props = {
  gradebook: GradebookData;
  tenantSlug: string;
  courseSlug: string;
};

export function GradebookView({ gradebook, tenantSlug }: Props) {
  const [rows, setRows] = useState(gradebook.rows);
  const [saving, setSaving] = useState<string | null>(null);

  async function handleQuickGrade(studentId: string, lessonId: string, score: string) {
    if (!score) return;
    setSaving(`${studentId}_${lessonId}`);
    try {
      const fd = new FormData();
      fd.set("studentId", studentId);
      fd.set("lessonId", lessonId);
      fd.set("score", score);
      await quickGradeAction(tenantSlug, fd);
      const parsed = parseInt(score);
      setRows((prev) =>
        prev.map((row) =>
          row.user.id === studentId
            ? {
                ...row,
                lessonGrades: row.lessonGrades.map((lg) =>
                  lg.lessonId === lessonId
                    ? { ...lg, grade: { score: parsed, passed: parsed >= 60, feedback: null, gradedAt: new Date().toISOString() } }
                    : lg,
                ),
              }
            : row,
        ),
      );
      toast.success("Grade saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to grade");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted/50 p-3 font-medium">Student</th>
            {gradebook.gradableLessons.map((lesson) => (
              <th key={lesson.id} className="min-w-[120px] p-3 font-medium">
                <div className="truncate max-w-[140px]">{lesson.title}</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {lesson.type}
                  </Badge>
                  {lesson.dueDate && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="size-2.5" />
                      {new Date(lesson.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </th>
            ))}
            <th className="p-3 font-medium">Overall</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const avgScore =
              row.lessonGrades.length > 0
                ? Math.round(
                    row.lessonGrades.reduce((s, lg) => s + (lg.grade?.score ?? 0), 0) /
                      row.lessonGrades.length,
                  )
                : null;

            return (
              <tr key={row.user.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="sticky left-0 z-10 bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={row.user.image ?? undefined} />
                      <AvatarFallback>
                        <User className="size-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium max-w-[120px]">
                        {row.user.name || row.user.email}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Enrolled {new Date(row.enrolledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                </td>
                {row.lessonGrades.map((lg) => (
                  <td key={lg.lessonId} className="p-2 align-middle">
                    {lg.grade ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-sm font-medium ${lg.grade.passed ? "text-green-600" : "text-red-600"}`}>
                          {lg.grade.score}%
                        </span>
                        {lg.grade.passed ? (
                          <CheckCircle2 className="size-3.5 text-green-500" />
                        ) : (
                          <AlertCircle className="size-3.5 text-red-500" />
                        )}
                      </div>
                    ) : lg.submission ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          handleQuickGrade(row.user.id, lg.lessonId, fd.get("score")?.toString() ?? "");
                        }}
                        className="flex items-center gap-1"
                      >
                        <Input
                          name="score"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="--"
                          className="h-7 w-14 text-xs"
                          disabled={saving === `${row.user.id}_${lg.lessonId}`}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-1.5 text-xs"
                          disabled={saving === `${row.user.id}_${lg.lessonId}`}
                        >
                          %
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                ))}
                <td className="p-3">
                  {avgScore !== null ? (
                    <Badge variant={avgScore >= 60 ? "default" : "destructive"} className="text-xs">
                      {avgScore}%
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No enrolled students found
        </div>
      )}
    </div>
  );
}
