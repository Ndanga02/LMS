import { describe, it, expect, afterAll, vi } from "vitest";

const ORIGINAL_ORIGINS = process.env.ALLOWED_ORIGINS;
const ORIGINAL_URL = process.env.NEXT_PUBLIC_APP_URL;
const ORIGINAL_HOST = process.env.EXPECTED_HOST;

function setupEnv(overrides: Record<string, string>) {
  for (const [k, v] of Object.entries(overrides)) {
    process.env[k] = v;
  }
}

function resetEnv() {
  delete process.env.ALLOWED_ORIGINS;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.EXPECTED_HOST;
  if (ORIGINAL_ORIGINS) process.env.ALLOWED_ORIGINS = ORIGINAL_ORIGINS;
  if (ORIGINAL_URL) process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_URL;
  if (ORIGINAL_HOST) process.env.EXPECTED_HOST = ORIGINAL_HOST;
}

afterAll(() => {
  resetEnv();
});

describe("validateCsrfOrigin", () => {
  it("should return null when no origin and no expected host", async () => {
    resetEnv();
    vi.resetModules();
    const { validateCsrfOrigin } = await import("@/lib/csrf");
    const req = new Request("https://example.com/api/test", { method: "POST" });
    expect(validateCsrfOrigin(req)).toBeNull();
  });

  it("should return 403 when origin is not allowed", async () => {
    resetEnv();
    setupEnv({ ALLOWED_ORIGINS: "https://trusted.com" });
    vi.resetModules();
    const { validateCsrfOrigin } = await import("@/lib/csrf");
    const req = new Request("https://evil.com/api/test", {
      method: "POST",
      headers: { origin: "https://evil.com" },
    });
    const res = validateCsrfOrigin(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe("Origin not allowed.");
  });

  it("should return null when origin matches allowed", async () => {
    resetEnv();
    setupEnv({ ALLOWED_ORIGINS: "https://trusted.com" });
    vi.resetModules();
    const { validateCsrfOrigin } = await import("@/lib/csrf");
    const req = new Request("https://trusted.com/api/test", {
      method: "POST",
      headers: { origin: "https://trusted.com" },
    });
    expect(validateCsrfOrigin(req)).toBeNull();
  });

  it("should return null when origin matches NEXT_PUBLIC_APP_URL", async () => {
    resetEnv();
    setupEnv({ NEXT_PUBLIC_APP_URL: "https://myapp.com", ALLOWED_ORIGINS: "" });
    vi.resetModules();
    const { validateCsrfOrigin } = await import("@/lib/csrf");
    const req = new Request("https://myapp.com/api/test", {
      method: "POST",
      headers: { origin: "https://myapp.com" },
    });
    expect(validateCsrfOrigin(req)).toBeNull();
  });

  it("should return 403 when host does not match EXPECTED_HOST", async () => {
    resetEnv();
    setupEnv({ EXPECTED_HOST: "myapp.com" });
    vi.resetModules();
    const { validateCsrfOrigin } = await import("@/lib/csrf");
    const req = new Request("https://evil.com/api/test", {
      method: "POST",
      headers: { host: "evil.com" },
    });
    const res = validateCsrfOrigin(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe("Invalid host.");
  });

  it("should return null when host matches EXPECTED_HOST", async () => {
    resetEnv();
    setupEnv({ EXPECTED_HOST: "myapp.com" });
    vi.resetModules();
    const { validateCsrfOrigin } = await import("@/lib/csrf");
    const req = new Request("https://myapp.com/api/test", {
      method: "POST",
      headers: { host: "myapp.com" },
    });
    expect(validateCsrfOrigin(req)).toBeNull();
  });

  it("should allow null origin (non-browser client)", async () => {
    resetEnv();
    setupEnv({ ALLOWED_ORIGINS: "https://trusted.com" });
    vi.resetModules();
    const { validateCsrfOrigin } = await import("@/lib/csrf");
    const req = new Request("https://trusted.com/api/test", { method: "POST" });
    expect(validateCsrfOrigin(req)).toBeNull();
  });
});
