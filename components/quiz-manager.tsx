"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  addQuizQuestionAction,
  updateQuizQuestionAction,
  deleteQuizQuestionAction,
  reorderQuizQuestionsAction,
} from "@/app/actions/quiz";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  order: number;
};

type QuizManagerProps = {
  tenantSlug: string;
  quizId: string;
  questions: Question[];
};

export function QuizManager({ tenantSlug, quizId, questions }: QuizManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sorted, setSorted] = useState(questions);

  const sortedQuestions = [...sorted].sort((a, b) => a.order - b.order);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Quiz Questions</CardTitle>
          <CardDescription>
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="mr-1 size-3" />
          Add Question
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <form
            action={async (formData) => {
              await addQuizQuestionAction(tenantSlug, formData);
              setIsAdding(false);
            }}
            className="rounded-lg border border-primary/20 bg-muted/30 p-4 space-y-3"
          >
            <input type="hidden" name="quizId" value={quizId} />
            <div>
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                name="question"
                placeholder="What is 2 + 2?"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Answer Options</Label>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctIndex"
                    value={i}
                    defaultChecked={i === 0}
                    className="shrink-0"
                  />
                  <Input
                    name="option"
                    placeholder={`Option ${i + 1}`}
                    required
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {sortedQuestions.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground">No questions yet. Add one above.</p>
        )}

        {sortedQuestions.map((q, idx) => (
          <div key={q.id} className="rounded-lg border p-4">
            {editingId === q.id ? (
              <form
                action={async (formData) => {
                  await updateQuizQuestionAction(tenantSlug, formData);
                  setEditingId(null);
                }}
                className="space-y-3"
              >
                <input type="hidden" name="questionId" value={q.id} />
                <div>
                  <Label>Question</Label>
                  <Input name="question" defaultValue={q.question} required />
                </div>
                <div className="space-y-2">
                  <Label>Answer Options</Label>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctIndex"
                        value={oi}
                        defaultChecked={oi === q.correctIndex}
                        className="shrink-0"
                      />
                      <Input name="option" defaultValue={opt} required />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Save</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-xs font-semibold text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                    <div>
                      <p className="text-sm font-medium">{q.question}</p>
                      <ul className="mt-1 space-y-0.5">
                        {q.options.map((opt, oi) => (
                          <li key={oi} className={`text-xs ${oi === q.correctIndex ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                            {oi === q.correctIndex ? "✓ " : ""}{opt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(q.id)}>
                      <Pencil className="size-3" />
                    </Button>
                    <form action={deleteQuizQuestionAction.bind(null, tenantSlug)}>
                      <input type="hidden" name="questionId" value={q.id} />
                      <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                        <Trash2 className="size-3" />
                      </Button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
