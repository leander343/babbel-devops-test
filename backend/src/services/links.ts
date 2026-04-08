import { redis, keys } from "./redis.js";
import type { ShortLink, ClickEvent, AnalyticsSummary } from "../types/index.js";

const SLUG_LENGTH = 8;
const MAX_EVENTS = 1_000;

// SHA-256 of the URL → first SLUG_LENGTH hex chars
export async function generateSlug(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((hash) => hash.toString(16).padStart(2, "0"))
    .join("").slice(0, SLUG_LENGTH);
}
  

export async function createLink(
  originalUrl: string,
  ownerId: string,
  customSlug?: string
): Promise<ShortLink> {
  const slug = customSlug ?? (await generateSlug(originalUrl));
  const linkKey = keys.link(slug);

  // Prevent overwriting a slug owned by someone else
  const existing = await redis.hgetall(linkKey);
  if (existing?.ownerId && existing.ownerId !== ownerId) {
    throw new Error(`Slug "${slug}" is already taken`);
  }

  const link: ShortLink = {
    slug,
    originalUrl,
    ownerId,
    createdAt: new Date().toISOString(),
  };

  const pipeline = redis.pipeline();
  pipeline.hset(linkKey, link as unknown as Record<string, string>);
  pipeline.sadd(keys.userLinks(ownerId), slug);
  await pipeline.exec();

  return link;
}

export async function getLink(slug: string): Promise<ShortLink | null> {
  const data = await redis.hgetall(keys.link(slug));
  if (!data?.originalUrl) return null;
  return data as unknown as ShortLink;
}

export async function deleteLink(slug: string, ownerId: string): Promise<void> {
  const link = await getLink(slug);
  if (!link) throw new Error("Link not found");
  if (link.ownerId !== ownerId) throw new Error("Forbidden");

  const pipeline = redis.pipeline();
  pipeline.del(keys.link(slug));
  pipeline.del(keys.clickCount(slug));
  pipeline.del(keys.clickEvents(slug));
  pipeline.srem(keys.userLinks(ownerId), slug);
  await pipeline.exec();
}

export async function listLinks(ownerId: string): Promise<ShortLink[]> {
  const slugs = await redis.smembers(keys.userLinks(ownerId));
  if (!slugs.length) return [];

  const pipeline = redis.pipeline();
  slugs.forEach((s) => pipeline.hgetall(keys.link(s)));
  const results = await pipeline.exec();

  return (results ?? [])
    .map(([, val]) => val as unknown as ShortLink)
    .filter((v) => v?.originalUrl);
}

// Analytics

export async function recordClick(event: ClickEvent): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.incr(keys.clickCount(event.slug));
  // Prepend so index 0 is most recent; trim to keep list bounded
  pipeline.lpush(keys.clickEvents(event.slug), JSON.stringify(event));
  pipeline.ltrim(keys.clickEvents(event.slug), 0, MAX_EVENTS - 1);
  await pipeline.exec();
}

export async function getAnalytics(
  slug: string,
  limit = 100
): Promise<AnalyticsSummary> {
  const [countRaw, eventsRaw] = await Promise.all([
    redis.get(keys.clickCount(slug)),
    redis.lrange(keys.clickEvents(slug), 0, limit - 1),
  ]);

  return {
    slug,
    totalClicks: parseInt(countRaw ?? "0", 10),
    recentEvents: eventsRaw.map((e) => JSON.parse(e) as ClickEvent),
  };
}
