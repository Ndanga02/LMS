import { prisma } from "@/lib/db";
import { Resend } from "resend";

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

type EnqueueEmailParams = {
  to: string;
  subject: string;
  body: string;
  type: "streak_reminder" | "certificate_earned" | "welcome" | "invite";
  tenantId?: string;
};

export async function enqueueEmail(params: EnqueueEmailParams) {
  try {
    await prisma.emailLog.create({
      data: {
        to: params.to,
        subject: params.subject,
        body: params.body,
        type: params.type,
        tenantId: params.tenantId ?? null,
        status: "PENDING",
      },
    });
  } catch (error) {
    console.error("Failed to enqueue email:", error);
  }
}

// Process pending emails (call from a cron job or after enqueue)
export async function processEmailQueue(batchSize = 10) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not configured — skipping email queue processing.");
    return;
  }

  const pending = await prisma.emailLog.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  for (const email of pending) {
    try {
      const from = email.tenantId
        ? await getTenantFromAddress(email.tenantId)
        : (process.env.EMAIL_FROM ?? "noreply@semtextech.com");

      await resend.emails.send({
        from,
        to: email.to,
        subject: email.subject,
        html: email.body,
      });

      await prisma.emailLog.update({
        where: { id: email.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.emailLog.update({
        where: { id: email.id },
        data: { status: "FAILED", error: message },
      });
    }
  }
}

async function getTenantFromAddress(tenantId: string): Promise<string> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, supportEmail: true },
    });
    if (tenant?.supportEmail) return tenant.supportEmail;
    if (tenant?.name) return `${tenant.name} <noreply@semtextech.com>`;
  } catch {
    // fall through
  }
  return process.env.EMAIL_FROM ?? "noreply@semtextech.com";
}
