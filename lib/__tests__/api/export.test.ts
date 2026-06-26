import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: mockFindMany },
    enrollment: { findMany: mockFindMany },
    course: { findMany: mockFindMany },
  },
}));

vi.mock("@/lib/session", () => ({
  requireSessionUser: vi.fn().mockResolvedValue({ id: "super-1", email: "admin@test.com" }),
}));

vi.mock("@/lib/permissions", () => ({
  isSuperAdmin: vi.fn(),
}));

const { requireSessionUser } = await import("@/lib/session");
const { isSuperAdmin } = await import("@/lib/permissions");

beforeEach(() => {
  vi.clearAllMocks();
});

async function getExport(query: string = "") {
  const { GET } = await import("@/app/api/v1/export/route");
  const req = new Request(`https://example.com/api/v1/export${query}`);
  return GET(req);
}

describe("GET /api/v1/export", () => {
  it("should return 403 when user is not super admin", async () => {
    (isSuperAdmin as any).mockResolvedValue(false);
    const res = await getExport("?resource=users&format=json");
    expect(res.status).toBe(403);
  });

  it("should return 400 when resource is missing", async () => {
    (isSuperAdmin as any).mockResolvedValue(true);
    const res = await getExport();
    expect(res.status).toBe(400);
  });

  it("should return 400 when resource is invalid", async () => {
    (isSuperAdmin as any).mockResolvedValue(true);
    const res = await getExport("?resource=invalid");
    expect(res.status).toBe(400);
  });

  it("should return 400 when format is invalid", async () => {
    (isSuperAdmin as any).mockResolvedValue(true);
    const res = await getExport("?resource=users&format=xml");
    expect(res.status).toBe(400);
  });

  it("should export users as CSV", async () => {
    (isSuperAdmin as any).mockResolvedValue(true);
    mockFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", email: "alice@test.com", platformRole: "USER", suspendedAt: null, createdAt: new Date("2024-01-01"), _count: { enrollments: 3, memberships: 2 } },
      { id: "u2", name: null, email: "bob@test.com", platformRole: "SUPER_ADMIN", suspendedAt: new Date("2024-06-01"), createdAt: new Date("2024-02-01"), _count: { enrollments: 0, memberships: 1 } },
    ]);

    const res = await getExport("?resource=users&format=csv");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");

    const text = await res.text();
    expect(text).toContain("Alice");
    expect(text).toContain("Yes");
    expect(text).toContain("SUPER_ADMIN");
    expect(text).toContain("3");
  });

  it("should export users as JSON", async () => {
    (isSuperAdmin as any).mockResolvedValue(true);
    mockFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", email: "alice@test.com", platformRole: "USER", suspendedAt: null, createdAt: new Date("2024-01-01"), _count: { enrollments: 3, memberships: 2 } },
    ]);

    const res = await getExport("?resource=users&format=json");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Alice");
    expect(data[0].enrollments).toBe(3);
  });

  it("should return empty CSV when no data", async () => {
    (isSuperAdmin as any).mockResolvedValue(true);
    mockFindMany.mockResolvedValue([]);

    const res = await getExport("?resource=users&format=csv");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("");
  });
});
