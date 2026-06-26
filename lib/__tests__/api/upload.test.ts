import { describe, it, expect, vi, beforeEach } from "vitest";

const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();

vi.mock("fs/promises", () => ({
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}));

vi.mock("@/lib/rate-limit", () => ({
  uploadRateLimit: vi.fn().mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60000 }),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

function pngBuffer(size = 100): Uint8Array {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const rest = new Uint8Array(Math.max(size - sig.length, 0));
  return new Uint8Array([...sig, ...rest]);
}

function createUploadBody(type: string, size: number = 100): FormData {
  const formData = new FormData();
  const buf = pngBuffer(size);
  const blob = new Blob([buf], { type });
  const file = new File([blob], "test-file", { type });
  formData.append("file", file);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMkdir.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
});

async function postUpload(headers: Record<string, string> = {}, formData?: FormData) {
  const { POST } = await import("@/app/api/v1/upload/route");
  const req = new Request("https://example.com/api/v1/upload", {
    method: "POST",
    headers,
    body: formData ?? createUploadBody("image/png"),
  });
  return POST(req);
}

describe("POST /api/v1/upload", () => {
  it("should return 400 when not multipart form data", async () => {
    const { POST } = await import("@/app/api/v1/upload/route");
    const req = new Request("https://example.com/api/v1/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("multipart");
  });

  it("should return 400 when file type is not allowed", async () => {
    const res = await postUpload({}, createUploadBody("application/x-shockwave-flash"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not allowed");
  });

  it("should return 400 when file exceeds max size", async () => {
    const origFormData = globalThis.FormData;
    const origRequest = globalThis.Request;

    // Create a mock request that returns a FormData with a 60MB file
    const mockFile = new File([new Blob(["x"])], "big-file.png", { type: "image/png" });
    Object.defineProperty(mockFile, "size", { value: 60 * 1024 * 1024 });

    const mockFormData = new origFormData();
    mockFormData.append("file", mockFile);

    const fakeReq = new origRequest("https://example.com/api/v1/upload", {
      method: "POST",
      headers: { "content-type": "multipart/form-data" },
    });
    // Override formData on this specific request
    fakeReq.formData = () => Promise.resolve(mockFormData);

    const { POST } = await import("@/app/api/v1/upload/route");
    const res = await POST(fakeReq);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("too large");
  });

  it("should return 200 and file URL on success", async () => {
    process.env.INTERNAL_API_SECRET = "";
    const res = await postUpload({}, createUploadBody("image/png", 1000));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^\/uploads\//);
    expect(body.filename).toBe("test-file");
    expect(body.type).toBe("image/png");
    expect(body.size).toBe(1000);
    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockMkdir).toHaveBeenCalled();
  });

  it("should return 401 when INTERNAL_API_SECRET is set but not provided", async () => {
    process.env.INTERNAL_API_SECRET = "my-secret";
    const res = await postUpload({}, createUploadBody("image/png"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should authenticate when INTERNAL_API_SECRET matches", async () => {
    process.env.INTERNAL_API_SECRET = "my-secret";
    const res = await postUpload({ authorization: "Bearer my-secret" }, createUploadBody("image/png"));
    expect(res.status).toBe(200);
  });

  it("should return 429 on rate limit exceeded", async () => {
    const { uploadRateLimit } = await import("@/lib/rate-limit");
    (uploadRateLimit as any).mockResolvedValueOnce({ success: false, limit: 10, remaining: 0, reset: Date.now() + 60000 });

    const res = await postUpload({}, createUploadBody("image/png"));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("Rate limit exceeded.");
  });

  it("should sanitize filenames with path traversal", async () => {
    process.env.INTERNAL_API_SECRET = "";
    const formData = new FormData();
    const blob = new Blob([pngBuffer(100)], { type: "image/png" });
    const file = new File([blob], "../../etc/passwd", { type: "image/png" });
    formData.append("file", file);

    const res = await postUpload({}, formData);
    expect(res.status).toBe(200);
    const body = await res.json();
    // The URL path after /uploads/ should not contain path traversal chars
    const filename = body.url.replace("/uploads/", "");
    expect(filename).not.toContain("..");
    expect(filename).not.toContain("/");
    expect(body.url).toMatch(/^\/uploads\/\d+-.*/);
  });

  it("should handle missing file field", async () => {
    process.env.INTERNAL_API_SECRET = "";
    const { POST } = await import("@/app/api/v1/upload/route");
    const formData = new FormData();
    formData.append("other", "value");

    const req = new Request("https://example.com/api/v1/upload", {
      method: "POST",
      headers: {},
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No file provided.");
  });
});
