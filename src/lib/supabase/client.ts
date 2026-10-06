import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

// Use this in components that run in the browser ("use client").
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
