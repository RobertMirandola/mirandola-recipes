"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTHORIZE_PARAM_NAMES,
  type AuthorizeParams,
  checkAuthorizeRequest,
  clientRedirectUrl,
  issueAuthorizationCode,
  publicOrigin,
} from "@/lib/oauth";
import { isAppPassword } from "@/lib/secrets";
import { hasSession, startSession } from "@/lib/session";

export type AuthorizeState = { error: string | null };

function paramsFromForm(formData: FormData): AuthorizeParams {
  const params: AuthorizeParams = {};
  for (const name of AUTHORIZE_PARAM_NAMES) {
    const value = formData.get(name);
    if (typeof value === "string" && value.length > 0) {
      params[name] = value;
    }
  }
  return params;
}

/** Approves or refuses the OAuth request ChatGPT sent the browser here with. */
export async function decideAuthorization(
  _previous: AuthorizeState,
  formData: FormData,
): Promise<AuthorizeState> {
  const origin = publicOrigin(await headers());
  const check = checkAuthorizeRequest(paramsFromForm(formData), origin);
  if (check.kind === "reject") {
    return { error: check.message };
  }
  if (check.kind === "error") {
    redirect(check.redirectUrl);
  }

  const { redirectUri, state, codeChallenge, scope } = check.request;
  if (formData.get("decision") === "deny") {
    redirect(clientRedirectUrl(redirectUri, origin, { error: "access_denied", state }));
  }
  if (formData.get("decision") !== "allow") {
    return { error: "Choose Allow or Cancel." };
  }

  if (!(await hasSession())) {
    const password = String(formData.get("password") ?? "");
    if (!isAppPassword(password)) {
      return { error: "That password did not match. Try again." };
    }
    await startSession();
  }

  const code = await issueAuthorizationCode({ redirectUri, codeChallenge, scope });
  redirect(clientRedirectUrl(redirectUri, origin, { code, state }));
}
