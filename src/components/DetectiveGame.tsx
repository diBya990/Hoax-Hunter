"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Hud from "@/components/Hud";
import { SOURCE_LABEL } from "@/components/InboxGame";
import Meter from "@/components/Meter";
import PhoneFrame from "@/components/PhoneFrame";
import {
  DETECTIVE_ROUND,
  DETECTIVE_URL,
  TIME_PER_MESSAGE,
  clueOfWord,
  clueRanges,
  evaluate,
  judgeDetective,
  pickDetectiveRound,
  splitWords,
  type DetectiveJudgement,
  type Finding,
} from "@/lib/detective";
import { applyAnswer, comboMultiplier, levelOf } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";
import { RED_FLAGS } from "@/lib/scamTypes";
import { prefetch, take, type RoundSource } from "@/lib/scenarioClient";
import { CHANNEL_LABEL, type Scenario } from "@/lib/scenarioTypes";
import { playCorrect, playLevelUp, playWrong } from "@/lib/sound";

// This screen is built to fit the window exactly: nothing here should scroll.

type Phase = "intro" | "loading" | "playing" | "reveal" | "done";

export type Outcome = {
  scenario: Scenario;
  finding: Finding;
  judgement: DetectiveJudgement;
  dXp: number;
  dTrust: number;
  combo: number;
  leveledUp: boolean;
  newLevel: number;
};

type Stats = { found: number; total: number; correct: number; xp: number };
const EMPTY_STATS: Stats = { found: 0, total: 0, correct: 0, xp: 0 };

const VERDICT_COLOR = { great: "#3dffa2", ok: "#ffc83d", wrong: "#ff3d6e" } as const;

