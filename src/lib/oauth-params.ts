/** Query parameters the authorization page reads and posts back unchanged. */
export type AuthorizeParams = Partial<
  Record<
    | "response_type"
    | "client_id"
    | "redirect_uri"
    | "state"
    | "code_challenge"
    | "code_challenge_method"
    | "scope"
    | "resource",
    string
  >
>;

export const AUTHORIZE_PARAM_NAMES = [
  "response_type",
  "client_id",
  "redirect_uri",
  "state",
  "code_challenge",
  "code_challenge_method",
  "scope",
  "resource",
] as const satisfies ReadonlyArray<keyof AuthorizeParams>;
