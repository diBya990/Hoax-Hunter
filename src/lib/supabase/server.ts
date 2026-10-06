import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./config";

// Use this in server code: pages, layouts and route handlers.
// The login session lives in cookies, so we hand Supabase the cookie jar.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Pages can't set cookies. That's fine: proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/** The logged-in user, or null (also null if Supabase keys are not set yet). */
export async function getCurrentUser() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
