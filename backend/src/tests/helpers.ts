import { type Hono } from "hono";

// Inject the mock before any service module imports redis
const redisModule = await import("../services/redis.js");

// Import app AFTER the swap so all services pick up the mock
const { buildApp } = await import("../app.js");

export const app = buildApp();


/** Call between tests to wipe all Redis state */
export function resetRedis() {
  redisModule.redis.flushall();
}

/** Helper: register + login and return an API key */
export async function createUserAndLogin(
  email = "test@example.com",
  password = "password123"
): Promise<string> {
  await app.request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const res = await app.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const { apiKey } = (await res.json()) as any;
  return apiKey as string;
}

/** Helper: authenticated request */
export function authedRequest(
  // Use Hono's own type instead of typeof fetch to avoid signature mismatch
  honoApp: Hono,
  path: string,
  apiKey: string,
  init: RequestInit = {}
) {
  return honoApp.request(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers as Record<string, string> ?? {}),
    },
  });
}

export async function request(path: string, init: RequestInit = {}) {
  return app.request(path, init);
}