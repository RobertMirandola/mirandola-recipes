import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signingKey } from "./secrets";

const COOKIE_NAME = "mr_session";
const AUDIENCE = "mirandola-recipes:session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export async function startSession(): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(signingKey());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  try {
    await jwtVerify(token, signingKey(), { audience: AUDIENCE, algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

/** Sends the visitor to the login page unless they are signed in. */
export async function requireSession(returnTo: string): Promise<void> {
  if (!(await hasSession())) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
}
