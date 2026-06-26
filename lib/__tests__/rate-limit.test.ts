import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow first request", async () => {
    const result = await rateLimit("test-key");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it("should decrement remaining on each request", async () => {
    await rateLimit("key");
    const r2 = await rateLimit("key");
    expect(r2.remaining).toBe(3);

    const r3 = await rateLimit("key");
    expect(r3.remaining).toBe(2);
  });

  it("should block after 5 attempts within window", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await rateLimit("block-key");
      expect(r.success).toBe(true);
    }

    const blocked = await rateLimit("block-key");
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("should reset after window expires", async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimit("reset-key");
    }

    const blocked = await rateLimit("reset-key");
    expect(blocked.success).toBe(false);

    vi.advanceTimersByTime(60_001);

    const reset = await rateLimit("reset-key");
    expect(reset.success).toBe(true);
    expect(reset.remaining).toBe(4);
  });

  it("should track different keys independently", async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimit("key-a");
    }

    const keyB = await rateLimit("key-b");
    expect(keyB.success).toBe(true);
    expect(keyB.remaining).toBe(4);

    const keyA = await rateLimit("key-a");
    expect(keyA.success).toBe(false);
  });
});

describe("getClientIp", () => {
  it("should extract IP from x-forwarded-for", () => {
    const headers = new Map([
      ["x-forwarded-for", "203.0.113.42, 10.0.0.1"],
    ]) as unknown as Headers;

    expect(getClientIp(headers)).toBe("203.0.113.42");
  });

  it("should fall back to x-real-ip", () => {
    const headers = new Map([
      ["x-real-ip", "198.51.100.7"],
    ]) as unknown as Headers;

    expect(getClientIp(headers)).toBe("198.51.100.7");
  });

  it("should return 'unknown' when no IP header present", () => {
    const headers = new Map() as unknown as Headers;
    expect(getClientIp(headers)).toBe("unknown");
  });

  it("should prefer x-forwarded-for over x-real-ip", () => {
    const headers = new Map([
      ["x-forwarded-for", "203.0.113.1"],
      ["x-real-ip", "198.51.100.1"],
    ]) as unknown as Headers;

    expect(getClientIp(headers)).toBe("203.0.113.1");
  });

  it("should trim whitespace from IP", () => {
    const headers = new Map([
      ["x-forwarded-for", "  203.0.113.99  "],
    ]) as unknown as Headers;

    expect(getClientIp(headers)).toBe("203.0.113.99");
  });
});
