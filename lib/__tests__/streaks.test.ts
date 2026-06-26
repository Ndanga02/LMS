import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}));

const { updateUserStreak, getUserStreak } = await import("@/lib/streaks");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const baseUser = {
  lastActiveDate: null,
  currentStreakDays: 0,
  longestStreakDays: 0,
};

describe("updateUserStreak", () => {
  it("should set streak to 1 for first activity", async () => {
    mockUserFindUnique.mockResolvedValue(baseUser);

    const result = await updateUserStreak("user-1");
    expect(result).toEqual({ current: 1, longest: 1 });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        currentStreakDays: 1,
        longestStreakDays: 1,
        lastActiveDate: expect.any(Date),
      },
    });
  });

  it("should increment streak when active on consecutive days", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mockUserFindUnique.mockResolvedValue({
      lastActiveDate: yesterday,
      currentStreakDays: 3,
      longestStreakDays: 5,
    });

    const result = await updateUserStreak("user-1");
    expect(result).toEqual({ current: 4, longest: 5 });
  });

  it("should not increment streak for same-day activity", async () => {
    const now = new Date();
    mockUserFindUnique.mockResolvedValue({
      lastActiveDate: now,
      currentStreakDays: 3,
      longestStreakDays: 5,
    });

    const result = await updateUserStreak("user-1");
    expect(result).toEqual({ current: 3, longest: 5 });
  });

  it("should reset streak when gap > 1 day", async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    mockUserFindUnique.mockResolvedValue({
      lastActiveDate: threeDaysAgo,
      currentStreakDays: 10,
      longestStreakDays: 10,
    });

    const result = await updateUserStreak("user-1");
    expect(result).toEqual({ current: 1, longest: 10 });
  });

  it("should update longest streak when current exceeds it", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mockUserFindUnique.mockResolvedValue({
      lastActiveDate: yesterday,
      currentStreakDays: 7,
      longestStreakDays: 7,
    });

    const result = await updateUserStreak("user-1");
    expect(result).toEqual({ current: 8, longest: 8 });
  });

  it("should return zeros for non-existent user", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const result = await updateUserStreak("nonexistent");
    expect(result).toEqual({ current: 0, longest: 0 });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});

describe("getUserStreak", () => {
  it("should return current and longest streak", async () => {
    mockUserFindUnique.mockResolvedValue({
      currentStreakDays: 5,
      longestStreakDays: 12,
      lastActiveDate: new Date("2025-01-01"),
    });

    const result = await getUserStreak("user-1");
    expect(result).toEqual({
      current: 5,
      longest: 12,
      lastActive: new Date("2025-01-01"),
    });
  });

  it("should return zeros for non-existent user", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const result = await getUserStreak("user-1");
    expect(result).toEqual({ current: 0, longest: 0, lastActive: null });
  });
});
