"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BossDuel from "@/components/boss/BossDuel";
import BossSpot from "@/components/boss/BossSpot";
import BossStrike from "@/components/boss/BossStrike";
import Hud from "@/components/Hud";
import Meter from "@/components/Meter";
import {
  BOSSES,
  isUnlocked,
  nextBoss,
  spotCount,
  spotFallback,
  spotUrl,
  strikeFallback,
  strikeUrl,
  type Boss,
} from "@/lib/bosses";
import { applyAnswer, levelOf, type AnswerResult } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";
import { getPersona } from "@/lib/personas";
import { prefetch, take } from "@/lib/scenarioClient";
import type { Scenario } from "@/lib/scenarioTypes";
import { playLevelUp, playWrong } from "@/lib/sound";

// This screen is built to fit the window exactly: nothing here should scroll.
//
// One boss fight = three phases, one health bar, one set of hearts:
//   SPOT (with the boss's own rule)  ->  STRIKE (tap the red flags)  ->  DUEL (live chat)

type Stage = "spot" | "strike" | "duel";
type Phase = "select" | "loading" | "briefing" | Stage | "victory" | "defeat";

type Ending = { dXp: number; dWallet: number; dTrust: number; leveledUp: boolean; newLevel: number };

const STAGES: { id: Stage; label: string }[] = [
  { id: "spot", label: "SPOT" },
  { id: "strike", label: "STRIKE" },
  { id: "duel", label: "DUEL" },
];

