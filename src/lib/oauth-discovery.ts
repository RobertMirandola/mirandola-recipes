import {
  buildOAuthProtectedResourceMetadata,
  oauthMetadataResponse,
  type AuthMetadataOptions,
} from "@modelcontextprotocol/server";
import { authorizationServerMetadata, mcpResource, publicOrigin, SUPPORTED_SCOPES } from "./oauth";

/** Discovery documents for the MCP resource server and its authorization server. */
export function authMetadataOptions(request: Request): AuthMetadataOptions {
  const origin = publicOrigin(request.headers);
  return {
    oauthMetadata: authorizationServerMetadata(origin),
    resourceServerUrl: new URL(mcpResource(origin)),
    scopesSupported: SUPPORTED_SCOPES,
    resourceName: "Mirandola Recipes",
    // The local server is http://localhost. Production on Vercel is https.
    dangerouslyAllowInsecureIssuerUrl: process.env.NODE_ENV !== "production",
  };
}

/** Serves a well-known OAuth document, or 404 when the path is not one. */
export function discoveryResponse(request: Request): Response {
  const options = authMetadataOptions(request);
  const served = oauthMetadataResponse(request, options);
  if (served) {
    return served;
  }

  // Some clients probe the origin root before the path-specific document.
  const { pathname } = new URL(request.url);
  if (request.method === "GET" && pathname === "/.well-known/oauth-protected-resource") {
    return Response.json(buildOAuthProtectedResourceMetadata(options), {
      headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" },
    });
  }

  return new Response("Not found", { status: 404 });
}
