import { NextRequest, NextResponse } from "next/server";
import { getFileStream } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: keyParts } = await params;
  const key = keyParts.join("/");

  const result = await getFileStream(key);
  if (!result) {
    return new NextResponse(null, { status: 404 });
  }

  const body = result.Body as ReadableStream | null;
  if (!body) {
    return new NextResponse(null, { status: 500 });
  }

  const headers = new Headers();
  if (result.ContentType) headers.set("Content-Type", result.ContentType);
  if (result.ContentLength) headers.set("Content-Length", String(result.ContentLength));
  if (result.ETag) headers.set("ETag", result.ETag);

  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new NextResponse(body, { headers });
}