export default function DetectiveGame() {
  const { game, answer } = useGame();
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState<Scenario[]>([]);
  const [source, setSource] = useState<RoundSource>("fallback");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]); // tapped word numbers
  const [timeLeft, setTimeLeft] = useState(TIME_PER_MESSAGE);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const timeRef = useRef(TIME_PER_MESSAGE); // the countdown, kept in step with timeLeft
  const submitRef = useRef<() => void>(() => {});

  // Start fetching a round as soon as the page opens, so START is usually instant.
  useEffect(() => {
    prefetch(DETECTIVE_URL, DETECTIVE_ROUND, pickDetectiveRound);
  }, []);

  async function start() {
    setPhase("loading");
    const loaded = await take(DETECTIVE_URL, DETECTIVE_ROUND, pickDetectiveRound);
    setRound(loaded.scenarios);
    setSource(loaded.source);
    setIndex(0);
    setSelected([]);
    timeRef.current = TIME_PER_MESSAGE;
    setTimeLeft(TIME_PER_MESSAGE);
    setOutcome(null);
    setStats(EMPTY_STATS);
    setPhase("playing");
    prefetch(DETECTIVE_URL, DETECTIVE_ROUND, pickDetectiveRound); // next round, in the background
  }

  function toggleWord(i: number) {
    if (phase !== "playing") return;
    setSelected((prev) => (prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i]));
  }

  function submit() {
    if (phase !== "playing") return;
    const scenario = round[index];
    const finding = evaluate(scenario, selected);
    const judgement = judgeDetective(finding);
    const next = applyAnswer(game, judgement.result);
    const dXp = next.xp - game.xp;
    const leveledUp = levelOf(next.xp) > levelOf(game.xp);

    answer(judgement.result);
    if (judgement.verdict === "wrong") playWrong();
    else playCorrect();
    if (leveledUp) setTimeout(playLevelUp, 350);

    setOutcome({
      scenario,
      finding,
      judgement,
      dXp,
      dTrust: next.trust - game.trust,
      combo: comboMultiplier(game.streak),
      leveledUp,
      newLevel: levelOf(next.xp),
    });
    setStats((prev) => ({
      found: prev.found + finding.found.length,
      total: prev.total + finding.total,
      correct: prev.correct + (judgement.result.correct ? 1 : 0),
      xp: prev.xp + dXp,
    }));
    setPhase("reveal");
  }

  function nextMessage() {
    if (index + 1 >= round.length) {
      playLevelUp();
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setSelected([]);
    timeRef.current = TIME_PER_MESSAGE;
    setTimeLeft(TIME_PER_MESSAGE);
    setOutcome(null);
    setPhase("playing");
  }

  // Keep a pointer to the newest submit(), so the timer below always submits
  // what the player has tapped so far.
  useEffect(() => {
    submitRef.current = submit;
  });

  // the countdown: one tick per second while playing; at zero the case is submitted
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) submitRef.current();
    }, 1000);
    return () => clearInterval(id);
  }, [phase, index]);

  // ---------------- loading ----------------
  if (phase === "loading") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <Hud className="" />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-neon/40 bg-surface/85 p-8 text-center backdrop-blur">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-neon/20 border-t-neon" />
            <h2 className="mt-5 text-xl font-bold text-neon">Collecting evidence...</h2>
            <p className="mt-2 text-sm text-muted">
              The AI is writing fresh scam messages for you to investigate.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- intro ----------------
  if (phase === "intro") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <Hud className="" />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-2xl rounded-2xl border border-neon/40 bg-surface/85 p-6 text-center backdrop-blur">
            <p className="font-mono text-[11px] tracking-[0.3em] text-muted">GAME MODE 3</p>
            <h1 className="title-gradient mt-1 text-4xl font-black">Detective</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Every message is a scam. Tap the words and phrases that give it away before time
              runs out.
            </p>

            <div className="mt-4 grid gap-3 text-left sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-black/30 p-3">
                <p className="font-mono text-sm font-bold text-neon">TAP</p>
                <p className="mt-1 text-xs text-muted">Tap a suspicious word. Tap again to undo.</p>
              </div>
              <div className="rounded-xl border border-border bg-black/30 p-3">
                <p className="font-mono text-sm font-bold text-warn">{TIME_PER_MESSAGE} SECONDS</p>
                <p className="mt-1 text-xs text-muted">Each message has a timer. Submit early if ready.</p>
              </div>
              <div className="rounded-xl border border-border bg-black/30 p-3">
                <p className="font-mono text-sm font-bold text-danger">NO GUESSING</p>
                <p className="mt-1 text-xs text-muted">Wrong taps cost points, so tap with care.</p>
              </div>
            </div>

            <button type="button" onClick={start} className="start-btn mt-5 !py-3">
              START CASE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- done ----------------
  if (phase === "done") {
    const pct = stats.total === 0 ? 0 : Math.round((stats.found / stats.total) * 100);
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <Hud className="" />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl border border-neon/40 bg-surface/85 p-6 text-center backdrop-blur">
            <p className="font-mono text-[11px] tracking-[0.3em] text-muted">CASE CLOSED</p>
            <h1 className="title-gradient mt-1 text-4xl font-black">
              {pct >= 90 ? "Master Detective" : pct >= 65 ? "Sharp Investigator" : pct >= 40 ? "Rookie Detective" : "Keep Practising"}
            </h1>
            <p className="mt-1 text-muted">
              You found {stats.found} of {stats.total} red flags.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-black/30 p-3">
                <p className="font-mono text-[10px] tracking-widest text-muted">XP</p>
                <p className="mt-1 text-2xl font-extrabold text-neon">+{stats.xp}</p>
              </div>
              <div className="rounded-xl border border-border bg-black/30 p-3">
                <p className="font-mono text-[10px] tracking-widest text-muted">FOUND</p>
                <p className="mt-1 text-2xl font-extrabold text-safe">{pct}%</p>
              </div>
              <div className="rounded-xl border border-border bg-black/30 p-3">
                <p className="font-mono text-[10px] tracking-widest text-muted">CASES SOLVED</p>
                <p className="mt-1 text-2xl font-extrabold text-magenta">
                  {stats.correct}/{round.length}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={start} className="start-btn !px-8 !py-3 !text-base">
                NEW CASE
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

  // ---------------- playing + reveal ----------------
  const scenario = round[index];
  const words = splitWords(scenario.text);
  const ranges = clueRanges(scenario);
  const revealing = phase === "reveal" && outcome;
  const timeColor = timeLeft > 10 ? "#22e4ff" : timeLeft > 5 ? "#ffc83d" : "#ff3d6e";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Hud className="" />

      {/* status row */}
      <div className="flex items-center gap-4">
        <span className="shrink-0 font-mono text-[11px] tracking-widest text-muted">
          CASE {index + 1} OF {round.length}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between font-mono text-[10px] tracking-widest">
            <span className="text-muted">TIME</span>
            <span style={{ color: timeColor }}>{Math.max(0, timeLeft)}s</span>
          </div>
          <div className="mt-1">
            <Meter
              value={revealing ? 0 : Math.max(0, timeLeft)}
              max={TIME_PER_MESSAGE}
              color={timeColor}
            />
          </div>
        </div>
        <span
          className="hidden shrink-0 font-mono text-[11px] tracking-widest sm:block"
          style={{ color: SOURCE_LABEL[source].color }}
        >
          {SOURCE_LABEL[source].text}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[auto_1fr]">
        {/* phone (hidden on small screens during the reveal) */}
        <div className={`min-h-0 ${revealing ? "hidden lg:block" : ""}`}>
          <PhoneFrame
            key={scenario.id}
            className="h-full max-h-[560px]"
            title={scenario.sender}
            subtitle={CHANNEL_LABEL[scenario.channel]}
            footerClassName="lg:hidden"
            footer={
              phase === "playing" ? (
                <button
                  type="button"
                  onClick={submit}
                  className="w-full rounded-lg border border-neon py-3 font-mono text-xs font-bold text-neon transition hover:bg-neon/15 active:scale-95"
                >
                  SUBMIT ({selected.length} TAPPED)
                </button>
              ) : undefined
            }
          >
            {scenario.subject && (
              <p className="text-xs font-bold text-foreground">{scenario.subject}</p>
            )}
            <div className="rounded-2xl rounded-bl-sm border border-border bg-surface-2 px-3.5 py-3 text-[13px] leading-7 text-foreground">
              {words.map((w, i) => {
                const clue = clueOfWord(w, ranges);
                const tapped = selected.includes(i);
                let style = "";
                if (revealing) {
                  if (clue !== -1 && tapped) style = "bg-safe/25 text-safe";
                  else if (clue !== -1) style = "bg-warn/25 text-warn outline outline-1 outline-warn";
                  else if (tapped) style = "bg-danger/25 text-danger line-through";
                } else if (tapped) {
                  style = "bg-warn/30 text-warn";
                } else {
                  style = "hover:bg-neon/15 hover:text-neon";
                }
                return (
                  <span key={i}>
                    <button
                      type="button"
                      disabled={!!revealing}
                      onClick={() => toggleWord(i)}
                      className={`rounded px-0.5 transition-colors ${style}`}
                    >
                      {w.text}
                    </button>{" "}
                  </span>
                );
              })}
            </div>
          </PhoneFrame>
        </div>

        {/* right panel */}
        <div className="flex min-h-0 min-w-0 flex-col">
          {phase === "playing" && (
            <div className="slide-in hidden flex-1 flex-col justify-center gap-4 lg:flex" key={`p-${scenario.id}`}>
              <h2 className="text-2xl font-bold">Find the red flags</h2>
              <p className="text-muted">
                This message hides{" "}
                <span className="font-bold text-warn">{ranges.length} red flags</span>. Tap the
                words or phrases that give the scam away. A clue counts as found if you tap any
                word in it.
              </p>
              <p className="font-mono text-sm text-muted">
                TAPPED: <span className="font-bold text-neon">{selected.length}</span>
              </p>
              <button type="button" onClick={submit} className="start-btn self-start !px-8 !py-3 !text-base">
                SUBMIT
              </button>
            </div>
          )}

          {revealing && <DetectiveFeedback outcome={outcome} ranges={ranges} onNext={nextMessage} last={index + 1 >= round.length} />}
        </div>
      </div>
    </div>
  );
}

