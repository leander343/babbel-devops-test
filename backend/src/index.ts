import { redis } from "./services/redis.js";
import { buildApp } from "./app.js";

const app = buildApp();
const port = parseInt(process.env.PORT ?? "3000", 10);

await redis.connect();
console.log(`[redis] connected`);
console.log(`[app] listening on http://localhost:${port}`);

export default { port, fetch: app.fetch };