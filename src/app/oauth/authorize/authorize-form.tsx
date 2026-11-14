"use client";

import { useActionState, useState } from "react";
import { AUTHORIZE_PARAM_NAMES, type AuthorizeParams } from "@/lib/oauth-params";
import { decideAuthorization, type AuthorizeState } from "./actions";

const initialState: AuthorizeState = { error: null };

export function AuthorizeForm({
  params,
  signedIn,
}: {
  params: AuthorizeParams;
  signedIn: boolean;
}) {
  const [state, formAction, pending] = useActionState(decideAuthorization, initialState);
  const [decision, setDecision] = useState<"allow" | "deny" | null>(null);

  return (
    <form action={formAction} className="space-y-3">
      {AUTHORIZE_PARAM_NAMES.map((name) =>
        params[name] ? <input key={name} type="hidden" name={name} value={params[name]} /> : null,
      )}
      {!signedIn && (
        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm text-muted">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            aria-describedby={state.error ? "authorize-error" : undefined}
            aria-invalid={state.error ? true : undefined}
            className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
      )}
      {state.error && (
        <p id="authorize-error" role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="deny"
          disabled={pending}
          onClick={() => setDecision("deny")}
          className="rounded px-3 py-1.5 text-sm hover:bg-hover disabled:opacity-60"
        >
          {pending && decision === "deny" ? "Cancelling…" : "Cancel"}
        </button>
        <button
          type="submit"
          name="decision"
          value="allow"
          disabled={pending}
          onClick={() => setDecision("allow")}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {pending && decision === "allow" ? "Connecting…" : "Allow"}
        </button>
      </div>
    </form>
  );
}
