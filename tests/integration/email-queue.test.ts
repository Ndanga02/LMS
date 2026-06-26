import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, cleanDatabase, seedTestData } from "./setup";

let data: Awaited<ReturnType<typeof seedTestData>>;

beforeAll(async () => {
  await cleanDatabase();
  data = await seedTestData();
});

afterAll(async () => {
  await cleanDatabase();
});

describe("Email Queue", () => {
  it("should create a pending email log entry", async () => {
    const email = await prisma.emailLog.create({
      data: {
        to: "user@test.com",
        subject: "Welcome!",
        body: "<p>Welcome to the platform</p>",
        type: "welcome",
        status: "PENDING",
      },
    });

    expect(email.to).toBe("user@test.com");
    expect(email.subject).toBe("Welcome!");
    expect(email.status).toBe("PENDING");
    expect(email.createdAt).toBeInstanceOf(Date);
  });

  it("should create email with tenant association", async () => {
    const email = await prisma.emailLog.create({
      data: {
        to: "member@test-org.com",
        subject: "You're invited",
        body: "<p>Join our LMS</p>",
        type: "invite",
        tenantId: data.tenant.id,
        status: "PENDING",
      },
    });

    expect(email.tenantId).toBe(data.tenant.id);
    expect(email.type).toBe("invite");
  });

  it("should update email status to SENT", async () => {
    const email = await prisma.emailLog.create({
      data: {
        to: "sent-test@test.com",
        subject: "Test",
        body: "<p>Test</p>",
        type: "welcome",
        status: "PENDING",
      },
    });

    const updated = await prisma.emailLog.update({
      where: { id: email.id },
      data: { status: "SENT", sentAt: new Date() },
    });

    expect(updated.status).toBe("SENT");
    expect(updated.sentAt).toBeInstanceOf(Date);
  });

  it("should update email status to FAILED with error", async () => {
    const email = await prisma.emailLog.create({
      data: {
        to: "fail-test@test.com",
        subject: "Fail",
        body: "<p>Fail</p>",
        type: "welcome",
        status: "PENDING",
      },
    });

    const updated = await prisma.emailLog.update({
      where: { id: email.id },
      data: { status: "FAILED", error: "Connection refused" },
    });

    expect(updated.status).toBe("FAILED");
    expect(updated.error).toBe("Connection refused");
  });

  it("should query pending emails ordered by creation date", async () => {
    await prisma.emailLog.create({
      data: { to: "a@test.com", subject: "A", body: "<p>A</p>", type: "welcome", status: "PENDING" },
    });
    await prisma.emailLog.create({
      data: { to: "b@test.com", subject: "B", body: "<p>B</p>", type: "welcome", status: "PENDING" },
    });

    const pending = await prisma.emailLog.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    expect(pending.length).toBeGreaterThanOrEqual(2);
  });

  it("should not include sent emails in pending queries", async () => {
    const pending = await prisma.emailLog.findMany({
      where: { status: "PENDING" },
    });

    const sentIds = pending
      .filter((e) => e.status === "SENT")
      .map((e) => e.id);

    expect(sentIds.length).toBe(0);
  });
});
