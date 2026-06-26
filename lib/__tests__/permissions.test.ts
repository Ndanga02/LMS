import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
    tenantMembership: {
      findUnique: mockFindMany,
    },
  },
}));

const { isSuperAdmin, hasTenantRole } = await import("@/lib/permissions");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isSuperAdmin", () => {
  it("should return true when user has SUPER_ADMIN role", async () => {
    mockFindUnique.mockResolvedValue({ platformRole: "SUPER_ADMIN" });
    const result = await isSuperAdmin("user-1");
    expect(result).toBe(true);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { platformRole: true },
    });
  });

  it("should return false when user has USER role", async () => {
    mockFindUnique.mockResolvedValue({ platformRole: "USER" });
    const result = await isSuperAdmin("user-1");
    expect(result).toBe(false);
  });

  it("should return false when user not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await isSuperAdmin("nonexistent");
    expect(result).toBe(false);
  });
});

describe("hasTenantRole", () => {
  it("should return true for super admins regardless of membership", async () => {
    mockFindUnique.mockResolvedValue({ platformRole: "SUPER_ADMIN" });
    const result = await hasTenantRole("tenant-1", "user-1", ["TENANT_ADMIN"]);
    expect(result).toBe(true);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("should return true when user has matching role", async () => {
    mockFindUnique.mockResolvedValue({ platformRole: "USER" });
    mockFindMany.mockResolvedValue({ role: "TENANT_ADMIN" });
    const result = await hasTenantRole("tenant-1", "user-1", ["TENANT_ADMIN"]);
    expect(result).toBe(true);
  });

  it("should return false when user has non-matching role", async () => {
    mockFindUnique.mockResolvedValue({ platformRole: "USER" });
    mockFindMany.mockResolvedValue({ role: "STUDENT" });
    const result = await hasTenantRole("tenant-1", "user-1", ["TENANT_ADMIN"]);
    expect(result).toBe(false);
  });

  it("should return false when user has no membership", async () => {
    mockFindUnique.mockResolvedValue({ platformRole: "USER" });
    mockFindMany.mockResolvedValue(null);
    const result = await hasTenantRole("tenant-1", "user-1", ["TENANT_ADMIN"]);
    expect(result).toBe(false);
  });

  it("should accept multiple allowed roles", async () => {
    mockFindUnique.mockResolvedValue({ platformRole: "USER" });
    mockFindMany.mockResolvedValue({ role: "INSTRUCTOR" });
    const result = await hasTenantRole("tenant-1", "user-1", ["TENANT_ADMIN", "INSTRUCTOR"]);
    expect(result).toBe(true);
  });
});