export default function BossGame() {
  const { game, answer, beatBoss } = useGame();
  const [phase, setPhase] = useState<Phase>("select");
  const [stage, setStage] = useState<Stage>("spot"); // the phase shown in the briefing / being fought
  const [boss, setBoss] = useState<Boss | null>(null);
  const [spotRound, setSpotRound] = useState<Scenario[]>([]);
  const [strikeRound, setStrikeRound] = useState<Scenario[]>([]);
  const [lives, setLives] = useState(3);
  const [damage, setDamage] = useState(0); // 0 to 100: how much of the boss's health is gone
  const [bossLine, setBossLine] = useState("");
  const [ending, setEnding] = useState<Ending | null>(null);

  // Get the next boss's rounds ready while the player is on the select screen.
  const upcoming = nextBoss(game.bosses);
  useEffect(() => {
    prefetch(spotUrl(upcoming), spotCount(upcoming), () => spotFallback(upcoming));
    prefetch(strikeUrl(upcoming), upcoming.strike, () => strikeFallback(upcoming));
  }, [upcoming]);

  async function startFight(b: Boss) {
    setBoss(b);
    setPhase("loading");
    const [spot, strike] = await Promise.all([
      take(spotUrl(b), spotCount(b), () => spotFallback(b)),
      take(strikeUrl(b), b.strike, () => strikeFallback(b)),
    ]);
    setSpotRound(spot.scenarios);
    setStrikeRound(strike.scenarios);
    setLives(b.lives);
    setDamage(0);
    setBossLine(b.intro);
    setEnding(null);
    setStage("spot");
    setPhase("briefing");
  }

  const hit = (points: number) => setDamage((d) => Math.min(99, d + points));
  const loseLife = (n = 1) => setLives((l) => Math.max(0, l - n));

  function goTo(next: Stage) {
    setStage(next);
    setPhase("briefing");
  }

  function victory() {
    if (!boss) return;
    const bossNumber = BOSSES.findIndex((x) => x.id === boss.id);
    const result: AnswerResult = { correct: true, xp: 100 + 25 * bossNumber, trust: 10 };
    const next = applyAnswer(game, result);

    answer(result);
    beatBoss(boss.id);
    playLevelUp();

    setDamage(100);
    setEnding({
      dXp: next.xp - game.xp,
      dWallet: 0,
      dTrust: next.trust - game.trust,
      leveledUp: levelOf(next.xp) > levelOf(game.xp),
      newLevel: levelOf(next.xp),
    });
    setPhase("victory");
  }

  function defeat() {
    const result: AnswerResult = { correct: false, xp: 0, wallet: -150, trust: -10 };
    const next = applyAnswer(game, result);

    answer(result);
    playWrong();

    setEnding({
      dXp: 0,
      dWallet: next.wallet - game.wallet,
      dTrust: next.trust - game.trust,
      leveledUp: false,
      newLevel: levelOf(game.xp),
    });
    setPhase("defeat");
  }

  // ---------------- choose a boss ----------------
  if (phase === "select") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <Hud className="" />
        <div className="text-center">
          <p className="font-mono text-[11px] tracking-[0.3em] text-muted">GAME MODE 4</p>
          <h1 className="title-gradient text-3xl font-black sm:text-4xl">Boss Fights</h1>
          <p className="mx-auto mt-1 max-w-xl text-xs text-muted sm:text-sm">
            Four scam masters, fought in order. Each fight has 3 phases: spot their messages,
            strike their red flags, then win the final chat duel. Hearts are shared across all
            three.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 content-center gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BOSSES.map((b, i) => {
            const open = isUnlocked(i, game.bosses);
            const beaten = game.bosses.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                disabled={!open}
                onClick={() => void startFight(b)}
                className="flex flex-col rounded-xl border bg-surface/80 p-4 text-left transition enabled:hover:-translate-y-1 enabled:active:scale-[0.98] disabled:opacity-50"
                style={{ borderColor: open ? b.color : "var(--border)" }}
              >
                <div className="flex items-center justify-between font-mono text-[10px] tracking-widest">
                  <span className="text-muted">BOSS {i + 1}</span>
                  <span style={{ color: beaten ? "#3dffa2" : open ? b.color : "#8a9bb8" }}>
                    {beaten ? "DEFEATED ✓" : open ? "READY" : "LOCKED"}
                  </span>
                </div>
                <p className="mt-2 text-lg font-extrabold" style={{ color: b.color }}>
                  {b.name}
                </p>
                <p className="text-xs text-foreground">{b.title}</p>
                <p className="mt-2 text-xs text-muted">{b.blurb}</p>
                <p className="mt-2 font-mono text-[10px] tracking-widest" style={{ color: b.color }}>
                  RULE: {b.ruleName}
                </p>
                <p className="mt-auto pt-2 font-mono text-[10px] tracking-widest text-muted">
                  3 PHASES · {b.lives} ♥
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (!boss) return null;

  // ---------------- loading ----------------
  if (phase === "loading") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <Hud className="" />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className="w-full max-w-md rounded-2xl border bg-surface/85 p-8 text-center backdrop-blur"
            style={{ borderColor: boss.color }}
          >
            <div
              className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
              style={{ borderColor: `${boss.color}55`, borderTopColor: boss.color }}
            />
            <h2 className="mt-5 text-xl font-bold" style={{ color: boss.color }}>
              {boss.name} is approaching...
            </h2>
            <p className="mt-2 text-sm text-muted">The AI is preparing this boss&apos;s attacks.</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- victory / defeat ----------------
  if ((phase === "victory" || phase === "defeat") && ending) {
    const won = phase === "victory";
    const color = won ? "#3dffa2" : "#ff3d6e";
    const nextUp = BOSSES[BOSSES.findIndex((b) => b.id === boss.id) + 1];
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <Hud className="" />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className="slide-in w-full max-w-xl rounded-2xl border bg-surface/85 p-6 text-center backdrop-blur"
            style={{ borderColor: color }}
          >
            <p className="font-mono text-[11px] tracking-[0.3em] text-muted">
              {boss.name.toUpperCase()}
            </p>
            <h1 className="mt-1 text-4xl font-black" style={{ color }}>
              {won ? "BOSS DEFEATED!" : "YOU WERE OVERWHELMED"}
            </h1>
            <p className="mt-3 text-sm italic text-muted">
              {boss.name}: &quot;{won ? boss.defeatLine : boss.winLine}&quot;
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2 font-mono text-xs font-bold">
              {ending.dXp > 0 && (
                <span className="rounded-md bg-neon/15 px-3 py-1 text-neon">+{ending.dXp} XP</span>
              )}
              {ending.dWallet < 0 && (
                <span className="rounded-md bg-danger/15 px-3 py-1 text-danger">
                  -${Math.abs(ending.dWallet)} stolen
                </span>
              )}
              {ending.dTrust !== 0 && (
                <span
                  className="rounded-md px-3 py-1"
                  style={{
                    color: ending.dTrust > 0 ? "#3dffa2" : "#ff3d6e",
                    background: ending.dTrust > 0 ? "rgba(61,255,162,.15)" : "rgba(255,61,110,.15)",
                  }}
                >
                  {ending.dTrust > 0 ? "+" : ""}
                  {ending.dTrust} trust
                </span>
              )}
              {ending.leveledUp && (
                <span className="rounded-md border border-neon bg-neon/10 px-3 py-1 text-neon">
                  LEVEL UP! Level {ending.newLevel}
                </span>
              )}
            </div>

            {won && nextUp && (
              <p className="mt-4 font-mono text-xs tracking-widest text-warn">
                NEW BOSS UNLOCKED: {nextUp.name.toUpperCase()}
              </p>
            )}
            {won && !nextUp && (
              <p className="mt-4 font-mono text-xs tracking-widest text-warn">
                YOU HAVE DEFEATED EVERY BOSS. YOU ARE A TRUE HOAX HUNTER!
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!won && (
                <button
                  type="button"
                  onClick={() => void startFight(boss)}
                  className="start-btn !px-8 !py-3 !text-base"
                >
                  TRY AGAIN
                </button>
              )}
              <button
                type="button"
                onClick={() => setPhase("select")}
                className={
                  won
                    ? "start-btn !px-8 !py-3 !text-base"
                    : "rounded-xl border border-border px-6 py-3 font-mono text-sm font-bold text-muted transition hover:border-neon hover:text-neon"
                }
              >
                {won ? "BOSS LIST" : "CHOOSE ANOTHER"}
              </button>
              <Link
                href="/play"
                className="rounded-xl border border-border px-6 py-3 font-mono text-sm font-bold text-muted transition hover:border-neon hover:text-neon"
              >
                BACK TO PLAY
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- briefing before each phase ----------------
  const stageNumber = STAGES.findIndex((s) => s.id === stage) + 1;
  const persona = getPersona(boss.duelPersona);

  const bossBar = (
    <div className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between font-mono text-[11px] tracking-widest">
          <span className="font-bold" style={{ color: boss.color }}>
            {boss.name.toUpperCase()}
          </span>
          <span className="flex gap-2">
            {STAGES.map((s, i) => (
              <span
                key={s.id}
                className={i + 1 === stageNumber ? "font-bold" : "text-muted"}
                style={i + 1 === stageNumber ? { color: boss.color } : undefined}
              >
                {i + 1}·{s.label}
              </span>
            ))}
          </span>
        </div>
        <div className="mt-1">
          <Meter value={Math.max(0, 100 - damage)} max={100} color={boss.color} height="h-3" />
        </div>
      </div>
      <div className="shrink-0 text-2xl leading-none" aria-label={`${lives} lives left`}>
        {Array.from({ length: boss.lives }, (_, i) => (
          <span key={i} style={{ color: i < lives ? "#ff3d6e" : "#2a3550" }}>
            ♥
          </span>
        ))}
      </div>
    </div>
  );

  if (phase === "briefing") {
    const text: Record<Stage, string> = {
      spot: "Messages are coming in. Sort each one: Trust, Verify or Report. Every right answer hits the boss. Every wrong one costs a heart.",
      strike:
        "Now strike back! Tap the red flags hidden in the boss's scam messages. Every flag you find damages the boss. Miss too many and you lose a heart.",
      duel: `${boss.name} steps out of the shadows, disguised as "${persona?.name ?? "a stranger"}". Chat with them live. Refuse, ask for proof or say you will verify to land the final blow. Give in and the fight is over.`,
    };
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        {bossBar}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className="slide-in w-full max-w-xl rounded-2xl border bg-surface/85 p-6 text-center backdrop-blur"
            style={{ borderColor: boss.color }}
          >
            <p className="font-mono text-[11px] tracking-[0.3em] text-muted">
              PHASE {stageNumber} OF 3
            </p>
            <h1 className="mt-1 text-4xl font-black" style={{ color: boss.color }}>
              {stage === "duel" ? "THE DUEL" : STAGES[stageNumber - 1].label}
            </h1>
            <p className="mt-3 text-sm text-muted">{text[stage]}</p>

            {stage === "spot" && (
              <div className="mt-4 rounded-xl border border-warn/60 bg-warn/5 p-3 text-left">
                <p className="font-mono text-[11px] tracking-widest text-warn">
                  BOSS RULE: {boss.ruleName}
                </p>
                <p className="mt-1 text-xs text-muted">{boss.ruleText}</p>
              </div>
            )}

            <p className="mt-4 text-sm italic text-foreground">
              {boss.name}: &quot;{bossLine}&quot;
            </p>

            <button
              type="button"
              onClick={() => setPhase(stage)}
              className="start-btn mt-5 !px-10 !py-3 !text-base"
            >
              {stage === "duel" ? "FACE THEM" : "FIGHT!"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- the three fighting phases ----------------
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {bossBar}
      <div className="min-h-0 flex-1">
        {phase === "spot" && (
          <BossSpot
            boss={boss}
            scenarios={spotRound}
            lives={lives}
            onDamage={hit}
            onLoseLife={loseLife}
            onDone={() => goTo("strike")}
            onDefeat={defeat}
            bossLine={bossLine}
            setBossLine={setBossLine}
          />
        )}
        {phase === "strike" && (
          <BossStrike
            boss={boss}
            scenarios={strikeRound}
            lives={lives}
            onDamage={hit}
            onLoseLife={loseLife}
            onDone={() => goTo("duel")}
            onDefeat={defeat}
            bossLine={bossLine}
            setBossLine={setBossLine}
          />
        )}
        {phase === "duel" && persona && (
          <BossDuel
            boss={boss}
            persona={persona}
            maxTurns={boss.duelTurns}
            onDamage={hit}
            onWon={victory}
            onLost={defeat}
          />
        )}
      </div>
    </div>
  );
}
