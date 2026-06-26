import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function getExpectedOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? null;
  if (!url) return null;
  const protocol = url.startsWith("http") ? "" : "https://";
  return `${protocol}${url}`;
}

export function validateCsrfOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // No origin header — likely a same-origin or non-browser request.
  // Validate Host as a fallback.
  if (!origin) {
    if (!host) return null;
    const expectedHost = process.env.EXPECTED_HOST ?? null;
    if (expectedHost && host !== expectedHost) {
      return NextResponse.json({ error: "Invalid host." }, { status: 403 });
    }
    return null;
  }

  // Origin header present — validate it.
  if (
    origin !== "null" &&
    !ALLOWED_ORIGINS.includes(origin)
  ) {
    const expected = getExpectedOrigin();
    if (expected && origin === expected) return null;
    if (ALLOWED_ORIGINS.length > 0) {
      return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
    }
  }

  return null;
}
