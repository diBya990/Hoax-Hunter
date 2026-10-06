import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

// Pages that need a logged-in user.
const protectedPaths = ["/profile"];
// Pages a logged-in user doesn't need to see again.
const authPaths = ["/login", "/signup"];

// Runs before every page load (called from src/proxy.ts).
// 1. Keeps the user's login session fresh.
// 2. Logged out + protected page  -> /login
//    Logged in  + login/signup page -> /home
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

  const path = request.nextUrl.pathname;

  if (!user && protectedPaths.some((p) => path.startsWith(p))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path); // come back here after logging in
    return NextResponse.redirect(url);
  }

  if (user && authPaths.includes(path)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
}
