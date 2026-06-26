import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";
import { validateCsrfOrigin } from "@/lib/csrf";

type Resource = "users" | "enrollments" | "courses";
type Format = "csv" | "json";

export async function POST(request: Request) {
  const csrf = validateCsrfOrigin(request);
  if (csrf) return csrf;

  const sessionUser = await getSessionUser();
  if (!sessionUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await isSuperAdmin(sessionUser.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource") as Resource | null;
  const format = (searchParams.get("format") as Format | null) ?? "csv";

  if (!resource || !["users", "enrollments", "courses"].includes(resource)) {
    return NextResponse.json({ error: "Missing or invalid resource. Use users, enrollments, or courses." }, { status: 400 });
  }
  if (!["csv", "json"].includes(format)) {
    return NextResponse.json({ error: "Invalid format. Use csv or json." }, { status: 400 });
  }

  try {
    let data: Record<string, unknown>[];
    let filename: string;

    switch (resource) {
      case "users": {
        const users = await prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            platformRole: true,
            suspendedAt: true,
            createdAt: true,
            _count: { select: { enrollments: true, memberships: true } },
          },
        });
        data = users.map((u) => ({
          id: u.id,
          name: u.name ?? "",
          email: u.email,
          platformRole: u.platformRole,
          suspended: u.suspendedAt ? "Yes" : "No",
          suspendedAt: u.suspendedAt?.toISOString() ?? "",
          createdAt: u.createdAt.toISOString(),
          enrollments: u._count.enrollments,
          tenants: u._count.memberships,
        }));
        filename = "users";
        break;
      }
      case "enrollments": {
        const enrollments = await prisma.enrollment.findMany({
          orderBy: { enrolledAt: "desc" },
          take: 5000,
          include: {
            user: { select: { name: true, email: true } },
            course: { select: { title: true, slug: true, tenantId: true } },
          },
        });
        data = enrollments.map((e) => ({
          id: e.id,
          userId: e.userId,
          userName: e.user.name ?? "",
          userEmail: e.user.email,
          courseId: e.courseId,
          courseTitle: e.course.title,
          courseSlug: e.course.slug,
          tenantId: e.course.tenantId,
          status: e.status,
          progressPercent: e.progressPercent,
          completedAt: e.completedAt?.toISOString() ?? "",
          enrolledAt: e.enrolledAt.toISOString(),
        }));
        filename = "enrollments";
        break;
      }
      case "courses": {
        const courses = await prisma.course.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            tenant: { select: { name: true, slug: true } },
            instructor: { select: { name: true, email: true } },
            _count: { select: { enrollments: true, lessons: true } },
          },
        });
        data = courses.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          tenantName: c.tenant.name,
          tenantSlug: c.tenant.slug,
          instructorName: c.instructor?.name ?? "",
          instructorEmail: c.instructor?.email ?? "",
          level: c.level,
          status: c.status,
          priceCents: c.priceCents,
          currency: c.currency,
          category: c.category ?? "",
          lessons: c._count.lessons,
          enrollments: c._count.enrollments,
          isMarketplaceListed: c.isMarketplaceListed ? "Yes" : "No",
          isFeatured: c.isFeatured ? "Yes" : "No",
          estimatedDurationMin: c.estimatedDurationMin ?? "",
          createdAt: c.createdAt.toISOString(),
        }));
        filename = "courses";
        break;
      }
    }

    if (format === "json") {
      return NextResponse.json(data, {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}.json"`,
          "Content-Type": "application/json",
        },
      });
    }

    // Build CSV
    if (data.length === 0) {
      return new NextResponse("", {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
          "Content-Type": "text/csv",
        },
      });
    }

    const headers = Object.keys(data[0]);
    const escapeCsv = (v: unknown): string => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvRows = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
    ];

    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Content-Type": "text/csv",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
