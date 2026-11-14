import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTHORIZE_PARAM_NAMES,
  type AuthorizeParams,
  checkAuthorizeRequest,
  publicOrigin,
} from "@/lib/oauth";
import { hasSession } from "@/lib/session";
import { AuthorizeForm } from "./authorize-form";

export const metadata: Metadata = { title: "Connect ChatGPT" };

function first(value: string | string[] | undefined): string | undefined {
  const picked = Array.isArray(value) ? value[0] : value;
  return picked && picked.length > 0 ? picked : undefined;
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params: AuthorizeParams = {};
  for (const name of AUTHORIZE_PARAM_NAMES) {
    params[name] = first(query[name]);
  }

  const origin = publicOrigin(await headers());
  const check = checkAuthorizeRequest(params, origin);
  if (check.kind === "error") {
    redirect(check.redirectUrl);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-6 py-16">
      <h1 className="text-[32px] leading-tight font-bold tracking-tight">Connect ChatGPT</h1>
      {check.kind === "reject" ? (
        <p className="mt-3 text-sm text-muted" role="alert">
          {check.message}
        </p>
      ) : (
        <>
          <p className="mt-1 mb-6 text-sm text-muted">
            ChatGPT is asking to read your recipes and save new ones.
            {!(await hasSession()) && " Enter the app password to allow it."}
          </p>
          <AuthorizeForm params={params} signedIn={await hasSession()} />
        </>
      )}
    </main>
  );
}
