import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { redis, keys } from "../services/redis.js";
import type { RateLimitOptions } from "../types/index.js";


function getIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

export function rateLimit(options: RateLimitOptions) {
  const { endpoint, limit, windowSecs } = options;

  return async (c: Context, next: Next): Promise<Response | void> => {
    const ip = getIp(c);
    const key = keys.rateLimit(endpoint, ip);

    // Increment counter and set TTL atomically on first hit
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    const count = results?.[0]?.[1] as number;
    const ttl = results?.[1]?.[1] as number;

    // Set expiry only on the first request in the window
    if (ttl === -1) {
      await redis.expire(key, windowSecs);
    }

    const remaining = Math.max(0, limit - count);
    const resetSecs = ttl > 0 ? ttl : windowSecs;

    // Always add rate limit headers so clients can self-throttle
    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.floor(Date.now() / 1000) + resetSecs));

    if (count > limit) {
      c.header("Retry-After", String(resetSecs));
      throw new HTTPException(429, { message: "Too many requests — please try again later" });
    }

    await next();
  };
}


//  Pre-configured limiters 
export const registerLimiter = rateLimit({
  endpoint: "auth:register",
  limit: parseInt(process.env.RATE_LIMIT_REGISTER ?? "5"),
  windowSecs: 60 * 60, // 1 hour
});

export const loginLimiter = rateLimit({
  endpoint: "auth:login",
  limit: parseInt(process.env.RATE_LIMIT_LOGIN ?? "10"),
  windowSecs: 60 * 15, // 15 minutes
});

export const redirectLimiter = rateLimit({
  endpoint: "redirect",
  limit: parseInt(process.env.RATE_LIMIT_REDIRECT ?? "60"),
  windowSecs: 60, // 1 minute
});