import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  registerUser,
  loginUser,
  revokeApiKey,
  listApiKeys,
} from "../services/apikeys.js";
import { registerLimiter, loginLimiter } from "../middleware/rateLimit.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthVariables } from "../types/index.js";

export const authRouter = new Hono<{ Variables: AuthVariables }>();

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

// POST /auth/register 
authRouter.post("/register", registerLimiter, zValidator("json", credentialsSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  try {
    await registerUser(email, password);
    return c.json({ message: "User registered successfully" }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return c.json({ error: message }, 409);
  }
});

// POST /auth/login
authRouter.post("/login", loginLimiter, zValidator("json", credentialsSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  try {
    const apiKey = await loginUser(email, password);
    return c.json({ apiKey });
  } catch (err: unknown) {
    return c.json({ error: "Invalid credentials" }, 401);
  }
});

// GET /auth/keys — list all active keys for the current user 
authRouter.get("/keys", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const apiKeys = await listApiKeys(userId);
  return c.json({ apiKeys });
});

// DELETE /auth/keys/:key 
authRouter.delete("/keys/:key", authMiddleware, async (c) => {
  const key = c.req.param("key");
  if (!key) return c.json({ error: "Missing key param" }, 400);
  const userId = c.get("userId");

  try {
    await revokeApiKey(key, userId);
    return c.body(null, 204);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    const status = message === "Forbidden" ? 403 : 404;
    return c.json({ error: message }, status);
  }
});
