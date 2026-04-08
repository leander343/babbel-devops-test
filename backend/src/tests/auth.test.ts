import { describe, it, expect, beforeEach } from "bun:test";
import { app, resetRedis, authedRequest } from "./helpers.js";

beforeEach(() => resetRedis());

describe("POST /auth/register", () => {
  it("registers a new user and returns 201", async () => {
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "password123" }),
    });

    expect(res.status).toBe(201);
    const body = await (res.json()) as any;
    expect(body.message).toBe("User registered successfully");
  });

  it("returns 409 if email is already registered", async () => {
    const payload = JSON.stringify({ email: "a@example.com", password: "password123" });
    await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid email", async () => {
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "password123" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for short password", async () => {
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "short" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("returns an API key on valid credentials", async () => {
    await registerUser("a@example.com");
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "password123" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.apiKey).toMatch(/^sk_/);
  });

  it("returns 401 for wrong password", async () => {
    await registerUser("a@example.com");
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "wrongpassword" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ghost@example.com", password: "password123" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /auth/keys", () => {
  it("lists API keys for the authenticated user", async () => {
    const apiKey = await registerAndLogin("b@example.com");
    const res = await authedRequest(app, "/auth/keys", apiKey);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.apiKeys).toContain(apiKey);
  });

  it("returns 401 without a token", async () => {
    const res = await app.request("/auth/keys");
    expect(res.status).toBe(401);
  });
});

describe("DELETE /auth/keys/:key", () => {
  it("revokes an API key and subsequent requests fail", async () => {
    const apiKey = await registerAndLogin("c@example.com");
    const del = await authedRequest(app, `/auth/keys/${apiKey}`, apiKey, { method: "DELETE" });
    expect(del.status).toBe(204);
    const check = await authedRequest(app, "/auth/keys", apiKey);
    expect(check.status).toBe(401);
  });
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function registerUser(email: string, password = "password123") {
  return app.request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

async function registerAndLogin(email: string, password = "password123") {
  await registerUser(email, password);
  const res = await app.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const { apiKey } = (await res.json()) as any;
  return apiKey as string;
}