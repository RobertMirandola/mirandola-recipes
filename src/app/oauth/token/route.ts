import {
  authenticateClient,
  exchangeAuthorizationCode,
  OAuthFailure,
  publicOrigin,
  refreshTokens,
} from "@/lib/oauth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

/** Exchanges an authorization code or a refresh token for an access token. */
export async function POST(request: Request): Promise<Response> {
  let form: URLSearchParams;
  try {
    form = new URLSearchParams(await request.text());
  } catch {
    return Response.json(
      { error: "invalid_request", error_description: "The body must be form-encoded." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    authenticateClient(request.headers, form);
    const origin = publicOrigin(request.headers);
    const grant = form.get("grant_type");
    const tokens =
      grant === "authorization_code"
        ? await exchangeAuthorizationCode(origin, {
            code: form.get("code") ?? undefined,
            redirectUri: form.get("redirect_uri") ?? undefined,
            codeVerifier: form.get("code_verifier") ?? undefined,
            resource: form.get("resource") ?? undefined,
          })
        : grant === "refresh_token"
          ? await refreshTokens(origin, form.get("refresh_token") ?? undefined)
          : null;

    if (!tokens) {
      throw new OAuthFailure("unsupported_grant_type", "Use authorization_code or refresh_token.");
    }

    return Response.json(tokens, { headers: NO_STORE });
  } catch (error) {
    if (!(error instanceof OAuthFailure)) {
      throw error;
    }
    const status = error.code === "invalid_client" ? 401 : 400;
    return Response.json(
      { error: error.code, error_description: error.message },
      {
        status,
        headers: {
          ...NO_STORE,
          ...(status === 401 ? { "WWW-Authenticate": "Basic" } : {}),
        },
      },
    );
  }
}
