import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAchievementFindUnique = vi.fn();
const mockUserAchievementFindUnique = vi.fn();
const mockUserAchievementCreate = vi.fn();
const mockUserAchievementFindMany = vi.fn();
const mockAchievementFindMany = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    achievement: {
      findUnique: mockAchievementFindUnique,
      findMany: mockAchievementFindMany,
    },
    userAchievement: {
      findUnique: mockUserAchievementFindUnique,
      create: mockUserAchievementCreate,
      findMany: mockUserAchievementFindMany,
    },
    user: {
      update: mockUserUpdate,
    },
  },
}));

const { awardAchievement, getUserAchievements, getAllAchievements } = await import("@/lib/achievements");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("awardAchievement", () => {
  it("should award a new achievement and grant points", async () => {
    const achievement = { id: "ach-1", code: "first-lesson", points: 10 };
    mockAchievementFindUnique.mockResolvedValue(achievement);
    mockUserAchievementFindUnique.mockResolvedValue(null);
    mockUserAchievementCreate.mockResolvedValue({
      userId: "user-1",
      achievementId: "ach-1",
      achievement,
    });

    const result = await awardAchievement("user-1", "first-lesson") as { achievement: typeof achievement } | null;

    expect(result).toBeDefined();
    expect(result!.achievement).toBe(achievement);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { totalPoints: { increment: 10 } },
    });
  });

  it("should return null if achievement code not found", async () => {
    mockAchievementFindUnique.mockResolvedValue(null);
    const result = await awardAchievement("user-1", "first-lesson");
    expect(result).toBeNull();
  });

  it("should not award duplicate achievements", async () => {
    const achievement = { id: "ach-1", code: "first-lesson", points: 10 };
    const existing = { id: "ua-1", userId: "user-1", achievementId: "ach-1" };

    mockAchievementFindUnique.mockResolvedValue(achievement);
    mockUserAchievementFindUnique.mockResolvedValue(existing);

    const result = await awardAchievement("user-1", "first-lesson");
    expect(result).toBe(existing);
    expect(mockUserAchievementCreate).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("should pass tenantId to the created record", async () => {
    const achievement = { id: "ach-1", code: "streak-3", points: 20 };
    mockAchievementFindUnique.mockResolvedValue(achievement);
    mockUserAchievementFindUnique.mockResolvedValue(null);
    mockUserAchievementCreate.mockResolvedValue({
      userId: "user-1",
      achievementId: "ach-1",
      achievement,
    });

    await awardAchievement("user-1", "streak-3", "tenant-42");

    expect(mockUserAchievementCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        achievementId: "ach-1",
        tenantId: "tenant-42",
      },
      include: { achievement: true },
    });
  });
});

describe("getUserAchievements", () => {
  it("should return achievements ordered by earnedAt desc", async () => {
    const achievements = [
      { id: "ua-1", achievement: { code: "first-lesson" } },
    ];
    mockUserAchievementFindMany.mockResolvedValue(achievements);

    const result = await getUserAchievements("user-1");
    expect(result).toBe(achievements);
    expect(mockUserAchievementFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: { achievement: true },
      orderBy: { earnedAt: "desc" },
    });
  });
});

describe("getAllAchievements", () => {
  it("should return achievements ordered by points", async () => {
    const achievements = [{ code: "first-lesson", points: 10 }];
    mockAchievementFindMany.mockResolvedValue(achievements);

    const result = await getAllAchievements();
    expect(result).toBe(achievements);
    expect(mockAchievementFindMany).toHaveBeenCalledWith({
      orderBy: { points: "asc" },
    });
  });
});
