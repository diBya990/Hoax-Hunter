"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Hero3D from "@/components/Hero3D";
import Transition, { TRANSITION_MS } from "@/components/Transition";
import { playStart } from "@/lib/sound";

// Title screen. START plays a power-up sound and the portal transition,
// then opens the hub.
export default function TitleScreen() {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);

  function handleStart() {
    if (launching) return;
    setLaunching(true);
    playStart();
    setTimeout(() => router.push("/home"), TRANSITION_MS);
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {launching && <Transition />}

      {/* top bar */}
      <header className="flex items-center justify-between px-6 py-5 lg:px-14">
        <span className="font-mono text-lg font-bold tracking-wide text-neon neon-text">
          HOAX//HUNTER
        </span>
        <nav className="hidden gap-2 rounded-full border border-border bg-surface/60 px-2 py-1.5 font-mono text-[11px] tracking-widest text-muted backdrop-blur md:flex">
          <span className="rounded-full bg-neon/15 px-4 py-1 text-neon">GAMEPLAY</span>
          <span className="px-4 py-1">SCAM HELPER</span>
          <span className="px-4 py-1">SCAM DEX</span>
        </nav>
        <span className="rounded-full border border-neon/60 px-4 py-1.5 font-mono text-[11px] tracking-widest text-neon">
          FORGEHACKS 2026
        </span>
      </header>

      {/* hero */}
      <main className="grid flex-1 items-center gap-2 px-6 lg:grid-cols-2 lg:px-14">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p className="font-mono text-[11px] tracking-[0.45em] text-muted">
            AI-POWERED SCAM SURVIVAL
          </p>
          <h1 className="title-gradient mt-4 text-5xl font-black uppercase leading-[0.95] sm:text-7xl lg:text-8xl">
            Outsmart
            <br />
            every scam
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm text-muted sm:text-base lg:mx-0">
            Scammers are getting smarter. Train your instincts in four game
            modes, then let the AI Scam Helper check the real messages you get.
          </p>
          <button type="button" onClick={handleStart} className="start-btn mt-8">
            START
          </button>
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          <div className="relative h-[250px] w-full sm:h-[380px] lg:h-[560px]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.5] sm:scale-[0.72] lg:scale-100">
              <Hero3D />
            </div>
          </div>
        </div>
      </main>

      {/* bottom bar */}
      <footer className="hidden items-end justify-between px-6 pb-6 sm:flex lg:px-14">
        <div className="relative h-20 w-20">
          <svg viewBox="0 0 100 100" className="spin-slow h-full w-full">
            <defs>
              <path id="ringPath" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" />
            </defs>
            <text className="fill-neon font-mono" fontSize="9.5" letterSpacing="3">
              <textPath href="#ringPath">TRAIN • DETECT • SURVIVE •</textPath>
            </text>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-neon">
            ⚑
          </span>
        </div>
        <div className="flex gap-3 font-mono text-[11px] tracking-widest text-muted">
          <span className="rounded-lg border border-border bg-surface/60 px-4 py-2 backdrop-blur">
            PLAY IN BROWSER
          </span>
          <span className="rounded-lg border border-border bg-surface/60 px-4 py-2 backdrop-blur">
            FREE &amp; AI-POWERED
          </span>
        </div>
      </footer>
    </div>
  );
}
