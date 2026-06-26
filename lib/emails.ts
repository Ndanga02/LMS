import { enqueueEmail } from "@/lib/email-queue";

export async function sendStreakReminderEmail(params: {
  to: string;
  name: string;
  currentStreak: number;
}) {
  const { to, name, currentStreak } = params;

  const body = `
    <p>Hey ${name || "there"},</p>
    <p>You're on a <strong>${currentStreak}-day streak</strong>! Just 5-10 minutes today will keep it alive.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard">Jump back into learning →</a></p>
  `;

  await enqueueEmail({
    to,
    subject: `Don't break your ${currentStreak}-day streak!`,
    body,
    type: "streak_reminder",
  });
}

export async function sendCertificateEarnedEmail(params: {
  to: string;
  learnerName: string;
  courseTitle: string;
  certificateCode: string;
  tenantName: string;
  finalScore?: number | null;
}) {
  const { to, learnerName, courseTitle, certificateCode, finalScore } = params;
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/cert/${certificateCode}`;

  const scoreLine = finalScore != null ? `<p>Final Score: <strong>${finalScore}%</strong></p>` : "";

  const body = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="color: var(--tenant-primary, #f97316); font-size: 28px; margin-bottom: 8px;">Congratulations, ${learnerName || "Learner"}!</h1>

      <p style="font-size: 18px; color: #111;">You have officially completed <strong>${courseTitle}</strong>.</p>

      ${scoreLine}

      <div style="margin: 24px 0; padding: 16px; background: #f8f8f8; border-radius: 8px; border-left: 4px solid var(--tenant-primary, #f97316);">
        <p style="margin: 0; font-size: 15px;"><strong>Your Certificate Code:</strong></p>
        <p style="font-family: monospace; font-size: 22px; margin: 8px 0 0; color: #111;">${certificateCode}</p>
      </div>

      <p style="margin-bottom: 24px;">
        <a href="${verifyUrl}" style="display: inline-block; background: var(--tenant-primary, #f97316); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View &amp; Verify Certificate
        </a>
      </p>

      <p style="font-size: 13px; color: #666;">
        This certificate is permanently verifiable at the link above.
      </p>

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />

      <p style="font-size: 12px; color: #888;">
        Keep up the great work!
      </p>
    </div>
  `;

  await enqueueEmail({
    to,
    subject: `Congratulations! Your ${courseTitle} Certificate`,
    body,
    type: "certificate_earned",
  });
}
