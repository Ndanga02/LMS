import { NextRequest, NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/email-queue";
import { processCalendarReminders } from "@/lib/services/calendar-reminders";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.INTERNAL_API_SECRET;

  if (secret) {
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token || token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results: Record<string, unknown> = {};

  try {
    await processEmailQueue();
    results.emailQueue = { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    results.emailQueue = { error: message };
  }

  try {
    const reminderResult = await processCalendarReminders();
    results.calendarReminders = reminderResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    results.calendarReminders = { error: message };
  }

  return NextResponse.json({ success: true, results });
}

export const POST = GET;
