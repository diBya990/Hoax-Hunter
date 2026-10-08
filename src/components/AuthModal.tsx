"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// The login / sign-up popup. It opens on /home whenever nobody is logged in and
// has no close button: Hoax Hunter can only be entered by logging in.
// Signing up logs you in straight away.
export default function AuthModal({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isSignup = mode === "signup";

  function switchMode(m: "login" | "signup") {
    setMode(m);
    setError("");
    setMessage("");
  }

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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }, // saved on the user, shown in the nav bar
      });
      if (signUpError) {
        setLoading(false);
        return setError(signUpError.message);
      }

      // No session yet? Then log in right away (this works when e-mail confirmation is off).
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setLoading(false);
          switchMode("login");
          return setMessage("Account created! Please confirm your e-mail, then log in.");
        }
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setLoading(false);
        return setError(signInError.message);
      }
    }

    // logged in: go where the player was heading (the hub by default)
    router.replace(next);
    router.refresh(); // so the whole app sees the new login
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isSignup ? "Create your account" : "Log in"}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
    >
      <div className="slide-in w-full max-w-md rounded-2xl border border-neon/50 bg-surface/95 p-6 shadow-[0_0_60px_rgba(34,228,255,0.25)]">
        <p className="text-center font-mono text-[11px] tracking-[0.3em] text-muted">
          HOAX//HUNTER ACCESS
        </p>
        <h1 className="title-gradient mt-1 text-center text-3xl font-black">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted">
          {isSignup
            ? "Sign up to start hunting scams. You will be logged in right away."
            : "Log in to continue your hunt."}
        </p>

        {/* tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-black/30 p-1 font-mono text-xs font-bold tracking-widest">
          {(["signup", "login"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`rounded-lg py-2 transition ${
                mode === m ? "bg-neon/20 text-neon" : "text-muted hover:text-foreground"
              }`}
            >
              {m === "signup" ? "SIGN UP" : "LOG IN"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {isSignup && (
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Hunter name</span>
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                required
                autoComplete="nickname"
                autoFocus
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm text-muted">Email</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus={!isSignup}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-muted">Password</span>
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
            {loading ? "PLEASE WAIT..." : isSignup ? "CREATE ACCOUNT & ENTER" : "LOG IN"}
          </button>
        </form>
      </div>
    </div>
  );
}
