"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type AuthFormProps = {
  mode: "login" | "signup";
  next: string; // where to go after logging in
};

// One form used by both /login and /signup (email + password only).
export default function AuthForm({ mode, next }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    setError("");
    setMessage("");

    if (!isSupabaseConfigured) {
      setError("Supabase isn't connected yet. Add your keys to .env.local and restart the app.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }, // saved on the user, shown in the nav bar
      });
      setLoading(false);
      if (error) return setError(error.message);

      // If email confirmation is ON in Supabase, there is no session yet
      if (!data.session) {
        return setMessage("Almost there! Check your email and click the link to confirm your account.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
    }

    router.push(next);
    router.refresh(); // so the nav bar picks up the new login
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-neon/40 bg-surface/85 p-8 shadow-[0_0_50px_rgba(34,228,255,0.15)] backdrop-blur">
      <p className="font-mono text-[11px] tracking-[0.3em] text-muted">
        {isSignup ? "NEW HUNTER" : "WELCOME BACK"}
      </p>
      <h1 className="title-gradient mt-1 text-3xl font-black">
        {isSignup ? "Create account" : "Log in"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {isSignup
          ? "Join to keep your hunter profile."
          : "Log in to see your hunter profile."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {isSignup && (
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Hunter name</span>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
              required
              autoComplete="nickname"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Email</span>
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Password</span>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignup ? "At least 6 characters" : "Your password"}
            minLength={6}
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </label>

        {error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-safe/40 bg-safe/10 px-3 py-2 text-sm text-safe">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="start-btn w-full !px-4 !py-3 !text-base disabled:opacity-60"
        >
          {loading ? "PLEASE WAIT..." : isSignup ? "CREATE ACCOUNT" : "LOG IN"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-semibold text-neon hover:underline"
        >
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
