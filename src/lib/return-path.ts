/**
 * Where to send someone after login. Only paths inside this app are allowed,
 * so a crafted link cannot bounce a visitor to another site.
 */
export function safeReturnPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/";
  }
  return next;
}
