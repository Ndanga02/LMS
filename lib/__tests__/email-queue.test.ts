import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockFindUnique = vi.fn();

const { resendSend, ResendMock } = vi.hoisted(() => {
  const send = vi.fn();
  function ResendMock(this: any) {
    // noop — the constructor is just for `new Resend(apiKey)` to work
  }
  ResendMock.prototype.emails = { send };
  return { resendSend: send, ResendMock };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    emailLog: {
      create: mockCreate,
      findMany: mockFindMany,
      update: mockUpdate,
    },
    tenant: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("resend", () => ({
  Resend: ResendMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  resendSend.mockReset();
});

describe("enqueueEmail", () => {
  it("should create an email log entry", async () => {
    mockCreate.mockResolvedValue({ id: "email-1" });
    const { enqueueEmail } = await import("@/lib/email-queue");

    await enqueueEmail({
      to: "user@test.com",
      subject: "Test Subject",
      body: "<p>Hello</p>",
      type: "welcome",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        to: "user@test.com",
        subject: "Test Subject",
        body: "<p>Hello</p>",
        type: "welcome",
        tenantId: null,
        status: "PENDING",
      },
    });
  });

  it("should pass tenantId when provided", async () => {
    mockCreate.mockResolvedValue({ id: "email-2" });
    const { enqueueEmail } = await import("@/lib/email-queue");

    await enqueueEmail({
      to: "user@test.com",
      subject: "Test",
      body: "<p>Test</p>",
      type: "invite",
      tenantId: "tenant-1",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: "tenant-1", type: "invite" }),
    });
  });

  it("should not throw on Prisma error", async () => {
    mockCreate.mockRejectedValue(new Error("DB error"));
    const { enqueueEmail } = await import("@/lib/email-queue");

    await expect(
      enqueueEmail({ to: "a@b.com", subject: "X", body: "<p>X</p>", type: "welcome" }),
    ).resolves.toBeUndefined();
  });
});

describe("processEmailQueue", () => {
  it("should skip processing when RESEND_API_KEY is not configured", async () => {
    const orig = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const { processEmailQueue } = await import("@/lib/email-queue");
    await processEmailQueue();

    expect(mockFindMany).not.toHaveBeenCalled();

    if (orig) process.env.RESEND_API_KEY = orig;
  });

  it("should mark emails as SENT on success", async () => {
    process.env.RESEND_API_KEY = "test-key";
    mockFindMany.mockResolvedValue([
      { id: "email-1", to: "user@test.com", subject: "Hi", body: "<p>Hi</p>", tenantId: null, createdAt: new Date() },
    ]);
    mockUpdate.mockResolvedValue({});
    resendSend.mockResolvedValue({ id: "sent-123" });

    const { processEmailQueue } = await import("@/lib/email-queue");
    await processEmailQueue(10);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "email-1" },
      data: { status: "SENT", sentAt: expect.any(Date) },
    });
  });

  it("should mark emails as FAILED on send error", async () => {
    process.env.RESEND_API_KEY = "test-key";
    mockFindMany.mockResolvedValue([
      { id: "email-2", to: "user@test.com", subject: "Hi", body: "<p>Hi</p>", tenantId: null, createdAt: new Date() },
    ]);
    mockUpdate.mockResolvedValue({});
    resendSend.mockRejectedValue(new Error("Send failed"));

    const { processEmailQueue } = await import("@/lib/email-queue");
    await processEmailQueue(10);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "email-2" },
      data: { status: "FAILED", error: expect.any(String) },
    });
  });
});
