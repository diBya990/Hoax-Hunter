"use client";

import Meter, { trustColor } from "@/components/Meter";
import { levelOf, levelProgress, rankOf, comboMultiplier } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";

// Compact one-row status bar: level + XP, wallet, trust, streak.
export default function Hud({ className = "mt-3" }: { className?: string }) {
  const { game } = useGame();
  const level = levelOf(game.xp);
  const { into, needed } = levelProgress(game.xp);

  return (
    <div className={`mx-auto ${className} flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border border-border bg-surface/70 px-4 py-2 backdrop-blur`}>
      <div className="w-40">
        <div className="flex justify-between font-mono text-[10px] tracking-widest">
          <span className="text-neon">LV {level}</span>
          <span className="text-muted">{rankOf(level).toUpperCase()}</span>
        </div>
        <div className="mt-1">
          <Meter value={into} max={needed} color="#22e4ff" />
        </div>
      </div>

      <div className="font-mono text-xs">
        <span className="text-muted">WALLET </span>
        <span className="font-bold text-warn">${game.wallet.toLocaleString("en-US")}</span>
      </div>

      <div className="w-32">
        <div className="flex justify-between font-mono text-[10px] tracking-widest">
          <span className="text-muted">TRUST</span>
          <span style={{ color: trustColor(game.trust) }}>{game.trust}</span>
        </div>
        <div className="mt-1">
          <Meter value={game.trust} max={100} color={trustColor(game.trust)} />
        </div>
      </div>

      <div className="font-mono text-xs">
        <span className="text-muted">STREAK </span>
        <span className="font-bold text-magenta">
          {game.streak}
          {game.streak > 0 && ` · x${comboMultiplier(game.streak).toFixed(1)}`}
        </span>
      </div>
    </div>
  );
}
