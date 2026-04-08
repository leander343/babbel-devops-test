import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import {
  createLink,
  deleteLink,
  getLink,
  listLinks,
  getAnalytics,
} from "../services/links.js";
import type { AuthVariables } from "../types/index.js";

export const linksRouter = new Hono<{ Variables: AuthVariables }>();

// All /links routes require a valid API token
linksRouter.use("*", authMiddleware);

// POST /links 
const createSchema = z.object({
  url: z.url(),
  slug: z.string().min(2).max(64).optional(),
});

linksRouter.post(
  "/",
  zValidator("json", createSchema),
  async (c) => {
    const { url, slug } = c.req.valid("json");
    const ownerId = c.get("userId");

    try {
      const link = await createLink(url, ownerId, slug);
      const shortUrl = `${process.env.BASE_URL}/${link.slug}`;
      return c.json({ ...link, shortUrl }, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not create link";
      return c.json({ error: message }, 409);
    }
  }
);

// GET /links 
linksRouter.get("/", async (c) => {
  const ownerId = c.get("userId");
  const links = await listLinks(ownerId);
  const base = process.env.BASE_URL;
  return c.json(
    links.map((l) => ({ ...l, shortUrl: `${base}/${l.slug}` }))
  );
});

// GET /links/:slug 
linksRouter.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const link = await getLink(slug);
  if (!link) return c.json({ error: "Not found" }, 404);
  return c.json({ ...link, shortUrl: `${process.env.BASE_URL}/${slug}` });
});

// DELETE /links/:slug 
linksRouter.delete("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const ownerId = c.get("userId");

  try {
    await deleteLink(slug, ownerId);
    return c.body(null, 204);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "Forbidden" ? 403 : 404;
    return c.json({ error: message }, status);
  }
});

// GET /links/:slug/analytics
linksRouter.get("/:slug/analytics", async (c) => {
  const slug = c.req.param("slug");
  const ownerId = c.get("userId");

  const link = await getLink(slug);
  if (!link) return c.json({ error: "Not found" }, 404);
  if (link.ownerId !== ownerId) return c.json({ error: "Forbidden" }, 403);

  const limitParam = c.req.query("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 1000) : 100;

  const summary = await getAnalytics(slug, limit);
  return c.json(summary);
});