export function DetectiveFeedback({
  outcome,
  ranges,
  onNext,
  last,
  note,
  nextLabel,
  extraChips,
}: {
  outcome: Outcome;
  ranges: ReturnType<typeof clueRanges>;
  onNext: () => void;
  last: boolean;
  note?: string; // e.g. a line spoken by a boss
  nextLabel?: string; // overrides the button text
  extraChips?: React.ReactNode; // e.g. "-1 heart"
}) {
  const { finding, judgement, scenario } = outcome;
  const color = VERDICT_COLOR[judgement.verdict];

  return (
    <div
      className="slide-in flex h-full min-h-0 flex-col gap-2.5 overflow-hidden rounded-xl border bg-surface/85 p-4 backdrop-blur"
      style={{ borderColor: color }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-xl font-extrabold" style={{ color }}>
          {judgement.headline}
        </h2>
        <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-muted">
          {finding.found.length}/{finding.total} FOUND
        </span>
      </div>

      <div className="flex flex-wrap gap-2 font-mono text-xs font-bold">
        {outcome.dXp > 0 && (
          <span className="rounded-md bg-neon/15 px-3 py-1 text-neon">
            +{outcome.dXp} XP{outcome.combo > 1 ? ` (combo x${outcome.combo.toFixed(1)})` : ""}
          </span>
        )}
        {finding.falseWords.length > 0 && (
          <span className="rounded-md bg-danger/15 px-3 py-1 text-danger">
            {finding.falseWords.length} wrong tap{finding.falseWords.length > 1 ? "s" : ""}
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
        {extraChips}
      </div>

      {note && <p className="text-[13px] italic text-muted">{note}</p>}

      <p className="text-[13px] leading-snug text-foreground">{scenario.explanation}</p>

      <div className="min-h-0">
        <p className="font-mono text-[10px] tracking-widest text-muted">THE CLUES</p>
        <ul className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {ranges.map((r, i) => {
            const got = finding.found.includes(i);
            return (
              <li
                key={i}
                className="rounded-lg border bg-black/30 px-2.5 py-1.5"
                style={{ borderColor: got ? "#3dffa2" : "#ffc83d" }}
              >
                <p className="text-xs font-semibold" style={{ color: got ? "#3dffa2" : "#ffc83d" }}>
                  {got ? "✓" : "✗"} &quot;{r.phrase}&quot;
                </p>
                <p className="text-[11px] leading-tight text-muted">
                  {RED_FLAGS[r.flag].label}: {RED_FLAGS[r.flag].tip}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <button type="button" onClick={onNext} className="start-btn mt-auto !px-8 !py-2.5 !text-base">
        {nextLabel ?? (last ? "CLOSE THE CASE" : "NEXT CASE →")}
      </button>
    </div>
  );
}
