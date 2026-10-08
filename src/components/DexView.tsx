"use client";

import { useState } from "react";
import Link from "next/link";
import MessageBubble from "@/components/MessageBubble";
import Meter from "@/components/Meter";
import { EMPTY_ENTRY, GLYPH, PROTECT_TIPS, statusOf, weakSpots, type DexStatus } from "@/lib/dexInfo";
import { useGame } from "@/lib/gameStore";
import { RED_FLAGS, SCAM_TYPES, getScamType, type ScamType } from "@/lib/scamTypes";
import { SCENARIOS } from "@/lib/scenarios";

// The Scam Dex. It is built to fit the window exactly: nothing here should scroll.

const STATUS_STYLE: Record<DexStatus, { label: string; color: string }> = {
  locked: { label: "LOCKED", color: "#8a9bb8" },
  spotted: { label: "SPOTTED", color: "#ffc83d" },
  mastered: { label: "MASTERED", color: "#3dffa2" },
};

const stars = (n: number) => "●".repeat(n) + "○".repeat(3 - n);

/** One real example message for a scam type, from the game's own scenarios. */
function exampleFor(type: ScamType) {
  return SCENARIOS.find((s) => s.kind === "scam" && s.scamType === type.id);
}

export default function DexView() {
  const { game } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openOnPhone, setOpenOnPhone] = useState(false);

  const entryOf = (id: string) => game.dex[id] ?? EMPTY_ENTRY;
  const found = SCAM_TYPES.filter((t) => statusOf(entryOf(t.id)) !== "locked").length;
  const mastered = SCAM_TYPES.filter((t) => statusOf(entryOf(t.id)) === "mastered").length;
  const weak = weakSpots(game.dex);

  // first unlocked card by default, otherwise the first card
  const defaultId = (SCAM_TYPES.find((t) => statusOf(entryOf(t.id)) !== "locked") ?? SCAM_TYPES[0]).id;
  const selected = getScamType(selectedId ?? defaultId) ?? SCAM_TYPES[0];
  const entry = entryOf(selected.id);
  const status = statusOf(entry);
  const style = STATUS_STYLE[status];
  const example = exampleFor(selected);
  const locked = status === "locked";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-muted">YOUR COLLECTION</p>
          <h1 className="title-gradient text-3xl font-black sm:text-4xl">Scam Dex</h1>
        </div>
        <div className="w-56 max-w-full">
          <div className="flex justify-between font-mono text-[10px] tracking-widest">
            <span className="text-muted">DISCOVERED</span>
            <span className="text-neon">
              {found} / {SCAM_TYPES.length} · {mastered} MASTERED
            </span>
          </div>
          <div className="mt-1">
            <Meter value={found} max={SCAM_TYPES.length} color="#22e4ff" />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* the collection */}
        <div className={`min-h-0 flex-col gap-3 ${openOnPhone ? "hidden lg:flex" : "flex"}`}>
          <div className="grid grid-cols-3 content-start gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {SCAM_TYPES.map((t) => {
              const st = statusOf(entryOf(t.id));
              const s = STATUS_STYLE[st];
              const active = t.id === selected.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(t.id);
                    setOpenOnPhone(true);
                  }}
                  className="flex flex-col items-center rounded-xl border bg-surface/80 px-1.5 py-2 text-center transition hover:-translate-y-0.5 active:scale-95"
                  style={{
                    borderColor: active ? "#22e4ff" : st === "locked" ? "var(--border)" : `${s.color}88`,
                    boxShadow: active ? "0 0 18px rgba(34,228,255,0.35)" : undefined,
                    opacity: st === "locked" ? 0.65 : 1,
                  }}
                >
                  <span
                    className="text-2xl leading-none"
                    style={{ color: st === "locked" ? "#3a4863" : s.color }}
                  >
                    {st === "locked" ? "?" : GLYPH[t.id]}
                  </span>
                  <span className="mt-1.5 line-clamp-2 min-h-[2.1em] text-[11px] font-semibold leading-tight text-foreground">
                    {st === "locked" ? "???" : t.name}
                  </span>
                  <span className="mt-1 font-mono text-[8px] tracking-widest" style={{ color: s.color }}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* weak spots */}
          <div className="rounded-xl border border-border bg-surface/80 p-3">
            <p className="font-mono text-[10px] tracking-widest text-muted">YOUR WEAK SPOTS</p>
            {weak.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted">
                None yet. Play the games and the scams you fall for will show up here.
              </p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {weak.map(({ id, entry: e }) => (
                  <Link
                    key={id}
                    href={`/play/inbox?focus=${id}`}
                    className="rounded-lg border border-danger/60 bg-danger/10 px-3 py-1.5 text-xs transition hover:bg-danger/20"
                  >
                    <span className="font-semibold text-danger">{getScamType(id)?.name}</span>
                    <span className="text-muted">
                      {" "}
                      · fell {e.fell}x, caught {e.caught}x ·{" "}
                    </span>
                    <span className="font-mono font-bold text-neon">PRACTICE →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* the selected card */}
        <div
          className={`min-h-0 flex-col gap-2.5 overflow-hidden rounded-2xl border bg-surface/85 p-4 backdrop-blur ${
            openOnPhone ? "flex" : "hidden lg:flex"
          }`}
          style={{ borderColor: locked ? "var(--border)" : `${style.color}88` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-4xl leading-none" style={{ color: locked ? "#3a4863" : style.color }}>
                {locked ? "?" : GLYPH[selected.id]}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-extrabold text-foreground">
                  {locked ? "Unknown scam" : selected.name}
                </h2>
                <p className="font-mono text-[10px] tracking-widest">
                  <span style={{ color: style.color }}>{style.label}</span>
                  <span className="text-muted"> · DIFFICULTY </span>
                  <span className="text-warn">{stars(selected.difficulty)}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenOnPhone(false)}
              className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted transition hover:border-neon hover:text-neon lg:hidden"
            >
              ← BACK
            </button>
          </div>

          {locked ? (
            <div className="flex flex-1 flex-col justify-center gap-3 text-center">
              <p className="text-sm text-muted">
                You have not met this scam yet. Play a game mode, or check a message in the Scam
                Helper, to discover it.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/play"
                  className="rounded-lg border border-neon px-4 py-2 font-mono text-xs font-bold text-neon transition hover:bg-neon/15"
                >
                  PLAY
                </Link>
                <Link
                  href="/helper"
                  className="rounded-lg border border-border px-4 py-2 font-mono text-xs font-bold text-muted transition hover:border-neon hover:text-neon"
                >
                  SCAM HELPER
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="shrink-0 text-[13px] leading-snug text-foreground">{selected.summary}</p>

              <div className="shrink-0">
                <p className="font-mono text-[10px] tracking-widest text-muted">WARNING SIGNS</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selected.flags.map((f) => (
                    <span
                      key={f}
                      title={RED_FLAGS[f].tip}
                      className="rounded bg-danger/15 px-2 py-0.5 font-mono text-[10px] font-bold text-danger"
                    >
                      ⚑ {RED_FLAGS[f].label}
                    </span>
                  ))}
                </div>
              </div>

              {example && (
                <div className="shrink-0 [@media(max-height:780px)]:hidden">
                  <p className="font-mono text-[10px] tracking-widest text-muted">EXAMPLE</p>
                  <div className="mt-1 max-h-24 overflow-hidden">
                    <MessageBubble text={example.text} />
                  </div>
                </div>
              )}

              <div className="min-h-0 overflow-hidden">
                <p className="font-mono text-[10px] tracking-widest text-muted">PROTECT YOURSELF</p>
                <ul className="mt-1 space-y-1">
                  {PROTECT_TIPS[selected.id].map((tip) => (
                    <li key={tip} className="flex gap-2 text-[12px] leading-snug text-foreground">
                      <span className="text-safe">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto flex shrink-0 items-center justify-between gap-2">
                <p className="font-mono text-[10px] tracking-widest text-muted">
                  CAUGHT <span className="text-safe">{entry.caught}</span> · FELL{" "}
                  <span className="text-danger">{entry.fell}</span> · HELPER{" "}
                  <span className="text-neon">{entry.helper}</span>
                </p>
                <Link
                  href={`/play/inbox?focus=${selected.id}`}
                  className="rounded-lg border border-neon px-3 py-1.5 font-mono text-[11px] font-bold text-neon transition hover:bg-neon/15"
                >
                  PRACTICE →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
