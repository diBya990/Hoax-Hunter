/**
 * Where to go after logging in. Only pages inside this site are allowed (this
 * blocks "//evil.com" tricks), and the old /login and /signup addresses lead
 * to the hub, since the login now happens in a popup there.
 */
export function safeNext(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/home";
  const path = value.split("?")[0];
  if (["/", "/login", "/signup"].includes(path) || path.startsWith("/auth/")) return "/home";
  return value;
}
