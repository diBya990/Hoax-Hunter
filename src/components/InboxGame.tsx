"use client";

import { useState } from "react";
import Link from "next/link";
import Hud from "@/components/Hud";
import MessageBubble from "@/components/MessageBubble";
import Meter from "@/components/Meter";
import PhoneFrame from "@/components/PhoneFrame";
import { applyAnswer, comboMultiplier, levelOf } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";
import { judge, pickRound, rating, type InboxAction, type Judgement } from "@/lib/inbox";
import { RED_FLAGS, getScamType } from "@/lib/scamTypes";
import { CHANNEL_LABEL, type Kind, type Scenario } from "@/lib/scenarioTypes";
import { playCorrect, playLevelUp, playWrong } from "@/lib/sound";

// This screen is built to fit the window exactly: nothing here should scroll.

type Phase = "intro" | "answering" | "feedback" | "done";

type Outcome = {
  scenario: Scenario;
  judgement: Judgement;
  dXp: number;
  dWallet: number;
  dTrust: number;
  combo: number; // XP multiplier that was applied
  leveledUp: boolean;
  newLevel: number;
};

type Stats = { correct: number; xp: number; lost: number; bestStreak: number };
const EMPTY_STATS: Stats = { correct: 0, xp: 0, lost: 0, bestStreak: 0 };

const ACTIONS: {
  id: InboxAction;
  label: string;
  hint: string;
  button: string; // small phone button (small screens)
  card: string; // big answer card (wide screens)
  text: string;
}[] = [
  {
    id: "trust",
    label: "TRUST",
    hint: "It looks real. Reply, click or pay.",
    button: "border-neon text-neon hover:bg-neon/15",
    card: "hover:border-neon hover:bg-neon/10 hover:shadow-[0_0_24px_rgba(34,228,255,0.3)]",
    text: "text-neon",
  },
  {
    id: "verify",
    label: "VERIFY",
    hint: "Not sure. Check through an official channel first.",
    button: "border-warn text-warn hover:bg-warn/15",
    card: "hover:border-warn hover:bg-warn/10 hover:shadow-[0_0_24px_rgba(255,200,61,0.3)]",
    text: "text-warn",
  },
  {
    id: "report",
    label: "REPORT",
    hint: "Looks like a scam. Block and report it.",
    button: "border-danger text-danger hover:bg-danger/15",
    card: "hover:border-danger hover:bg-danger/10 hover:shadow-[0_0_24px_rgba(255,61,110,0.3)]",
    text: "text-danger",
  },
];

const VERDICT_COLOR = { great: "#3dffa2", ok: "#ffc83d", wrong: "#ff3d6e" } as const;

const STAMP: Record<Kind, { word: string; color: string }> = {
  scam: { word: "SCAM", color: "#ff3d6e" },
  safe: { word: "SAFE", color: "#3dffa2" },
  unsure: { word: "VERIFY", color: "#ffc83d" },
};

