// Your Supabase keys come from the .env.local file (never from the code).
// NEXT_PUBLIC_ means the value is allowed to be sent to the browser.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// True once .env.local is filled in. Lets the app show a friendly message
// instead of crashing while the keys are still missing.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
