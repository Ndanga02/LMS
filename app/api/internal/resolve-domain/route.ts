import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAuthorized(request: NextRequest): boolean {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) return true;

  const header = request.headers.get("x-internal-call");
  return header === internalSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = request.nextUrl.searchParams.get("host");
  if (!host) {
    return NextResponse.json({ slug: null }, { status: 400 });
  }

  const hostname = host.split(":")[0];

  const tenant = await prisma.tenant.findFirst({
    where: {
      customDomain: hostname,
      status: "ACTIVE",
    },
    select: { slug: true },
  });

  return NextResponse.json({ slug: tenant?.slug ?? null });
}