export default function InboxGame() {
  const { game, answer } = useGame();
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState<Scenario[]>([]);
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);

  function start() {
    setRound(pickRound());
    setIndex(0);
    setOutcome(null);
    setStats(EMPTY_STATS);
    setPhase("answering");
  }

  function choose(action: InboxAction) {
    if (phase !== "answering") return;
    const scenario = round[index];
    const judgement = judge(scenario, action);
    const next = applyAnswer(game, judgement.result);

    const dXp = next.xp - game.xp;
    const dWallet = next.wallet - game.wallet;
    const leveledUp = levelOf(next.xp) > levelOf(game.xp);

    answer(judgement.result);

    if (judgement.verdict === "wrong") playWrong();
    else playCorrect();
    if (leveledUp) setTimeout(playLevelUp, 350);

    setOutcome({
      scenario,
      judgement,
      dXp,
      dWallet,
      dTrust: next.trust - game.trust,
      combo: comboMultiplier(game.streak),
      leveledUp,
      newLevel: levelOf(next.xp),
    });
    setStats((prev) => ({
      correct: prev.correct + (judgement.result.correct ? 1 : 0),
      xp: prev.xp + dXp,
      lost: prev.lost + Math.max(0, -dWallet),
      bestStreak: Math.max(prev.bestStreak, next.streak),
    }));
    setPhase("feedback");
  }

  function nextMessage() {
    if (index + 1 >= round.length) {
      playLevelUp();
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setOutcome(null);
    setPhase("answering");
  }

  // ---------------- intro ----------------
  if (phase === "intro") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <Hud className="" />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-2xl rounded-2xl border border-neon/40 bg-surface/85 p-6 text-center backdrop-blur">
            <p className="font-mono text-[11px] tracking-[0.3em] text-muted">GAME MODE 1</p>
            <h1 className="title-gradient mt-1 text-4xl font-black">Inbox Defender</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              10 messages hit your phone, a different mix every round: scams, safe messages
              and unclear ones. Decide fast and protect your wallet.
            </p>

            <div className="mt-4 grid gap-3 text-left sm:grid-cols-3">
              {ACTIONS.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-black/30 p-3">
                  <p className={`font-mono text-sm font-bold ${a.text}`}>{a.label}</p>
                  <p className="mt-1 text-xs text-muted">{a.hint}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted">
              Fall for a scam and you lose money and trust. Chain correct answers for a bonus
              XP combo.
            </p>

            <button type="button" onClick={start} className="start-btn mt-5 !py-3">
              START ROUND
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- done ----------------
  if (phase === "done") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <Hud className="" />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl border border-neon/40 bg-surface/85 p-6 text-center backdrop-blur">
            <p className="font-mono text-[11px] tracking-[0.3em] text-muted">ROUND COMPLETE</p>
            <h1 className="title-gradient mt-1 text-4xl font-black">
              {rating(stats.correct, round.length)}
            </h1>
            <p className="mt-1 text-muted">
              You got {stats.correct} of {round.length} right.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-black/30 p-3">
                <p className="font-mono text-[10px] tracking-widest text-muted">XP</p>
                <p className="mt-1 text-2xl font-extrabold text-neon">+{stats.xp}</p>
              </div>
              <div className="rounded-xl border border-border bg-black/30 p-3">
                <p className="font-mono text-[10px] tracking-widest text-muted">LOST</p>
                <p className="mt-1 text-2xl font-extrabold text-danger">-${stats.lost}</p>
              </div>
              <div className="rounded-xl border border-border bg-black/30 p-3">
                <p className="font-mono text-[10px] tracking-widest text-muted">BEST STREAK</p>
                <p className="mt-1 text-2xl font-extrabold text-magenta">{stats.bestStreak}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={start} className="start-btn !px-8 !py-3 !text-base">
                PLAY AGAIN
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

  // ---------------- playing (answering + feedback) ----------------
  const scenario = round[index];
  const showResult = phase === "feedback" && outcome;
  const stamp = STAMP[scenario.kind];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Hud className="" />

      {/* progress */}
      <div>
        <div className="flex items-center justify-between font-mono text-[11px] tracking-widest text-muted">
          <span>
            MESSAGE {index + 1} OF {round.length}
          </span>
          <span>{stats.correct} CORRECT</span>
        </div>
        <div className="mt-1.5">
          <Meter value={index + (showResult ? 1 : 0)} max={round.length} color="#22e4ff" />
        </div>
      </div>

      {/* On small screens only one of these two is shown at a time, so nothing scrolls. */}
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[auto_1fr]">
        <div
          className={`min-h-0 ${showResult ? "hidden lg:block" : ""} ${
            showResult && outcome.judgement.verdict === "wrong" ? "shake" : ""
          }`}
        >
          <PhoneFrame
            key={scenario.id}
            className="h-full max-h-[560px]"
            title={scenario.sender}
            subtitle={CHANNEL_LABEL[scenario.channel]}
            overlay={
              showResult ? (
                <div
                  className="stamp-pop rounded-xl border-4 px-5 py-2 text-4xl font-black tracking-widest"
                  style={{ color: stamp.color, borderColor: stamp.color }}
                >
                  {stamp.word}
                </div>
              ) : undefined
            }
            footerClassName="lg:hidden"
            footer={
              phase === "answering" ? (
                <div className="grid grid-cols-3 gap-2">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => choose(a.id)}
                      className={`rounded-lg border px-1 py-3 font-mono text-xs font-bold transition active:scale-95 ${a.button}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              ) : undefined
            }
          >
            {scenario.subject && (
              <p className="text-xs font-bold text-foreground">{scenario.subject}</p>
            )}
            <MessageBubble text={scenario.text} time="9:41" />
          </PhoneFrame>
        </div>

        {/* right panel */}
        <div className="flex min-h-0 min-w-0 flex-col">
          {phase === "answering" && (
            <div
              className="slide-in hidden flex-1 flex-col justify-center gap-3 lg:flex"
              key={`q-${scenario.id}`}
            >
              <h2 className="text-xl font-bold">How do you respond?</h2>
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => choose(a.id)}
                  className={`rounded-xl border border-border bg-surface/70 p-4 text-left transition active:scale-[0.98] ${a.card}`}
                >
                  <p className={`font-mono text-base font-bold ${a.text}`}>{a.label}</p>
                  <p className="text-sm text-muted">{a.hint}</p>
                </button>
              ))}
            </div>
          )}

          {showResult && (
            <Feedback
              outcome={outcome}
              onNext={nextMessage}
              last={index + 1 >= round.length}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Feedback({
  outcome,
  onNext,
  last,
}: {
  outcome: Outcome;
  onNext: () => void;
  last: boolean;
}) {
  const { scenario, judgement } = outcome;
  const color = VERDICT_COLOR[judgement.verdict];
  const stamp = STAMP[scenario.kind];
  const scamType = getScamType(scenario.scamType);
  const flagsTitle = scenario.kind === "unsure" ? "WHAT TO CHECK" : "RED FLAGS";

  return (
    <div
      className="slide-in flex h-full min-h-0 flex-col gap-2.5 overflow-hidden rounded-xl border bg-surface/85 p-4 backdrop-blur"
      style={{ borderColor: color }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-xl font-extrabold" style={{ color }}>
          {judgement.headline}
        </h2>
        <span
          className="rounded border px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest"
          style={{ color: stamp.color, borderColor: stamp.color }}
        >
          {stamp.word}
          {scamType ? ` · ${scamType.name.toUpperCase()}` : ""}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 font-mono text-xs font-bold">
        {outcome.dXp > 0 && (
          <span className="rounded-md bg-neon/15 px-3 py-1 text-neon">
            +{outcome.dXp} XP{outcome.combo > 1 ? ` (combo x${outcome.combo.toFixed(1)})` : ""}
          </span>
        )}
        {outcome.dWallet < 0 && (
          <span className="rounded-md bg-danger/15 px-3 py-1 text-danger">
            -${Math.abs(outcome.dWallet)} stolen
          </span>
        )}
        {outcome.dTrust !== 0 && (
          <span
            className="rounded-md px-3 py-1"
            style={{
              color: outcome.dTrust > 0 ? "#3dffa2" : "#ff3d6e",
              background: outcome.dTrust > 0 ? "rgba(61,255,162,.15)" : "rgba(255,61,110,.15)",
            }}
          >
            {outcome.dTrust > 0 ? "+" : ""}
            {outcome.dTrust} trust
          </span>
        )}
        {outcome.leveledUp && (
          <span className="rounded-md border border-neon bg-neon/10 px-3 py-1 text-neon">
            LEVEL UP! Level {outcome.newLevel}
          </span>
        )}
      </div>

      <p className="text-[13px] leading-snug text-foreground">{scenario.explanation}</p>

      {scenario.redFlags.length > 0 && (
        <div className="min-h-0">
          <p className="font-mono text-[10px] tracking-widest text-muted">{flagsTitle}</p>
          <ul className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {scenario.redFlags.map((f) => (
              <li key={f} className="rounded-lg border border-border bg-black/30 px-2.5 py-1.5">
                <p className="text-xs font-semibold text-danger">⚑ {RED_FLAGS[f].label}</p>
                <p className="text-[11px] leading-tight text-muted">{RED_FLAGS[f].tip}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="start-btn mt-auto !px-8 !py-2.5 !text-base"
      >
        {last ? "FINISH ROUND" : "NEXT MESSAGE →"}
      </button>
    </div>
  );
}
