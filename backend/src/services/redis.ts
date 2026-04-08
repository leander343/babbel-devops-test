import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  ...(process.env.ENV === "production" && { tls: {} }),
});

redis.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});

export const keys = {
  // Hash: { originalUrl, ownerId, createdAt }
  link: (slug: string) => `link:${slug}`,

  // String: stringified integer click count
  clickCount: (slug: string) => `clicks:count:${slug}`,

  // List: JSON-serialised ClickEvent (capped to last 1 000 events)
  clickEvents: (slug: string) => `clicks:events:${slug}`,

  // Set: all slugs owned by a user
  userLinks: (userId: string) => `user:links:${userId}`,

  // Hash: { passwordHash } keyed by email
  user: (email: string) => `user:${email}`,

  // String: userId (email) keyed by API key
  apiKey: (key: string) => `apikey:${key}`,

  // Set: all API keys belonging to a user
  userApiKeys: (userId: string) => `user:apikeys:${userId}`,

  rateLimit: (endpoint: string, ip: string) => `ratelimit:${endpoint}:${ip}`,
};
