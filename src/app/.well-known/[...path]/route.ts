import { discoveryResponse } from "@/lib/oauth-discovery";

export const dynamic = "force-dynamic";

/** OAuth discovery documents under /.well-known/. */
function respond(request: Request): Response {
  return discoveryResponse(request);
}

export const GET = respond;
export const OPTIONS = respond;
