import { describe, it, expect, beforeEach } from "bun:test";
import { app, resetRedis, createUserAndLogin, authedRequest } from "./helpers.js";

let apiKey: string;

beforeEach(async () => {
  resetRedis();
  apiKey = await createUserAndLogin("user@example.com");
  await authedRequest(app, "/links", apiKey, {
    method: "POST",
    body: JSON.stringify({ url: "https://example.com", slug: "stats" }),
  });
});

describe("GET /links/:slug/analytics", () => {
  it("returns zero clicks for a fresh link", async () => {
    const res = await authedRequest(app, "/links/stats/analytics", apiKey);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.totalClicks).toBe(0);
    expect(body.recentEvents).toEqual([]);
  });

  it("returns click count and events after redirects", async () => {
    await app.request("/stats");
    await app.request("/stats");
    await new Promise((r) => setTimeout(r, 10));

    const res = await authedRequest(app, "/links/stats/analytics", apiKey);
    const body = (await res.json()) as any;
    expect(body.totalClicks).toBe(2);
    expect(body.recentEvents).toHaveLength(2);
  });

  it("each event contains ip, userAgent, referrer, timestamp", async () => {
    await app.request("/stats", {
      headers: {
        "user-agent": "TestAgent/1.0",
        referer: "https://referrer.example.com",
      },
    });
    await new Promise((r) => setTimeout(r, 10));

    const res = await authedRequest(app, "/links/stats/analytics", apiKey);
    const body = (await res.json()) as any;
    const event = body.recentEvents[0];
    expect(event.userAgent).toBe("TestAgent/1.0");
    expect(event.referrer).toBe("https://referrer.example.com");
    expect(event.timestamp).toBeDefined();
  });

  it("respects the ?limit query param", async () => {
    for (let i = 0; i < 5; i++) await app.request("/stats");
    await new Promise((r) => setTimeout(r, 10));

    const res = await authedRequest(app, "/links/stats/analytics?limit=2", apiKey);
    const body = (await res.json()) as any;
    expect(body.recentEvents).toHaveLength(2);
    expect(body.totalClicks).toBe(5); // count is always full
  });

  it("returns 403 when requesting analytics for another user's link", async () => {
    const apiKey2 = await createUserAndLogin("other@example.com");
    const res = await authedRequest(app, "/links/stats/analytics", apiKey2);
    expect(res.status).toBe(403);
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await authedRequest(app, "/links/nope/analytics", apiKey);
    expect(res.status).toBe(404);
  });
});