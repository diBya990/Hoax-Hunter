"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Meter from "@/components/Meter";
import type { HelperResult } from "@/app/api/analyze/route";
import { useGame } from "@/lib/gameStore";
import { prepareImage, type PreparedImage } from "@/lib/imageUtil";
import { AI_WEIGHT, RULE_WEIGHT, type Level } from "@/lib/riskEngine";
import { RED_FLAGS, getScamType, type RedFlagId } from "@/lib/scamTypes";
import { playClick, playCorrect, playWrong } from "@/lib/sound";

// The Scam Helper screen. It is built to fit the window exactly: nothing here should scroll.

const SAMPLES = [
  {
    label: "Fake bank alert",
    text: "URGENT: Your bank account has been suspended. Verify your identity now: http://secure-bank-login.top/verify",
  },
  {
    label: "Real code message",
    text: "Your verification code is 482913. Do not share this code with anyone. It expires in 10 minutes.",
  },
  {
    label: "Job offer",
    text: "Earn $400 per day from home! No experience needed. Just pay a one-time $80 registration fee to get started.",
  },
];

const LEVEL_STYLE: Record<Level, { color: string; title: string; sub: string }> = {
  low: { color: "#3dffa2", title: "LOW RISK", sub: "This looks like a normal message." },
  suspicious: { color: "#ffc83d", title: "SUSPICIOUS", sub: "Be careful. Check before you act." },
  dangerous: { color: "#ff3d6e", title: "DANGEROUS", sub: "Very likely a scam." },
};

// shown when the AI could not provide its own advice
const FALLBACK_STEPS: Record<Level, string[]> = {
  dangerous: [
    "Do not click any link or reply to this message.",
    "Never share codes, passwords or card details.",
    "Contact the company with its official app or the number on your card.",
    "Block the sender and report the message.",
  ],
  suspicious: [
    "Do not click links in the message.",
    "Check with the sender through an official channel first.",
    "Do not send money or codes until you are sure.",
    "If it still feels wrong, block and report it.",
  ],
  low: [
    "This looks like a normal message.",
    "Still, open official apps yourself instead of using links.",
    "Never share codes or passwords with anyone.",
  ],
};

type Flag = { flag: RedFlagId; evidence: string; why: string };

/** The AI's flags first, then any flags only the rule engine found. */
function collectFlags(r: HelperResult): Flag[] {
  const flags: Flag[] = (r.ai?.flags ?? []).map((f) => ({ ...f }));
  for (const s of r.signals) {
    if (s.points <= 0 || flags.some((f) => f.flag === s.flag)) continue;
    flags.push({ flag: s.flag, evidence: s.evidence[0] ?? "", why: RED_FLAGS[s.flag].tip });
  }
  return flags;
}

function Gauge({ score, color }: { score: number; color: string }) {
  const radius = 50;
  const circ = 2 * Math.PI * radius;
  const dash = (circ * score) / 100;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="11" />
        <circle
          key={score}
          className="gauge-ring"
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ ["--circ" as string]: circ, filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black" style={{ color }}>
          {score}
        </span>
        <span className="font-mono text-[9px] tracking-widest text-muted">/ 100</span>
      </div>
    </div>
  );
}

