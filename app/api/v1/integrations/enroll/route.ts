import { NextResponse } from "next/server";
import { z } from "zod";
import { hashApiKey } from "@/lib/api-keys";
import { enrollRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { getCourseBySlug } from "@/lib/courses";
import {
  canEnrollViaIntegration,
  enrollUser,
  ensureTenantMembership,
} from "@/lib/enrollments";
import { prisma } from "@/lib/db";
import { deliverEnrollmentWebhook } from "@/lib/webhook";
import { upsertUserFromAuth } from "@/lib/users";
import { isIpAllowed } from "@/lib/ip-whitelist";

const enrollSchema = z.object({
  email: z.string().email(),
  courseSlug: z.string().min(1),
  name: z.string().optional(),
  externalRef: z.string().optional(),
});

function extractApiKey(request: Request) {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return request.headers.get("x-api-key")?.trim() ?? null;
}

export async function POST(request: Request) {
  // CSRF check
  const csrf = validateCsrfOrigin(request);
  if (csrf) return csrf;

  const rawKey = extractApiKey(request);
  if (!rawKey) {
    return NextResponse.json({ error: "Missing API key." }, { status: 401 });
  }

  // Rate limit by API key hash
  const keyHash = hashApiKey(rawKey);
  const rateLimitResult = await enrollRateLimit(`enroll:${keyHash}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      },
    );
  }

  const integration = await prisma.tenantIntegration.findUnique({
    where: { apiKeyHash: keyHash },
    include: { tenant: true },
  });

  if (!integration) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  if (!integration.autoEnrollEnabled) {
    return NextResponse.json(
      { error: "Auto-enrollment is disabled for this tenant." },
      { status: 403 },
    );
  }

  if (integration.tenant.status !== "ACTIVE") {
    return NextResponse.json({ error: "Tenant is not active." }, { status: 403 });
  }

  if (!canEnrollViaIntegration(integration.tenant.enrollmentMode)) {
    return NextResponse.json(
      { error: "This tenant does not allow integration enrollment." },
      { status: 403 },
    );
  }

  // IP whitelist check
  if (integration.allowedIps.length > 0) {
    const ip = getClientIp(request.headers);
    if (!isIpAllowed(ip, integration.allowedIps)) {
      return NextResponse.json({ error: "IP not allowed." }, { status: 403 });
    }
  }

  const origin = request.headers.get("origin");
  if (
    origin &&
    integration.allowedOrigins.length > 0 &&
    !integration.allowedOrigins.includes(origin)
  ) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, courseSlug, name, externalRef } = parsed.data;

  const course = await getCourseBySlug(integration.tenantId, courseSlug);
  if (!course || course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const user = await upsertUserFromAuth({ email, name });

  if (user.suspendedAt) {
    return NextResponse.json({ error: "User account is suspended." }, { status: 403 });
  }

  await ensureTenantMembership(integration.tenantId, user.id);

  const enrollment = await enrollUser({
    tenantId: integration.tenantId,
    courseId: course.id,
    userId: user.id,
    source: "INTEGRATION",
    externalRef,
  });

  await deliverEnrollmentWebhook(integration.tenantId, {
    event: "enrollment.created",
    enrollmentId: enrollment.id,
    courseSlug: course.slug,
    userEmail: user.email,
    externalRef,
  });

  return NextResponse.json({
    enrollmentId: enrollment.id,
    courseSlug: course.slug,
    userId: user.id,
    status: enrollment.status,
  });
}
