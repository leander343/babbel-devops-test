import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { redis } from "./services/redis.js";
import { authRouter } from "./routes/auth.js";
import { linksRouter } from "./routes/links.js";
import { redirectRouter } from "./routes/redirect.js";

export function buildApp() {
  const app = new Hono();

  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: process.env.ALLOWED_ORIGIN ?? "*",
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    })
  );

  app.get("/health", async (c) => {
    try {
      await redis.ping();
      return c.json({ status: "ok", redis: "connected" });
    } catch {
      return c.json({ status: "degraded", redis: "disconnected" }, 503);
    }
  });

  app.route("/auth", authRouter);
  app.route("/links", linksRouter);
  app.route("/", redirectRouter); // /:slug must come last

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error("[unhandled]", err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}