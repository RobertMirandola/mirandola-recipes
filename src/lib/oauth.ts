import { createHash, randomUUID } from "node:crypto";
import { lt } from "drizzle-orm";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getDb } from "@/db";
import { oauthUsedCodes } from "@/db/schema";
import { AUTHORIZE_PARAM_NAMES, type AuthorizeParams } from "./oauth-params";
import { requireEnv, safeEqual, signingKey } from "./secrets";

export { AUTHORIZE_PARAM_NAMES, type AuthorizeParams };

// A small single-user OAuth 2.1 authorization server: one pre-registered
// client (ChatGPT), authorization code + PKCE, and signed stateless tokens.

/** The scope that lets a client read and save recipes. */
export const RECIPES_SCOPE = "recipes";
export const SUPPORTED_SCOPES = [RECIPES_SCOPE, "offline_access"];

const CODE_AUDIENCE = "mirandola-recipes:oauth-code";
const REFRESH_AUDIENCE = "mirandola-recipes:oauth-refresh";

const CODE_TTL_SECONDS = 120;
const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 365;

// ChatGPT uses the first URI when the server returns `iss` (we do), and a
// per-connection URI under the second prefix otherwise.
const CHATGPT_REDIRECT_URI = "https://chatgpt.com/connector_platform_oauth_redirect";
const CHATGPT_REDIRECT_PREFIX = "https://chatgpt.com/connector/oauth/";

export class OAuthFailure extends Error {
  constructor(
    readonly code:
      | "invalid_request"
      | "invalid_client"
      | "invalid_grant"
      | "invalid_target"
      | "unsupported_grant_type",
    message: string,
  ) {
    super(message);
  }
}

/** The origin clients reach this app on, as seen through any proxy in front. */
export function publicOrigin(headers: Headers): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) {
    throw new Error("Request has no Host header.");
  }
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${forwardedProto ?? (isLocal ? "http" : "https")}://${host}`;
}

/** The identifier of the MCP endpoint that access tokens are issued for. */
export function mcpResource(origin: string): string {
  return `${origin}/mcp`;
}

export function authorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    scopes_supported: SUPPORTED_SCOPES,
    authorization_response_iss_parameter_supported: true,
  };
}

export function isKnownClient(clientId: string | null | undefined): boolean {
  return !!clientId && safeEqual(clientId, requireEnv("OAUTH_CLIENT_ID"));
}

export function isAllowedRedirectUri(uri: string | null | undefined): uri is string {
  if (!uri) {
    return false;
  }
  if (uri === CHATGPT_REDIRECT_URI || uri.startsWith(CHATGPT_REDIRECT_PREFIX)) {
    return true;
  }
  const extra = (process.env.OAUTH_EXTRA_REDIRECT_URIS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return extra.includes(uri);
}

function sameResource(a: string, b: string): boolean {
  return a.replace(/\/$/, "") === b.replace(/\/$/, "");
}

/** Requested scopes we support, always including the recipes scope. */
function grantScope(requested: string | null | undefined): string {
  const asked = (requested ?? "").split(/\s+/).filter((scope) => SUPPORTED_SCOPES.includes(scope));
  return [...new Set([RECIPES_SCOPE, ...asked])].join(" ");
}

export type AuthorizeCheck =
  /** The request cannot be trusted enough to redirect anywhere. Show a message. */
  | { kind: "reject"; message: string }
  /** The request is malformed. Send the error back to the client. */
  | { kind: "error"; redirectUrl: string }
  | {
      kind: "ok";
      request: { redirectUri: string; state?: string; codeChallenge: string; scope: string };
    };

/** Builds the URL that returns the browser to the client with a code or an error. */
export function clientRedirectUrl(
  redirectUri: string,
  origin: string,
  params: Record<string, string | undefined>,
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries({ ...params, iss: origin })) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export function checkAuthorizeRequest(params: AuthorizeParams, origin: string): AuthorizeCheck {
  if (!isKnownClient(params.client_id)) {
    return { kind: "reject", message: "This app does not recognise the client that sent you here." };
  }
  if (!isAllowedRedirectUri(params.redirect_uri)) {
    return { kind: "reject", message: "The address to return to is not on this app's allowed list." };
  }
  const redirectUri = params.redirect_uri;

  const fail = (error: string, description: string): AuthorizeCheck => ({
    kind: "error",
    redirectUrl: clientRedirectUrl(redirectUri, origin, {
      error,
      error_description: description,
      state: params.state,
    }),
  });

  if (params.response_type !== "code") {
    return fail("unsupported_response_type", "Only response_type=code is supported.");
  }
  if (!params.code_challenge || params.code_challenge_method !== "S256") {
    return fail("invalid_request", "PKCE with code_challenge_method=S256 is required.");
  }
  if (params.resource && !sameResource(params.resource, mcpResource(origin))) {
    return fail("invalid_target", "The requested resource is not this server.");
  }

  return {
    kind: "ok",
    request: {
      redirectUri,
      state: params.state,
      codeChallenge: params.code_challenge,
      scope: grantScope(params.scope),
    },
  };
}

function sign(payload: JWTPayload, audience: string, ttlSeconds: number): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(signingKey());
}

