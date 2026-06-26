"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, ArrowRight } from "lucide-react";

type Props = {
  grades: {
    course: { id: string; title: string; slug: string };
    averageScore: number | null;
    totalGraded: number;
    grades: { lessonId: string; lessonTitle: string; lessonType: string; score: number; passed: boolean; feedback: string | null; gradedAt: string }[];
  }[];
};

export function MyGrades({ grades }: Props) {
  if (grades.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <GraduationCap className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No grades yet. Enroll in a course to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {grades.map((entry) => (
        <Card key={entry.course.id} className="border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-base">{entry.course.title}</CardTitle>
              <Badge variant="secondary" className="text-sm">
                {entry.averageScore !== null ? `${entry.averageScore}%` : "--"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{entry.totalGraded} graded items</span>
                {entry.averageScore !== null && <span>Average</span>}
              </div>
              {entry.averageScore !== null && (
                <Progress value={entry.averageScore} className="mt-1 h-2" />
              )}
            </div>
            {entry.grades.length > 0 && (
              <div className="space-y-1">
                {entry.grades.map((grade) => (
                  <div
                    key={grade.lessonId}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{grade.lessonTitle}</div>
                      <div className="text-xs text-muted-foreground">{grade.lessonType}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {grade.feedback && (
                        <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[100px]">
                          {grade.feedback}
                        </span>
                      )}
                      <Badge variant={grade.passed ? "default" : "destructive"} className="text-xs">
                        {grade.score}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href={`/courses/${entry.course.slug}`}
              className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View course <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
