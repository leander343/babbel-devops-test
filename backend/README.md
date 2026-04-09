# URL Shortener — Backend

A URL shortener API built with **Bun + Hono**, backed by **Redis**, with per-user API key authentication, click analytics, and IP-based rate limiting.

## Stack

| Concern | Choice |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Framework | [Hono](https://hono.dev) |
| Storage | Redis via [ioredis](https://github.com/redis/ioredis) |
| Auth | Per-user API keys (bcrypt-hashed passwords) |
| Slug strategy | SHA-256 hash of URL (first 8 chars) or custom |
| Analytics | Total clicks + per-click IP, user-agent, referrer |
| Rate limiting | Sliding window counter per IP, stored in Redis |
| Validation | [Zod](https://zod.dev) + `@hono/zod-validator` |

---

## Project Structure

```
src/
├── index.ts                  # Entry point — boots Redis and starts server
├── app.ts                    # Hono app factory (used by both server and tests)
├── types/
│   └── index.ts              # Shared TypeScript types
├── services/
│   ├── redis.ts              # Redis client singleton + key helpers
│   ├── apikeys.ts            # User registration, login, key issuance/revocation
│   └── links.ts              # Link CRUD, slug generation, analytics
├── middleware/
│   ├── auth.ts               # Bearer token verification
│   └── rateLimit.ts          # Sliding window rate limiter
└── routes/
    ├── auth.ts               # /auth/* endpoints
    ├── links.ts              # /links/* endpoints
    └── redirect.ts           # /:slug public redirect
```

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Redis (local or Docker)

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# 4. Start dev server with hot reload
bun dev
```

The server starts at `http://localhost:3000`.


## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string. Use `rediss://` for TLS (required on AWS ElastiCache) |
| `BASE_URL` | `http://localhost:3000` | Public base URL — used to construct short URLs in responses |
| `PORT` | `3000` | HTTP port |
| `ALLOWED_ORIGIN` | `*` | CORS allowed origin — set to your frontend URL in production |
| `RATE_LIMIT_REGISTER` | `5` | Max registration attempts per IP per hour |
| `RATE_LIMIT_LOGIN` | `10` | Max login attempts per IP per 15 minutes |
| `RATE_LIMIT_REDIRECT` | `60` | Max redirect requests per IP per minute |

---

## API Reference

### Authentication

All `/links` endpoints require an `Authorization: Bearer <apiKey>` header. Obtain a key by registering and logging in.

---

#### `POST /auth/register`

Create a new account.

**Request body:**
```json
{
  "email": "you@example.com",
  "password": "password123"
}
```

**Responses:**

| Status | Meaning |
|---|---|
| `201` | Registered successfully |
| `400` | Validation error (invalid email or password < 8 chars) |
| `409` | Email already registered |
| `429` | Rate limit exceeded (5 attempts/hour per IP) |

---

#### `POST /auth/login`

Log in and receive an API key.

**Request body:**
```json
{
  "email": "you@example.com",
  "password": "password123"
}
```

**Response `200`:**
```json
{
  "apiKey": "sk_a3f9c2..."
}
```

Each login issues a **new** API key. Previous keys remain valid until explicitly revoked.

**Responses:**

| Status | Meaning |
|---|---|
| `200` | Returns `apiKey` |
| `401` | Invalid credentials |
| `429` | Rate limit exceeded (10 attempts/15 min per IP) |

---

#### `GET /auth/keys`

List all active API keys for the authenticated user.

**Response `200`:**
```json
{
  "apiKeys": ["sk_a3f9c2...", "sk_b7e1d4..."]
}
```

---

#### `DELETE /auth/keys/:key`

Revoke a specific API key.

**Responses:**

| Status | Meaning |
|---|---|
| `204` | Revoked successfully |
| `403` | Key belongs to another user |
| `404` | Key not found |

---

### Links

#### `POST /links`

Create a short link.

**Request body:**
```json
{
  "url": "https://example.com/very/long/path",
  "slug": "my-link"
}
```

`slug` is optional. If omitted, the first 8 characters of the SHA-256 hash of the URL are used.

**Response `201`:**
```json
{
  "slug": "my-link",
  "originalUrl": "https://example.com/very/long/path",
  "shortUrl": "http://localhost:3000/my-link",
  "ownerId": "you@example.com",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

**Responses:**

| Status | Meaning |
|---|---|
| `201` | Created |
| `400` | Invalid URL or slug too short/long |
| `401` | Missing or invalid API key |
| `409` | Slug already taken by another user |

---

#### `GET /links`

List all links owned by the authenticated user.

**Response `200`:** Array of link objects, each including `shortUrl`.

---

#### `GET /links/:slug`

Get details for a single link.

**Responses:**

| Status | Meaning |
|---|---|
| `200` | Returns link object |
| `404` | Slug not found |

---

#### `DELETE /links/:slug`

Delete a link. Only the owner can delete their own links.

**Responses:**

| Status | Meaning |
|---|---|
| `204` | Deleted |
| `403` | Not the owner |
| `404` | Slug not found |

---

#### `GET /links/:slug/analytics`

Get click analytics for a link. Only accessible by the owner.

**Query params:** `?limit=N` (default 100, max 1000)

**Response `200`:**
```json
{
  "slug": "my-link",
  "totalClicks": 42,
  "recentEvents": [
    {
      "slug": "my-link",
      "timestamp": "2025-01-01T12:00:00.000Z",
      "ip": "1.2.3.4",
      "userAgent": "Mozilla/5.0 ...",
      "referrer": "https://example.com"
    }
  ]
}
```

---

### Redirect

#### `GET /:slug`

Public endpoint — no auth required. Redirects to the original URL and records a click event asynchronously.

**Responses:**

| Status | Meaning |
|---|---|
| `302` | Redirect to original URL |
| `404` | Slug not found |
| `429` | Rate limit exceeded (60 req/min per IP) |

Rate limit headers are included on every response:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1735689600
```

---

### Health Check

#### `GET /health`

Returns Redis connectivity status. Used by the ALB health check.

**Response `200`:**
```json
{ "status": "ok", "redis": "connected" }
```

**Response `503`** when Redis is unreachable:
```json
{ "status": "degraded", "redis": "disconnected" }
```

---


## Testing Backend flow using CURL

1. Register a user
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "password123"}'
```
2. Login and get your API key
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "password123"}'
```
You'll get back something like:
```json
{ "apiKey": "sk_a3f9c2..." }
```
Copy that key — you'll use it as the Bearer token in all subsequent requests.
3. Create a short link
```bash
curl -X POST http://localhost:3000/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_a3f9c2..." \
  -d '{"url": "https://example.com/some/very/long/url"}'
```
4. Create with a custom slug
```bash
curl -X POST http://localhost:3000/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_a3f9c2..." \
  -d '{"url": "https://example.com", "slug": "my-link"}'
```
5. Use the short link (public, no auth)
```bash
curl -L http://localhost:3000/my-link
```
 link follows the redirect
6. List your links
```bash
curl http://localhost:3000/links \
  -H "Authorization: Bearer sk_a3f9c2..."
```
7. View analytics for a link
```bash
curl http://localhost:3000/links/my-link/analytics \
  -H "Authorization: Bearer sk_a3f9c2..."
```
8. Delete a link
```bash
curl -X DELETE http://localhost:3000/links/my-link \
  -H "Authorization: Bearer sk_a3f9c2..."
```
9. Revoke your API key
```bash
curl -X DELETE http://localhost:3000/auth/keys/sk_a3f9c2... \
  -H "Authorization: Bearer sk_a3f9c2..."
```

## Running Tests

Tests use Bun's built-in test runner. Redis is fully mocked in-memory — no running Redis instance needed.

```bash
# Run once
bun test

# Watch mode
bun test --watch
```

Test files live in `src/tests/` and cover auth, links CRUD, redirects, analytics, and rate limiting.

---

## Docker

### Build

```bash
docker build -t url-shortener .
```

### Run

```bash
docker run -p 3000:3000 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e BASE_URL=http://localhost:3000 \
  url-shortener
```

The Dockerfile is a two-stage build — production dependencies only, non-root user, with a `HEALTHCHECK` on `/health`.

---

## Notes

**Slug collisions** — if two URLs produce the same 8-char SHA-256 prefix, the second `POST /links` without a custom slug returns the existing entry. Use a custom slug when uniqueness is critical.

**Multiple API keys** — each login issues a new key; old keys stay valid. Use `GET /auth/keys` to audit active keys and `DELETE /auth/keys/:key` to revoke any you no longer need.


