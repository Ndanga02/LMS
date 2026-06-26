import { describe, it, expect } from "vitest";
import { PLATFORM_TENANT_SLUG, getTenantSlugFromPathname } from "@/lib/tenant-constants";

describe("PLATFORM_TENANT_SLUG", () => {
  it("should be 'platform'", () => {
    expect(PLATFORM_TENANT_SLUG).toBe("platform");
  });
});

describe("getTenantSlugFromPathname", () => {
  it("should extract slug from valid /t/:slug path", () => {
    expect(getTenantSlugFromPathname("/t/acme/courses")).toBe("acme");
    expect(getTenantSlugFromPathname("/t/platform/admin")).toBe("platform");
    expect(getTenantSlugFromPathname("/t/my-org/dashboard")).toBe("my-org");
  });

  it("should return slug for root tenant path", () => {
    expect(getTenantSlugFromPathname("/t/acme")).toBe("acme");
  });

  it("should return null for non-tenant paths", () => {
    expect(getTenantSlugFromPathname("/courses")).toBeNull();
    expect(getTenantSlugFromPathname("/admin")).toBeNull();
    expect(getTenantSlugFromPathname("/")).toBeNull();
    expect(getTenantSlugFromPathname("/api/auth/signin")).toBeNull();
  });

  it("should return null for malformed tenant paths", () => {
    expect(getTenantSlugFromPathname("/t//courses")).toBeNull();
    expect(getTenantSlugFromPathname("/t/")).toBeNull();
  });

  it("should only match at the start of the path", () => {
    expect(getTenantSlugFromPathname("/about/t/foo")).toBeNull();
  });
});
