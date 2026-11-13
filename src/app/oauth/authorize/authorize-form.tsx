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
    <form action={formAction} className="space-y-4">
      {AUTHORIZE_PARAM_NAMES.map((name) =>
        params[name] ? <input key={name} type="hidden" name={name} value={params[name]} /> : null,
      )}
      {!signedIn && (
        <div className="space-y-2">
          <label htmlFor="password" className="block font-medium">
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
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-lg"
          />
        </div>
      )}
      {state.error && (
        <p id="authorize-error" role="alert" className="text-accent">
          {state.error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          name="decision"
          value="deny"
          disabled={pending}
          onClick={() => setDecision("deny")}
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-lg font-semibold disabled:opacity-60"
        >
          {pending && decision === "deny" ? "Cancelling…" : "Cancel"}
        </button>
        <button
          type="submit"
          name="decision"
          value="allow"
          disabled={pending}
          onClick={() => setDecision("allow")}
          className="flex-1 rounded-xl bg-accent px-4 py-3 text-lg font-semibold text-accent-ink disabled:opacity-60"
        >
          {pending && decision === "allow" ? "Connecting…" : "Allow"}
        </button>
      </div>
    </form>
  );
}
