"use client";

import Meter, { trustColor } from "@/components/Meter";
import {
  accuracy,
  comboMultiplier,
  levelOf,
  levelProgress,
  rankOf,
} from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";

function Stat({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/80 p-5">
      <p className="font-mono text-[11px] tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold" style={{ color }}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

export default function ProfileView({ name }: { name: string }) {
  const { game, answer, reset } = useGame();
  const level = levelOf(game.xp);
  const { into, needed } = levelProgress(game.xp);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neon/40 bg-surface/80 p-6">
        <p className="font-mono text-[11px] tracking-[0.3em] text-muted">
          HUNTER PROFILE · {name.toUpperCase()}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <h1 className="title-gradient text-4xl font-black sm:text-5xl">
            Level {level}
          </h1>
          <p className="font-mono text-lg text-neon">{rankOf(level)}</p>
        </div>
        <div className="mt-4">
          <Meter value={into} max={needed} color="#22e4ff" height="h-3" />
          <p className="mt-2 font-mono text-xs text-muted">
            {into} / {needed} XP to next level · {game.xp} XP total
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="WALLET"
          value={`$${game.wallet.toLocaleString("en-US")}`}
          note="Money scammers have not stolen yet"
          color="#ffc83d"
        />
        <div className="rounded-xl border border-border bg-surface/80 p-5">
          <p className="font-mono text-[11px] tracking-widest text-muted">TRUST</p>
          <p
            className="mt-2 text-3xl font-extrabold"
            style={{ color: trustColor(game.trust) }}
          >
            {game.trust}
            <span className="text-base text-muted"> / 100</span>
          </p>
          <div className="mt-3">
            <Meter value={game.trust} max={100} color={trustColor(game.trust)} />
          </div>
        </div>
        <Stat
          label="STREAK"
          value={`${game.streak}`}
          note={`Best ${game.bestStreak} · bonus x${comboMultiplier(game.streak).toFixed(1)}`}
          color="#ff3df0"
        />
        <Stat
          label="ACCURACY"
          value={`${accuracy(game)}%`}
          note={`${game.correct} of ${game.answered} correct`}
          color="#3dffa2"
        />
      </section>

      {/* TEMPORARY: lets us check that the game state works before the games exist */}
      <section className="rounded-xl border border-dashed border-border p-5">
        <p className="font-mono text-[11px] tracking-widest text-warn">
          TEST PANEL (temporary)
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => answer({ correct: true, xp: 30, trust: 5 })}
            className="rounded-lg border border-safe px-4 py-2 text-sm font-semibold text-safe transition hover:bg-safe/10"
          >
            Spot a scam (+30 XP)
          </button>
          <button
            type="button"
            onClick={() => answer({ correct: false, xp: 0, wallet: -200, trust: -15 })}
            className="rounded-lg border border-danger px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
          >
            Fall for a scam (-$200)
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset all progress?")) reset();
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted transition hover:border-neon hover:text-neon"
          >
            Reset progress
          </button>
        </div>
      </section>
    </div>
  );
}
