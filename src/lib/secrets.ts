import { createHash, timingSafeEqual } from "node:crypto";

type RequiredEnv =
  | "APP_PASSWORD"
  | "SESSION_SECRET"
  | "OAUTH_CLIENT_ID"
  | "OAUTH_CLIENT_SECRET";

export function requireEnv(name: RequiredEnv): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

/** Key for signing the session cookie and OAuth tokens. */
export function signingKey(): Uint8Array {
  const secret = requireEnv("SESSION_SECRET");
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long.");
  }
  return new TextEncoder().encode(secret);
}

/** String comparison that takes the same time whether or not the values match. */
export function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function isAppPassword(candidate: string): boolean {
  return safeEqual(candidate, requireEnv("APP_PASSWORD"));
}
