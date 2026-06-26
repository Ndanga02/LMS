import { NextResponse } from "next/server";
import { uploadRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { validateMagicBytes } from "@/lib/file-validation";
import { getSessionUser } from "@/lib/session";
import { uploadFile, sanitizeKey } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  const csrf = validateCsrfOrigin(request);
  if (csrf) return csrf;

  const ip = getClientIp(request.headers);
  const rateLimitResult = await uploadRateLimit(`upload:${ip}`);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const authHeader = request.headers.get("authorization");
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (authHeader && internalSecret) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== internalSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `File type '${file.type}' not allowed. Allowed: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum is ${MAX_SIZE / 1024 / 1024}MB.` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!validateMagicBytes(buffer, file.type)) {
    return NextResponse.json(
      { error: "File content does not match the declared MIME type." },
      { status: 400 },
    );
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const sanitizedName = sanitizeKey(file.name.replace(`.${ext}`, ""));
  const key = `uploads/${Date.now()}-${sanitizedName}.${ext}`;

  try {
    await uploadFile(key, buffer, file.type);
    return NextResponse.json({
      url: key,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("R2 upload failed:", error);
    return NextResponse.json({ error: "Failed to save file." }, { status: 500 });
  }
}
