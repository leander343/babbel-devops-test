import { describe, it, expect, beforeEach } from "bun:test";
import { app, resetRedis, createUserAndLogin, authedRequest } from "./helpers.js";

let apiKey: string;

beforeEach(async () => {
  resetRedis();
  apiKey = await createUserAndLogin("user@example.com");
});

describe("GET /:slug (redirect)", () => {
  it("redirects to the original URL", async () => {
    await authedRequest(app, "/links", apiKey, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", slug: "go-example" }),
    });

    const res = await app.request("/go-example");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com");
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await app.request("/unknown-slug-xyz");
    expect(res.status).toBe(404);
  });

  it("records a click on redirect", async () => {
    await authedRequest(app, "/links", apiKey, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", slug: "track" }),
    });

    // Trigger the redirect (fire-and-forget analytics uses a microtask)
    await app.request("/track");
    // Give the fire-and-forget recordClick promise time to settle
    await new Promise((r) => setTimeout(r, 10));

    const res = await authedRequest(app, "/links/track/analytics", apiKey);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.totalClicks).toBe(1);
  });
});