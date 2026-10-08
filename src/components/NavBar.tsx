"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { isMuted, setMuted, subscribeMuted } from "@/lib/sound";

const links = [
  { href: "/play", label: "Play" },
  { href: "/helper", label: "Scam Helper" },
  { href: "/dex", label: "Scam Dex" },
  { href: "/profile", label: "Profile" },
];

export default function NavBar({ userName }: { userName: string | null }) {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/70 backdrop-blur-md">
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/home"
          className="logo-hover font-mono text-xl font-bold tracking-wide text-neon neon-text sm:text-2xl"
        >
          HOAX//HUNTER
        </Link>
        <ul className="flex items-center gap-3 text-sm text-muted sm:gap-7 sm:text-lg">
          {/* the menu is only for logged-in players */}
          {userName &&
            links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="nav-link font-medium"
              >
                {l.label}
              </Link>
            </li>
          ))}
          {userName ? (
            <li className="flex items-center gap-3">
              <span className="hidden max-w-32 truncate font-mono text-sm text-neon md:inline">
                {userName}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="sfx-btn rounded-md border border-border px-3 py-2 font-mono text-xs sm:text-sm"
                >
                  LOG OUT
                </button>
              </form>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              aria-label={muted ? "Unmute sound" : "Mute sound"}
              className="sfx-btn rounded-md border border-border px-3 py-2 font-mono text-xs sm:text-sm"
            >
              {muted ? "SFX OFF" : "SFX ON"}
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
