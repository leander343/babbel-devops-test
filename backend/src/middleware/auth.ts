import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyApiKey } from "../services/apikeys.js";
import type { AuthVariables } from "../types/index.js";

// Middleware to check if Auth token is valid

export async function authMiddleware(
  context: Context<{ Variables: AuthVariables }>,
  next: Next
): Promise<Response | void> {
  const authHeader = context.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing Bearer token" });
  }

  const key = authHeader.slice(7);
  const userId = await verifyApiKey(key);

  if (!userId) {
    throw new HTTPException(401, { message: "Invalid or revoked API key" });
  }

  context.set("userId", userId);
  context.set("userEmail", userId);

  await next();
}
