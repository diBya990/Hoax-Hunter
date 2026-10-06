/** Only allow redirects to pages inside this site (blocks "//evil.com" tricks). */
export function safeNext(value: string | string[] | undefined): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/home";
}
