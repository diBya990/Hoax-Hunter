import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

// Hoax Hunter can only be entered by logging in.
//   "/"      the front page (anyone can see it)
//   "/home"  shows the login / sign-up popup to anyone who is not logged in
//   "/auth/" log-out
// Every other page, and the game APIs, need a logged-in user.
const PUBLIC_PATHS = ["/", "/home"];
const PUBLIC_PREFIXES = ["/auth/"];

// The game APIs are only locked in production, so the local accuracy test
// (eval/run-eval.mjs) can still call them while developing.
const LOCK_APIS = process.env.NODE_ENV === "production";

// Runs before every page load (called from src/proxy.ts).
// 1. Keeps the user's login session fresh.
// 2. Sends anyone who is not logged in to the login popup on /home,
//    remembering where they wanted to go.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Keys not added yet? Let the page load normally.
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Asking for the user also refreshes the session if it's about to expire.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return response;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  if (isPublic) return response;

  if (path.startsWith("/api/")) {
    return LOCK_APIS
      ? NextResponse.json({ error: "Please log in first." }, { status: 401 })
      : response;
  }

  const url = new URL("/home", request.url);
  url.searchParams.set("next", path); // come back here after logging in
  return NextResponse.redirect(url);
}
