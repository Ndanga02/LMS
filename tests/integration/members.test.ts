import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma, cleanDatabase, seedTestData } from "./setup";

let data: Awaited<ReturnType<typeof seedTestData>>;

beforeAll(async () => {
  await cleanDatabase();
  data = await seedTestData();
});

afterAll(async () => {
  await cleanDatabase();
});

describe("Member Management", () => {
  it("should create a new user and membership when inviting by email", async () => {
    const invitedUser = await prisma.user.create({
      data: { email: "new-member@test.com", name: "New Member" },
    });

    const membership = await prisma.tenantMembership.create({
      data: {
        tenantId: data.tenant.id,
        userId: invitedUser.id,
        role: "STUDENT",
      },
    });

    expect(membership.role).toBe("STUDENT");
    expect(membership.tenantId).toBe(data.tenant.id);
    expect(membership.userId).toBe(invitedUser.id);
  });

  it("should prevent duplicate membership", async () => {
    const member = await prisma.user.create({
      data: { email: "duplicate-test@test.com" },
    });

    await prisma.tenantMembership.create({
      data: { tenantId: data.tenant.id, userId: member.id, role: "STUDENT" },
    });

    await expect(
      prisma.tenantMembership.create({
        data: { tenantId: data.tenant.id, userId: member.id, role: "INSTRUCTOR" },
      }),
    ).rejects.toThrow();
  });

  it("should update member role", async () => {
    const member = await prisma.user.create({
      data: { email: "role-update@test.com" },
    });

    const membership = await prisma.tenantMembership.create({
      data: { tenantId: data.tenant.id, userId: member.id, role: "STUDENT" },
    });

    const updated = await prisma.tenantMembership.update({
      where: { id: membership.id },
      data: { role: "INSTRUCTOR" },
    });

    expect(updated.role).toBe("INSTRUCTOR");
  });

  it("should remove a member", async () => {
    const member = await prisma.user.create({
      data: { email: "to-be-removed@test.com" },
    });

    const membership = await prisma.tenantMembership.create({
      data: { tenantId: data.tenant.id, userId: member.id, role: "STUDENT" },
    });

    await prisma.tenantMembership.delete({ where: { id: membership.id } });

    const exists = await prisma.tenantMembership.findUnique({
      where: { id: membership.id },
    });
    expect(exists).toBeNull();
  });

  it("should list all members for a tenant", async () => {
    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: data.tenant.id },
      include: { user: { select: { email: true, name: true } } },
    });

    // admin + instructor + members created above
    expect(members.length).toBeGreaterThanOrEqual(2);
    expect(members.map((m) => m.user.email)).toContain("admin@test-org.com");
    expect(members.map((m) => m.user.email)).toContain("instructor@test-org.com");
  });

  it("should find user by email for invite", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "new-member@test.com" },
    });
    expect(user).not.toBeNull();
    expect(user!.name).toBe("New Member");
  });

  it("should create a user if not found for invite", async () => {
    const email = "brand-new-user@test.com";
    let user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeNull();

    user = await prisma.user.create({
      data: { email, name: email.split("@")[0] },
    });
    expect(user).not.toBeNull();
    expect(user!.email).toBe(email);
  });

  it("should enforce unique email constraint", async () => {
    await expect(
      prisma.user.create({
        data: { email: "new-member@test.com" },
      }),
    ).rejects.toThrow();
  });
});