export function issueAuthorizationCode(request: {
  redirectUri: string;
  codeChallenge: string;
  scope: string;
}): Promise<string> {
  return sign(
    {
      jti: randomUUID(),
      redirect_uri: request.redirectUri,
      code_challenge: request.codeChallenge,
      scope: request.scope,
    },
    CODE_AUDIENCE,
    CODE_TTL_SECONDS,
  );
}

async function issueTokens(origin: string, scope: string) {
  const clientId = requireEnv("OAUTH_CLIENT_ID");
  const accessToken = await sign(
    { iss: origin, sub: "owner", client_id: clientId, scope },
    mcpResource(origin),
    ACCESS_TTL_SECONDS,
  );
  const refreshToken = await sign({ scope }, REFRESH_AUDIENCE, REFRESH_TTL_SECONDS);
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refreshToken,
    scope,
  };
}

/** Records a code as used. Returns false when it had been used before. */
async function markCodeUsed(jti: string, expiresAt: Date): Promise<boolean> {
  const db = await getDb();
  await db.delete(oauthUsedCodes).where(lt(oauthUsedCodes.expiresAt, new Date()));
  const inserted = await db
    .insert(oauthUsedCodes)
    .values({ jti, expiresAt })
    .onConflictDoNothing()
    .returning({ jti: oauthUsedCodes.jti });
  return inserted.length === 1;
}

export async function exchangeAuthorizationCode(
  origin: string,
  params: { code?: string; redirectUri?: string; codeVerifier?: string; resource?: string },
) {
  if (!params.code || !params.codeVerifier) {
    throw new OAuthFailure("invalid_request", "code and code_verifier are required.");
  }
  if (params.resource && !sameResource(params.resource, mcpResource(origin))) {
    throw new OAuthFailure("invalid_target", "The requested resource is not this server.");
  }

  const key = signingKey();
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(params.code, key, {
      audience: CODE_AUDIENCE,
      algorithms: ["HS256"],
    }));
  } catch {
    throw new OAuthFailure("invalid_grant", "The authorization code is invalid or has expired.");
  }

  // OAuth 2.1 clients may omit redirect_uri here because PKCE already binds
  // the code to the client. When it is sent, it has to match.
  if (params.redirectUri && payload.redirect_uri !== params.redirectUri) {
    throw new OAuthFailure("invalid_grant", "redirect_uri does not match the authorization request.");
  }
  const challenge = createHash("sha256").update(params.codeVerifier).digest("base64url");
  if (!safeEqual(challenge, String(payload.code_challenge))) {
    throw new OAuthFailure("invalid_grant", "code_verifier does not match the code challenge.");
  }
  if (!payload.jti || !payload.exp) {
    throw new OAuthFailure("invalid_grant", "The authorization code is malformed.");
  }
  if (!(await markCodeUsed(payload.jti, new Date(payload.exp * 1000)))) {
    throw new OAuthFailure("invalid_grant", "The authorization code has already been used.");
  }

  return issueTokens(origin, String(payload.scope));
}

export async function refreshTokens(origin: string, refreshToken: string | undefined) {
  if (!refreshToken) {
    throw new OAuthFailure("invalid_request", "refresh_token is required.");
  }
  const key = signingKey();
  try {
    const { payload } = await jwtVerify(refreshToken, key, {
      audience: REFRESH_AUDIENCE,
      algorithms: ["HS256"],
    });
    return issueTokens(origin, String(payload.scope));
  } catch {
    throw new OAuthFailure("invalid_grant", "The refresh token is invalid or has expired.");
  }
}

export type AccessTokenClaims = { clientId: string; scopes: string[]; expiresAt: number };

/** Returns the token's claims, or null when it is not a valid token for this server. */
export async function verifyAccessToken(
  token: string,
  origin: string,
): Promise<AccessTokenClaims | null> {
  const key = signingKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: origin,
      audience: mcpResource(origin),
      algorithms: ["HS256"],
    });
    if (!payload.exp) {
      return null;
    }
    return {
      clientId: String(payload.client_id),
      scopes: String(payload.scope ?? "").split(" ").filter(Boolean),
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}

/** Checks the client id and secret sent to the token endpoint. */
export function authenticateClient(headers: Headers, form: URLSearchParams): void {
  let clientId = form.get("client_id");
  let clientSecret = form.get("client_secret");

  const basic = headers.get("authorization")?.match(/^Basic\s+(.+)$/i)?.[1];
  if (basic) {
    const decoded = Buffer.from(basic, "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    try {
      clientId = decodeURIComponent(decoded.slice(0, separator));
      clientSecret = decodeURIComponent(decoded.slice(separator + 1));
    } catch {
      throw new OAuthFailure("invalid_client", "The Authorization header is malformed.");
    }
  }

  const secretMatches = !!clientSecret && safeEqual(clientSecret, requireEnv("OAUTH_CLIENT_SECRET"));
  if (!isKnownClient(clientId) || !secretMatches) {
    throw new OAuthFailure("invalid_client", "Unknown client or wrong client secret.");
  }
}
