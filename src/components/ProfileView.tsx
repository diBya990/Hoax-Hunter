"use client";

import Meter, { trustColor } from "@/components/Meter";
import { BOSSES } from "@/lib/bosses";
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
    <div className="rounded-xl border border-border bg-surface/80 p-4">
      <p className="font-mono text-[11px] tracking-widest text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold sm:text-3xl" style={{ color }}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

// This page is built to fit the window exactly: nothing here should scroll.
export default function ProfileView({ name }: { name: string }) {
  const { game, reset } = useGame();
  const level = levelOf(game.xp);
  const { into, needed } = levelProgress(game.xp);

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-4">
      <section className="rounded-xl border border-neon/40 bg-surface/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] tracking-[0.3em] text-muted">
            HUNTER PROFILE · {name.toUpperCase()}
          </p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset all progress?")) reset();
            }}
            className="rounded-md border border-border px-3 py-1 font-mono text-[10px] tracking-widest text-muted transition hover:border-danger hover:text-danger"
          >
            RESET PROGRESS
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <h1 className="title-gradient text-4xl font-black sm:text-5xl">Level {level}</h1>
          <p className="font-mono text-lg text-neon">{rankOf(level)}</p>
        </div>
        <div className="mt-3">
          <Meter value={into} max={needed} color="#22e4ff" height="h-3" />
          <p className="mt-2 font-mono text-xs text-muted">
            {into} / {needed} XP to next level · {game.xp} XP total
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="WALLET"
          value={`$${game.wallet.toLocaleString("en-US")}`}
          note="Not stolen yet"
          color="#ffc83d"
        />
        <div className="rounded-xl border border-border bg-surface/80 p-4">
          <p className="font-mono text-[11px] tracking-widest text-muted">TRUST</p>
          <p
            className="mt-1 text-2xl font-extrabold sm:text-3xl"
            style={{ color: trustColor(game.trust) }}
          >
            {game.trust}
            <span className="text-sm text-muted"> / 100</span>
          </p>
          <div className="mt-2">
            <Meter value={game.trust} max={100} color={trustColor(game.trust)} />
          </div>
        </div>
        <Stat
          label="STREAK"
          value={`${game.streak}`}
          note={`Best ${game.bestStreak} · x${comboMultiplier(game.streak).toFixed(1)}`}
          color="#ff3df0"
        />
        <Stat
          label="ACCURACY"
          value={`${accuracy(game)}%`}
          note={`${game.correct} of ${game.answered} correct`}
          color="#3dffa2"
        />
        <div className="col-span-2 lg:col-span-1">
          <Stat
            label="BOSSES"
            value={`${game.bosses.length} / ${BOSSES.length}`}
            note="Defeated"
            color="#ff3d6e"
          />
        </div>
      </section>
    </div>
  );
}
