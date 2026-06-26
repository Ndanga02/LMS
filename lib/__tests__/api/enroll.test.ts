import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockEnrollUser = vi.fn();
const mockEnsureMembership = vi.fn();
const mockCanEnrollViaIntegration = vi.fn();
const mockGetCourseBySlug = vi.fn();
const mockUpsertUser = vi.fn();
const mockDeliverWebhook = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    tenantIntegration: { findUnique: mockFindUnique },
    tenantMembership: { upsert: mockEnsureMembership },
    enrollment: { upsert: mockEnrollUser },
  },
}));

vi.mock("@/lib/courses", () => ({
  getCourseBySlug: (...args: any[]) => mockGetCourseBySlug(...args),
}));

vi.mock("@/lib/enrollments", () => ({
  canEnrollViaIntegration: (...args: any[]) => mockCanEnrollViaIntegration(...args),
  enrollUser: (...args: any[]) => mockEnrollUser(...args),
  ensureTenantMembership: (...args: any[]) => mockEnsureMembership(...args),
}));

vi.mock("@/lib/users", () => ({
  upsertUserFromAuth: (...args: any[]) => mockUpsertUser(...args),
}));

vi.mock("@/lib/webhook", () => ({
  deliverEnrollmentWebhook: (...args: any[]) => mockDeliverWebhook(...args),
}));

function mockIntegration(overrides: Record<string, any> = {}) {
  return {
    id: "int-1",
    tenantId: "tenant-1",
    apiKeyHash: "hash",
    autoEnrollEnabled: true,
    allowedOrigins: [],
    allowedIps: [],
    webhookUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: {
      id: "tenant-1",
      slug: "test-org",
      name: "Test Org",
      status: "ACTIVE",
      enrollmentMode: "BOTH",
    },
    ...overrides,
  };
}

function defaultMocks() {
  mockCanEnrollViaIntegration.mockReturnValue(true);
}

beforeEach(() => {
  vi.clearAllMocks();
  defaultMocks();
});

async function postEnroll(headers: Record<string, string> = {}, body: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/api/v1/integrations/enroll/route");
  const req = new Request("https://example.com/api/v1/integrations/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/v1/integrations/enroll", () => {
  it("should return 401 when no API key provided", async () => {
    const res = await postEnroll();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Missing API key.");
  });

  it("should return 401 when API key is invalid", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await postEnroll({ authorization: "Bearer invalid-key" });
    expect(res.status).toBe(401);
  });

  it("should return 403 when auto-enroll is disabled", async () => {
    mockFindUnique.mockResolvedValue(mockIntegration({ autoEnrollEnabled: false }));
    const res = await postEnroll({ authorization: "Bearer valid-key" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("disabled");
  });

  it("should return 403 when tenant is not active", async () => {
    mockFindUnique.mockResolvedValue(mockIntegration({ tenant: { ...mockIntegration().tenant, status: "SUSPENDED" } }));
    const res = await postEnroll({ authorization: "Bearer valid-key" });
    expect(res.status).toBe(403);
  });

  it("should return 403 when integration enrollment not allowed", async () => {
    mockFindUnique.mockResolvedValue(mockIntegration());
    mockCanEnrollViaIntegration.mockReturnValue(false);
    const res = await postEnroll({ authorization: "Bearer valid-key" });
    expect(res.status).toBe(403);
  });

  it("should return 403 when IP is not whitelisted", async () => {
    mockFindUnique.mockResolvedValue(mockIntegration({ allowedIps: ["10.0.0.0/8"] }));
    const res = await postEnroll({
      authorization: "Bearer valid-key",
      "x-forwarded-for": "11.0.0.1",
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("IP not allowed.");
  });

  it("should return 400 for invalid JSON body", async () => {
    mockFindUnique.mockResolvedValue(mockIntegration());
    const { POST } = await import("@/app/api/v1/integrations/enroll/route");
    const req = new Request("https://example.com/api/v1/integrations/enroll", {
      method: "POST",
      headers: { authorization: "Bearer valid-key", "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 404 when course not found", async () => {
    mockFindUnique.mockResolvedValue(mockIntegration());
    mockGetCourseBySlug.mockResolvedValue(null);
    const res = await postEnroll(
      { authorization: "Bearer valid-key" },
      { email: "user@test.com", courseSlug: "nonexistent" },
    );
    expect(res.status).toBe(404);
  });

  it("should return 403 when user is suspended", async () => {
    mockFindUnique.mockResolvedValue(mockIntegration());
    mockGetCourseBySlug.mockResolvedValue({ id: "course-1", status: "PUBLISHED" });
    mockUpsertUser.mockResolvedValue({ id: "user-1", suspendedAt: new Date() });
    const res = await postEnroll(
      { authorization: "Bearer valid-key" },
      { email: "user@test.com", courseSlug: "course-1" },
    );
    expect(res.status).toBe(403);
  });

  it("should enroll user and return success on valid request", async () => {
    mockFindUnique.mockResolvedValue(mockIntegration());
    mockGetCourseBySlug.mockResolvedValue({ id: "course-1", slug: "math-101", status: "PUBLISHED" });
    mockUpsertUser.mockResolvedValue({ id: "user-1", email: "user@test.com", suspendedAt: null });
    mockEnrollUser.mockResolvedValue({ id: "enr-1", status: "ACTIVE" });

    const res = await postEnroll(
      { authorization: "Bearer valid-key" },
      { email: "user@test.com", courseSlug: "math-101", name: "Test User", externalRef: "ref-123" },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enrollmentId).toBe("enr-1");
    expect(body.status).toBe("ACTIVE");

    expect(mockEnsureMembership).toHaveBeenCalled();
    expect(mockEnrollUser).toHaveBeenCalledWith(expect.objectContaining({
      source: "INTEGRATION",
      externalRef: "ref-123",
    }));
    expect(mockDeliverWebhook).toHaveBeenCalledWith("tenant-1", expect.objectContaining({
      event: "enrollment.created",
    }));
  });

  it("should accept x-api-key header as alternative auth", async () => {
    mockFindUnique.mockResolvedValue(mockIntegration());
    mockGetCourseBySlug.mockResolvedValue({ id: "course-1", slug: "math-101", status: "PUBLISHED" });
    mockUpsertUser.mockResolvedValue({ id: "user-1", email: "user@test.com", suspendedAt: null });

    const res = await postEnroll(
      { "x-api-key": "valid-key" },
      { email: "user@test.com", courseSlug: "math-101" },
    );

    expect(res.status).toBe(200);
  });
});
