import {
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  localhostAllowedOrigins,
  OAuthError,
  OAuthErrorCode,
  originValidationResponse,
  requireBearerAuth,
} from "@modelcontextprotocol/server";
import { createRecipesServer } from "@/lib/mcp-server";
import { mcpResource, publicOrigin, RECIPES_SCOPE, verifyAccessToken } from "@/lib/oauth";

export const dynamic = "force-dynamic";

const handler = createMcpHandler(createRecipesServer);

/** Hostnames a browser may call this endpoint from: localhost, plus this app. */
function allowedOriginHostnames(request: Request): string[] {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const hostname = host.replace(/:\d+$/, "");
  return [...new Set([...localhostAllowedOrigins(), hostname].filter(Boolean))];
}

async function handle(request: Request): Promise<Response> {
  const rejected = originValidationResponse(request, allowedOriginHostnames(request));
  if (rejected) {
    return rejected;
  }

  const origin = publicOrigin(request.headers);
  const resource = new URL(mcpResource(origin));
  const auth = await requireBearerAuth({
    verifier: {
      verifyAccessToken: async (token) => {
        const claims = await verifyAccessToken(token, origin);
        if (!claims) {
          throw new OAuthError(
            OAuthErrorCode.InvalidToken,
            "The access token is invalid or has expired.",
          );
        }
        return {
          token,
          clientId: claims.clientId,
          scopes: claims.scopes,
          expiresAt: claims.expiresAt,
          resource,
        };
      },
    },
    requiredScopes: [RECIPES_SCOPE],
    expectedResource: resource,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resource),
  })(request);

  if (auth instanceof Response) {
    return auth;
  }
  return handler.fetch(request, { authInfo: auth });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
