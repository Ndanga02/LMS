import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type RateLimiterInstance = {
  limit: (key: string) => Promise<RateLimitResult>;
};

function createFallbackRatelimit(max: number, windowMs: number): RateLimiterInstance {
  const store = new Map<string, { count: number; resetTime: number }>();

  return {
    limit: async (key: string) => {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || now > entry.resetTime) {
        store.set(key, { count: 1, resetTime: now + windowMs });
        return { success: true, limit: max, remaining: max - 1, reset: now + windowMs };
      }
      if (entry.count >= max) {
        return { success: false, limit: max, remaining: 0, reset: entry.resetTime };
      }
      entry.count += 1;
      return { success: true, limit: max, remaining: max - entry.count, reset: entry.resetTime };
    },
  };
}

function createUpstashRatelimit(max: number, windowSec: number, prefix: string): RateLimiterInstance {
  const redis = Redis.fromEnv();
  const limiter = Ratelimit.slidingWindow(max, `${windowSec} s`);
  const instance = new Ratelimit({
    redis,
    limiter,
    prefix,
    analytics: true,
  });
  return {
    limit: async (key: string) => {
      const result = await instance.limit(key);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    },
  };
}

function createInstance(max: number, windowMs: number, prefix?: string): RateLimiterInstance {
  if (upstashUrl) {
    return createUpstashRatelimit(max, Math.ceil(windowMs / 1000), prefix ?? "ratelimit");
  }
  return createFallbackRatelimit(max, windowMs);
}

// ─── Named instances ──────────────────────────────────────

/** Generic: 5 req / 60s */
const genericLimiter = createInstance(5, 60_000, "generic");

/** Login: 3 req / 60s */
const loginLimiter = createInstance(3, 60_000, "login");

/** Upload: 10 req / 60s (per-IP, generous for file uploads) */
const uploadLimiter = createInstance(10, 60_000, "upload");

/** Integration enrollment: 30 req / 60s (per-key) */
const enrollLimiter = createInstance(30, 60_000, "enroll");

export async function rateLimit(key: string): Promise<RateLimitResult> {
  return genericLimiter.limit(key);
}

export async function loginRateLimit(key: string): Promise<RateLimitResult> {
  return loginLimiter.limit(key);
}

export async function uploadRateLimit(key: string): Promise<RateLimitResult> {
  return uploadLimiter.limit(key);
}

export async function enrollRateLimit(key: string): Promise<RateLimitResult> {
  return enrollLimiter.limit(key);
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
