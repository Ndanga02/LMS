import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

type EnrollmentWebhookPayload = {
  event: "enrollment.created";
  enrollmentId: string;
  courseSlug: string;
  userEmail: string;
  externalRef?: string | null;
};

function signPayload(payload: EnrollmentWebhookPayload, secret: string): string {
  return createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

export async function deliverEnrollmentWebhook(
  tenantId: string,
  payload: EnrollmentWebhookPayload,
): Promise<void> {
  try {
    const integration = await prisma.tenantIntegration.findUnique({
      where: { tenantId },
      select: { webhookUrl: true, apiKeyHash: true },
    });

    if (!integration?.webhookUrl) return;

    const signingSecret = process.env.INTERNAL_API_SECRET ?? integration.apiKeyHash;
    const signature = signPayload(payload, signingSecret);

    fetch(integration.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
      },
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error("Enrollment webhook delivery failed:", error);
    });
  } catch (error) {
    console.error("Failed to look up webhook URL:", error);
  }
}
