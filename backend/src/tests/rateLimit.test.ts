import { describe, it, expect, beforeEach } from "bun:test";
import { app,resetRedis, createUserAndLogin, authedRequest, request } from "./helpers.js";

beforeEach(() => resetRedis());

describe("Rate limiting", () => {
  describe("POST /auth/register", () => {
    it("allows requests within the limit", async () => {
      const res = await request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "a@example.com", password: "password123" }),
      });
      expect(res.status).not.toBe(429);
      expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(res.headers.get("X-RateLimit-Remaining")).toBeDefined();
    });

    it("returns 429 after exceeding the register limit", async () => {
      // Hit the limit (5 requests)
      for (let i = 0; i < 5; i++) {
        await request("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: `user${i}@example.com`, password: "password123" }),
        });
      }

      // 6th request should be rate limited
      const res = await request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "over@example.com", password: "password123" }),
      });

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("POST /auth/login", () => {
    it("returns 429 after exceeding the login limit", async () => {
      // Hit the limit (10 requests)
      for (let i = 0; i < 10; i++) {
        await request("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "a@example.com", password: "wrongpassword" }),
        });
      }

      const res = await request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "a@example.com", password: "wrongpassword" }),
      });

      expect(res.status).toBe(429);
    });
  });

  describe("GET /:slug (redirect)", () => {
    it("returns 429 after exceeding the redirect limit", async () => {
      const apiKey = await createUserAndLogin("user@example.com");
      await authedRequest(app,"/links", apiKey, {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com", slug: "limited" }),
      });

      // Hit the limit (60 requests)
      for (let i = 0; i < 60; i++) {
        await request("/limited");
      }

      const res = await request("/limited");
      expect(res.status).toBe(429);
    });

    it("includes rate limit headers on redirect responses", async () => {
      const apiKey = await createUserAndLogin("user@example.com");
      await authedRequest(app,"/links", apiKey, {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com", slug: "headers-test" }),
      });

      const res = await request("/headers-test");
      expect(res.headers.get("X-RateLimit-Limit")).toBe("60");
      expect(res.headers.get("X-RateLimit-Remaining")).toBeDefined();
      expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
    });
  });
});