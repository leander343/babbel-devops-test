import { describe, it, expect, beforeEach } from "bun:test";
import { app, resetRedis, createUserAndLogin, authedRequest } from "./helpers.js";

let apiKey: string;

beforeEach(async () => {
  resetRedis();
  apiKey = await createUserAndLogin("user@example.com");
});

describe("POST /links", () => {
  it("creates a short link and returns 201 with a shortUrl", async () => {
    const res = await authedRequest(app, "/links", apiKey, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/long/path" }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.slug).toBeDefined();
    expect(body.shortUrl).toContain(body.slug);
    expect(body.originalUrl).toBe("https://example.com/long/path");
  });

  it("accepts a custom slug", async () => {
    const res = await authedRequest(app, "/links", apiKey, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", slug: "my-link" }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.slug).toBe("my-link");
  });

  it("returns 409 if custom slug is taken by another user", async () => {
    await authedRequest(app, "/links", apiKey, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", slug: "taken" }),
    });

    const apiKey2 = await createUserAndLogin("other@example.com");
    const res = await authedRequest(app, "/links", apiKey2, {
      method: "POST",
      body: JSON.stringify({ url: "https://other.com", slug: "taken" }),
    });

    expect(res.status).toBe(409);
  });

  it("returns 400 for an invalid URL", async () => {
    const res = await authedRequest(app, "/links", apiKey, {
      method: "POST",
      body: JSON.stringify({ url: "not-a-url" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 without a token", async () => {
    const res = await app.request("/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /links", () => {
  it("lists only links owned by the authenticated user", async () => {
    await authedRequest(app, "/links", apiKey, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", slug: "mine" }),
    });

    const apiKey2 = await createUserAndLogin("other@example.com");
    await authedRequest(app, "/links", apiKey2, {
      method: "POST",
      body: JSON.stringify({ url: "https://other.com", slug: "theirs" }),
    });

    const res = await authedRequest(app, "/links", apiKey);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toHaveLength(1);
    expect(body[0].slug).toBe("mine");
  });

  it("returns an empty array when user has no links", async () => {
    const res = await authedRequest(app, "/links", apiKey);
    expect(res.status).toBe(200);
    expect((await res.json()) as any).toEqual([]);
  });
});

describe("GET /links/:slug", () => {
  it("returns the link details", async () => {
    await authedRequest(app, "/links", apiKey, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", slug: "detail-test" }),
    });

    const res = await authedRequest(app, "/links/detail-test", apiKey);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.slug).toBe("detail-test");
    expect(body.originalUrl).toBe("https://example.com");
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await authedRequest(app, "/links/nope", apiKey);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /links/:slug", () => {
  it("deletes a link owned by the user", async () => {
    await authedRequest(app, "/links", apiKey, {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", slug: "to-delete" }),
    });

    const del = await authedRequest(app, "/links/to-delete", apiKey, { method: "DELETE" });
    expect(del.status).toBe(204);

    const check = await authedRequest(app, "/links/to-delete", apiKey);
    expect(check.status).toBe(404);
  });

  it("returns 403 when deleting another user's link", async () => {
    const apiKey2 = await createUserAndLogin("other@example.com");
    await authedRequest(app, "/links", apiKey2, {
      method: "POST",
      body: JSON.stringify({ url: "https://other.com", slug: "not-mine" }),
    });

    const res = await authedRequest(app, "/links/not-mine", apiKey, { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await authedRequest(app, "/links/ghost", apiKey, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});