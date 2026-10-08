"use client";

import { useEffect, useRef, useState } from "react";
import { DetectiveFeedback, type Outcome } from "@/components/DetectiveGame";
import Meter from "@/components/Meter";
import PhoneFrame from "@/components/PhoneFrame";
import { W_STRIKE, pick, type Boss } from "@/lib/bosses";
import { clueOfWord, clueRanges, evaluate, judgeDetective, splitWords } from "@/lib/detective";
import { applyAnswer, comboMultiplier, levelOf } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";
import { getScamType } from "@/lib/scamTypes";
import { CHANNEL_LABEL, type Scenario } from "@/lib/scenarioTypes";
import { playCorrect, playLevelUp, playWrong } from "@/lib/sound";

// BOSS PHASE 2: STRIKE. Tap the red flags hidden in the boss's scam messages.
// Every clue you find hits the boss. Finding too few costs a heart.

const STRIKE_TIME = 20; // seconds per message

type Props = {
  boss: Boss;
  scenarios: Scenario[];
  lives: number;
  onDamage: (points: number) => void;
  onLoseLife: (n?: number) => void;
  onDone: () => void;
  onDefeat: () => void;
  bossLine: string;
  setBossLine: (line: string) => void;
};

export default function BossStrike({
  boss,
  scenarios,
  lives,
  onDamage,
  onLoseLife,
  onDone,
  onDefeat,
  bossLine,
  setBossLine,
}: Props) {
  const { game, answer, recordDex } = useGame();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"playing" | "reveal">("playing");
  const [selected, setSelected] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(STRIKE_TIME);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [lostHeart, setLostHeart] = useState(false);
  const timeRef = useRef(STRIKE_TIME);
  const submitRef = useRef<() => void>(() => {});

  const scenario = scenarios[index];
  const total = scenarios.length;

  function toggleWord(i: number) {
    if (phase !== "playing") return;
    setSelected((prev) => (prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i]));
  }

  function submit() {
    if (phase !== "playing") return;
    const finding = evaluate(scenario, selected);
    const judgement = judgeDetective(finding);
    const next = applyAnswer(game, judgement.result);
    const leveledUp = levelOf(next.xp) > levelOf(game.xp);
    const lose = judgement.verdict === "wrong";

    answer(judgement.result);
    if (scenario.kind === "scam" && getScamType(scenario.scamType)) {
      recordDex(scenario.scamType, lose ? "fell" : "caught");
    }
    if (lose) playWrong();
    else playCorrect();
    if (leveledUp) setTimeout(playLevelUp, 350);

    // each clue found hits the boss
    const share = finding.total === 0 ? 0 : finding.found.length / finding.total;
    onDamage((W_STRIKE / total) * share);
    if (lose) onLoseLife(1);
    setBossLine(pick(share >= 0.6 ? boss.hitLines : boss.missLines));
    setLostHeart(lose);

    setOutcome({
      scenario,
      finding,
      judgement,
      dXp: next.xp - game.xp,
      dTrust: next.trust - game.trust,
      combo: comboMultiplier(game.streak),
      leveledUp,
      newLevel: levelOf(next.xp),
    });
    setPhase("reveal");
  }

  // keep a pointer to the newest submit(), so the timer submits what is tapped so far
  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) submitRef.current();
    }, 1000);
    return () => clearInterval(id);
  }, [phase, index]);

  function nextMessage() {
    if (lives <= 0) return onDefeat();
    if (index + 1 >= total) return onDone();
    setIndex((i) => i + 1);
    setSelected([]);
    setOutcome(null);
    setLostHeart(false);
    timeRef.current = STRIKE_TIME;
    setTimeLeft(STRIKE_TIME);
    setPhase("playing");
  }

  if (!scenario) return null;

  const words = splitWords(scenario.text);
  const ranges = clueRanges(scenario);
  const revealing = phase === "reveal" && outcome;
  const timeColor = timeLeft > 10 ? "#22e4ff" : timeLeft > 5 ? "#ffc83d" : "#ff3d6e";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] tracking-widest">
        <span className="text-muted">
          PHASE 2 · STRIKE · MESSAGE {index + 1} OF {total}
        </span>
        <span style={{ color: timeColor }}>{revealing ? "" : `${Math.max(0, timeLeft)}s`}</span>
      </div>
      <div className="-mt-1">
        <Meter value={revealing ? 0 : Math.max(0, timeLeft)} max={STRIKE_TIME} color={timeColor} />
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[auto_1fr]">
        {/* phone */}
        <div
          className={`min-h-0 ${revealing ? "hidden lg:block" : ""} ${
            revealing && lostHeart ? "shake" : ""
          }`}
        >
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
                  STRIKE! ({selected.length} TAPPED)
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
                  else if (clue !== -1)
                    style = "bg-warn/25 text-warn outline outline-1 outline-warn";
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
            <div
              className="slide-in hidden flex-1 flex-col justify-center gap-4 lg:flex"
              key={`s-${scenario.id}`}
            >
              <div
                className="rounded-xl border bg-black/30 p-3"
                style={{ borderColor: `${boss.color}88` }}
              >
                <p className="font-mono text-[10px] tracking-widest" style={{ color: boss.color }}>
                  {boss.name.toUpperCase()} SAYS
                </p>
                <p className="mt-1 text-sm italic text-foreground">&quot;{bossLine}&quot;</p>
              </div>
              <h2 className="text-2xl font-bold">Strike the red flags!</h2>
              <p className="text-muted">
                This message hides{" "}
                <span className="font-bold text-warn">{ranges.length} red flags</span>. Tap the
                words that give the scam away. Every flag you find hits the boss. Find at least
                60% or you lose a heart.
              </p>
              <p className="font-mono text-sm text-muted">
                TAPPED: <span className="font-bold text-neon">{selected.length}</span>
              </p>
              <button
                type="button"
                onClick={submit}
                className="start-btn self-start !px-8 !py-3 !text-base"
              >
                STRIKE!
              </button>
            </div>
          )}

          {revealing && (
            <DetectiveFeedback
              outcome={outcome}
              ranges={ranges}
              onNext={nextMessage}
              last={index + 1 >= total}
              note={`${boss.name}: "${bossLine}"`}
              nextLabel={
                lives <= 0 ? "FACE DEFEAT" : index + 1 >= total ? "NEXT PHASE →" : "NEXT STRIKE →"
              }
              extraChips={
                lostHeart ? (
                  <span className="rounded-md bg-danger/15 px-3 py-1 text-danger">-1 ♥</span>
                ) : (
                  <span className="rounded-md bg-safe/15 px-3 py-1 text-safe">BOSS HIT!</span>
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
