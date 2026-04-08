import bcrypt from "bcryptjs";
import { redis, keys } from "./redis.js";

const SALT_ROUNDS = 10;

// User registration 

export async function registerUser(email: string, password: string): Promise<void> {
  const existing = await redis.hget(keys.user(email), "passwordHash");
  if (existing) throw new Error("Email already registered");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await redis.hset(keys.user(email), { passwordHash });
}

// Login → issue a new API key

export async function loginUser(email: string, password: string): Promise<string> {
  const passwordHash = await redis.hget(keys.user(email), "passwordHash");
  if (!passwordHash) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) throw new Error("Invalid credentials");

  return issueApiKey(email);
}

// Issue a new API key for a user 

export async function issueApiKey(userId: string): Promise<string> {
  // 32 random bytes → hex string
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const key = Array.from(raw).map((b) => b.toString(16).padStart(2, "0")).join("");
  const prefixed = `sk_${key}`;

  const pipeline = redis.pipeline();
  pipeline.set(keys.apiKey(prefixed), userId);
  pipeline.sadd(keys.userApiKeys(userId), prefixed);
  await pipeline.exec();

  return prefixed;
}

// Verify a key → return userId 

export async function verifyApiKey(key: string): Promise<string | null> {
  return redis.get(keys.apiKey(key));
}

// Revoke a specific key 

export async function revokeApiKey(key: string, userId: string): Promise<void> {
  const owner = await redis.get(keys.apiKey(key));
  if (!owner) throw new Error("Key not found");
  if (owner !== userId) throw new Error("Forbidden");

  const pipeline = redis.pipeline();
  pipeline.del(keys.apiKey(key));
  pipeline.srem(keys.userApiKeys(userId), key);
  await pipeline.exec();
}

// List all keys for a user 

export async function listApiKeys(userId: string): Promise<string[]> {
  return redis.smembers(keys.userApiKeys(userId));
}
