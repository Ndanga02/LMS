"use client";

import { useEffect, useState } from "react";
import { getMySubmissionAction } from "@/app/actions/assignments";
import { AssignmentSubmission } from "@/components/assignment-submission";

type Props = {
  lessonId: string;
  lessonTitle: string;
  dueDate: string | null;
  tenantSlug: string;
  courseSlug: string;
};

export function AssignmentWrapper({ lessonId, lessonTitle, dueDate, tenantSlug, courseSlug }: Props) {
  const [submission, setSubmission] = useState<Awaited<ReturnType<typeof getMySubmissionAction>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMySubmissionAction(lessonId)
      .then(setSubmission)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (loading) return null;

  return (
    <AssignmentSubmission
      lessonId={lessonId}
      lessonTitle={lessonTitle}
      dueDate={dueDate}
      initialSubmission={submission}
      tenantSlug={tenantSlug}
      courseSlug={courseSlug}
    />
  );
}
