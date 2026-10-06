import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js runs this before each request. We use it to check the login session.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on every page, but skip images, icons and other static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