function ResultPanel({ r, onBack }: { r: HelperResult; onBack: () => void }) {
  const style = LEVEL_STYLE[r.level];
  const flags = collectFlags(r).slice(0, 4);
  const steps = (r.ai?.nextSteps.length ? r.ai.nextSteps : FALLBACK_STEPS[r.level]).slice(0, 4);
  const scamType = r.ai ? getScamType(r.ai.scamType) : undefined;
  const summary =
    r.ai?.summary ??
    (r.signals.some((s) => s.points > 0)
      ? "The rule check found warning signs in this message. The AI could not double-check it right now."
      : "The rule check found no warning signs. The AI could not double-check it right now.");

  return (
    <div className="slide-in flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      {/* verdict */}
      <div className="flex shrink-0 items-center gap-4">
        <Gauge score={r.score} color={style.color} />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-black tracking-wide" style={{ color: style.color }}>
            {style.title}
          </p>
          <p className="text-xs text-muted">{style.sub}</p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-foreground">{summary}</p>
          {scamType && (
            <span className="mt-1.5 inline-block rounded border border-warn px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-warn">
              LOOKS LIKE: {scamType.name.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {r.source === "rules-only" && (
        <p className="shrink-0 rounded-lg border border-warn/50 bg-warn/10 px-3 py-1.5 text-xs text-warn">
          The AI is busy, so this result uses the rule check only.
        </p>
      )}

      {/* how the score was made (hidden on short windows to save room) */}
      <div className="shrink-0 rounded-xl border border-border bg-black/30 px-3 py-2 [@media(max-height:760px)]:hidden">
        <p className="font-mono text-[10px] tracking-widest text-muted">
          HOW THE SCORE WAS MADE · {Math.round(RULE_WEIGHT * 100)}% RULES + {Math.round(AI_WEIGHT * 100)}% AI
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between font-mono text-[10px] tracking-widest">
              <span className="text-muted">RULE CHECK</span>
              <span className="text-neon">{r.ruleScore ?? "-"}</span>
            </div>
            <div className="mt-1">
              <Meter value={r.ruleScore ?? 0} max={100} color="#22e4ff" />
            </div>
          </div>
          <div>
            <div className="flex justify-between font-mono text-[10px] tracking-widest">
              <span className="text-muted">AI ANALYSIS</span>
              <span className="text-magenta">{r.aiScore ?? "busy"}</span>
            </div>
            <div className="mt-1">
              <Meter value={r.aiScore ?? 0} max={100} color="#ff3df0" />
            </div>
          </div>
        </div>
      </div>

      {/* warning signs and what to do, side by side. Anything that does not fit is clipped, never overlapped. */}
      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden sm:grid-cols-2">
        <div className="order-2 min-h-0 overflow-hidden sm:order-1">
          <p className="font-mono text-[10px] tracking-widest text-muted">WARNING SIGNS</p>
          {flags.length === 0 ? (
            <p className="mt-1.5 text-xs text-muted">No warning signs found.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {flags.slice(0, 3).map((f, i) => (
                <li
                  key={f.flag}
                  className={`rounded-lg border border-border bg-black/30 px-2.5 py-1.5 ${
                    i >= 2 ? "[@media(max-height:820px)]:hidden" : ""
                  }`}
                >
                  <p className="text-xs font-semibold text-danger">⚑ {RED_FLAGS[f.flag].label}</p>
                  {f.evidence && (
                    <p className="truncate text-[11px] italic text-neon">&quot;{f.evidence}&quot;</p>
                  )}
                  <p className="line-clamp-2 text-[11px] leading-tight text-muted">
                    {f.why || RED_FLAGS[f.flag].tip}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="order-1 min-h-0 overflow-hidden sm:order-2">
          <p className="font-mono text-[10px] tracking-widest text-muted">WHAT TO DO NOW</p>
          <ol className="mt-1.5 space-y-1.5">
            {steps.map((s, i) => (
              <li
                key={i}
                className={`flex gap-2 text-[13px] leading-snug text-foreground ${
                  i >= 3 ? "[@media(max-height:820px)]:hidden" : ""
                }`}
              >
                <span className="font-mono font-bold" style={{ color: style.color }}>
                  {i + 1}.
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <Link
          href="/play"
          className="font-mono text-[11px] font-bold tracking-widest text-neon hover:underline"
        >
          TRAIN ON SCAMS LIKE THIS →
        </Link>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-4 py-1.5 font-mono text-[11px] font-bold tracking-widest text-muted transition hover:border-neon hover:text-neon lg:hidden"
        >
          ← NEW CHECK
        </button>
      </div>
    </div>
  );
}

export default function HelperView() {
  const { recordDex } = useGame();
  const [text, setText] = useState("");
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HelperResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addImage(file: File) {
    setError(null);
    try {
      setImage(await prepareImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that picture.");
    }
  }

  async function analyze() {
    if (loading || (!text.trim() && !image)) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          image: image ? { mimeType: image.mimeType, data: image.data } : undefined,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
      const r = data as HelperResult;
      setResult(r);
      // a scam the Helper found counts as "seen in the wild" in the Scam Dex
      if (r.ai && r.level !== "low" && getScamType(r.ai.scamType)) recordDex(r.ai.scamType, "helper");
      if (r.level === "dangerous") playWrong();
      else if (r.level === "low") playCorrect();
      else playClick();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  const showRight = loading || result !== null || error !== null;
  const canAnalyze = !loading && (text.trim().length > 0 || image !== null);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div>
        <p className="font-mono text-[11px] tracking-[0.3em] text-muted">REAL-WORLD TOOL</p>
        <h1 className="title-gradient text-3xl font-black sm:text-4xl">Scam Helper</h1>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2">
        {/* input */}
        <div
          className={`min-h-0 flex-col gap-3 rounded-2xl border border-neon/40 bg-surface/85 p-4 backdrop-blur ${
            showRight ? "hidden lg:flex" : "flex"
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) void addImage(file);
          }}
        >
          <p className="font-mono text-[11px] tracking-widest text-muted">
            PASTE A MESSAGE, LINK OR SCREENSHOT
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
              if (file) {
                e.preventDefault();
                void addImage(file);
              }
            }}
            maxLength={4000}
            placeholder="Paste the SMS, email, chat message or link you are unsure about..."
            className="field min-h-24 flex-1 resize-none text-sm leading-relaxed"
          />

          {image ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-black/30 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.preview} alt="Your screenshot" className="h-12 w-12 rounded object-cover" />
              <p className="min-w-0 flex-1 truncate text-xs text-foreground">Screenshot added</p>
              <button
                type="button"
                onClick={() => setImage(null)}
                className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted transition hover:border-danger hover:text-danger"
              >
                REMOVE
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted transition hover:border-neon hover:text-neon"
            >
              + Add a screenshot (or drop or paste one here)
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void addImage(file);
              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tracking-widest text-muted">TRY:</span>
            {SAMPLES.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setText(s.text)}
                className="rounded-full border border-border px-3 py-1 text-[11px] text-muted transition hover:border-neon hover:text-neon"
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void analyze()}
            disabled={!canAnalyze}
            className="start-btn !py-3 !text-base disabled:opacity-50"
          >
            {loading ? "CHECKING..." : "CHECK THIS MESSAGE"}
          </button>
        </div>

        {/* result */}
        <div
          className={`min-h-0 overflow-hidden rounded-2xl border border-border bg-surface/85 p-4 backdrop-blur ${
            showRight ? "block" : "hidden lg:block"
          }`}
        >
          {loading && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-neon/20 border-t-neon" />
              <p className="mt-4 text-lg font-bold text-neon">Checking this message...</p>
              <p className="mt-1 max-w-xs text-sm text-muted">
                Scanning links and wording, then asking the AI to double-check. This can take a few
                seconds.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-lg font-bold text-danger">Could not check this message</p>
              <p className="mt-1 max-w-sm text-sm text-muted">{error}</p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 rounded-lg border border-neon px-4 py-2 font-mono text-xs font-bold text-neon transition hover:bg-neon/15"
              >
                TRY AGAIN
              </button>
            </div>
          )}

          {!loading && !error && result && <ResultPanel r={result} onBack={reset} />}

          {!loading && !error && !result && (
            <div className="flex h-full flex-col justify-center gap-3">
              <p className="font-mono text-[11px] tracking-widest text-muted">HOW IT WORKS</p>
              {[
                ["1", "Rule check", "Our own code scans links, wording and pressure tricks."],
                ["2", "AI double-check", "The AI reads it too, and can read screenshots."],
                ["3", "Risk score + advice", "You get a 0-100 score, the warning signs and what to do."],
              ].map(([n, title, text]) => (
                <div key={n} className="flex gap-3 rounded-xl border border-border bg-black/30 p-3">
                  <span className="font-mono text-xl font-black text-neon">{n}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{title}</p>
                    <p className="text-xs text-muted">{text}</p>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-muted">
                Never paste real passwords or card numbers. A check helps you decide, but it cannot
                prove who sent a message.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
