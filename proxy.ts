import { NextRequest, NextResponse } from "next/server";

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? "semtextech.example";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host")?.split(":")[0] ?? "";

  // Skip middleware for static assets, API routes, and the platform domain
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/__") ||
    host === PLATFORM_DOMAIN ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.")
  ) {
    return NextResponse.next();
  }

  // Resolve the custom domain to a tenant slug via the internal API
  const resolveUrl = new URL("/api/internal/resolve-domain", request.url);
  resolveUrl.searchParams.set("host", host);

  try {
    const response = await fetch(resolveUrl, {
      headers: INTERNAL_API_SECRET
        ? { "x-internal-call": INTERNAL_API_SECRET }
        : {},
    });

    if (response.ok) {
      const { slug } = await response.json();
      if (slug) {
        const url = request.nextUrl.clone();
        url.pathname = `/t/${slug}${pathname === "/" ? "" : pathname}`;
        return NextResponse.rewrite(url);
      }
    }
  } catch {
    // Fall through to next() if domain resolution fails
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public/uploads
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
