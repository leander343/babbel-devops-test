# URL Shortener — Frontend

A minimal static frontend for the URL shortener API. Built with **Vite + vanilla TypeScript**. Designed to be deployed as a static site on pages.

## Stack

| Concern | Choice |
|---|---|
| Build tool | [Vite](https://vitejs.dev) |
| Language | TypeScript (vanilla, no framework) |
| Styling | Plain HTML with minimal inline CSS |
| Deployment | Static files on S3 |
| API config | `VITE_API_URL` env var baked in at build time |

---

## Project Structure

```
frontend/
├── index.html      # Entry point — all markup lives here
├── api.ts          # All fetch calls to the backend API
├── main.ts         # DOM event listeners and UI logi
├── vite.config.ts
├── tsconfig.json
└── .env.example
```

---

## Local Development

### Prerequisites

- Node.js >= 20 or Bun >= 1.0
- The backend API running locally (see backend README)

### Setup

```bash
# 1. Install dependencies
npm install   # or: bun install

# 2. Copy env file and set the API URL
cp .env.example .env

# 3. Start the dev server
npm run dev   # or: bun run dev
```

The frontend starts at `http://localhost:5173`.

Make sure the backend is running at the URL set in `VITE_API_URL` (default `http://localhost:3000`) and that `ALLOWED_ORIGIN=http://localhost:5173` is set in the backend `.env`.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Base URL of the backend API. Baked into the bundle at build time. |

> **Note:** Vite only exposes variables prefixed with `VITE_` to client-side code. Do not put secrets here.

---

## Building for Production

```bash
npm run build
```

Output is written to `frontend/dist/`. The `base: "./"` setting in `vite.config.ts` ensures all asset paths are relative, which is required for S3 static hosting.

---


## What the UI Does

The frontend covers the full API workflow in a single page:

**Account** — register a new user or log in. On successful login the API key is automatically populated into the key field.

**API Key** — displays the active key used for all authenticated requests. Can be pasted in manually or cleared.

**Shorten a URL** — submit a URL with an optional custom slug. On success the response is shown and the links table refreshes automatically.

**My Links** — table of all links owned by the current user. Each row has:
- Clickable short URL and original URL
- Formatted creation timestamp
- Analytics button — loads click count and recent events inline
- Delete button — prompts for confirmation before deleting

**Analytics** — shows total click count and a JSON breakdown of recent events including IP, user-agent, referrer, and timestamp.

---

## CORS

The frontend makes cross-origin requests to the backend. Ensure `ALLOWED_ORIGIN` in the backend `.env` is set to the frontend's origin:

| Environment | Value |
|---|---|
| Local dev | `http://localhost:5173` |
| Production | `<pages-url>` |