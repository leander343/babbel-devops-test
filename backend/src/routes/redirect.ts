import { Hono } from "hono";
import { getLink, recordClick } from "../services/links.js";
import type { ClickEvent } from "../types/index.js";
import { redirectLimiter } from "../middleware/rateLimit.js";

export const redirectRouter = new Hono();

// GET /:slug — public redirect
redirectRouter.get("/:slug", redirectLimiter, async (c) => {
    const slug = c.req.param("slug");
      if (!slug) return c.json({ error: "Missing key param" }, 400);
     const link = await getLink(slug);

  if (!link) {
    return c.json({ error: "Short link not found" }, 404);
  }

  // Record click analytics 
  const event: ClickEvent = {
    slug,
    timestamp: new Date().toISOString(),
    ip:
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown",
    userAgent: c.req.header("user-agent") ?? "",
    referrer: c.req.header("referer") ?? "",
  };

  recordClick(event).catch((err) =>
    console.error("[analytics] failed to record click:", err)
  );

  return c.redirect(link.originalUrl, 302);
});