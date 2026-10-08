"use client";

import { useEffect, useRef, useState } from "react";
import { ACTIONS, Feedback, STAMP, type Outcome } from "@/components/InboxGame";
import MessageBubble from "@/components/MessageBubble";
import Meter from "@/components/Meter";
import PhoneFrame from "@/components/PhoneFrame";
import { W_SPOT, pick, spotCount, type Boss, type RuleId } from "@/lib/bosses";
import { applyAnswer, comboMultiplier, levelOf, type AnswerResult } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";
import { judge, type InboxAction, type Judgement } from "@/lib/inbox";
import { getScamType } from "@/lib/scamTypes";
import { CHANNEL_LABEL, type Scenario } from "@/lib/scenarioTypes";
import { playCorrect, playLevelUp, playWrong } from "@/lib/sound";

// BOSS PHASE 1: SPOT. Sort the boss's messages. Each boss twists the rules.

const INSPECTS = 2; // how many times you can reveal a hidden sender / wipe a blurred message

// What is different about one message because of the boss's rule.
type Mods = {
  timer: number | null; // seconds to answer, or null for no limit
  hideSender: boolean;
  blur: boolean;
  swap: boolean; // buttons in reverse order
  temptation: boolean;
  banner: string | null;
};

const NONE: Mods = {
  timer: null,
  hideSender: false,
  blur: false,
  swap: false,
  temptation: false,
  banner: null,
};

const CHAOS_CURSES = ["timer", "swap", "blur", "hidden", "timer", "swap"] as const;

function modsFor(rule: RuleId, i: number): Mods {
  switch (rule) {
    case "storm":
      return { ...NONE, timer: 6, banner: "LINK STORM: 6 seconds!" };
    case "disguise":
      return { ...NONE, hideSender: true, banner: "DISGUISE: the sender is hidden" };
    case "temptation":
      return { ...NONE, temptation: true };
    case "chaos": {
      const curse = CHAOS_CURSES[i % CHAOS_CURSES.length];
      if (curse === "timer") return { ...NONE, timer: 7, banner: "CURSE: only 7 seconds!" };
      if (curse === "swap") return { ...NONE, swap: true, banner: "CURSE: the buttons are reversed!" };
      if (curse === "blur") return { ...NONE, blur: true, banner: "CURSE: the text is blurred!" };
      return { ...NONE, hideSender: true, banner: "CURSE: the sender is hidden!" };
    }
  }
}

const REWARDS = [250, 500, 750, 1000];

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

export default function BossSpot({
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
  const [phase, setPhase] = useState<"answering" | "feedback">("answering");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [lostHearts, setLostHearts] = useState(0);
  const [revealed, setRevealed] = useState(false); // sender revealed / text wiped for this message
  const [usesLeft, setUsesLeft] = useState(INSPECTS);
  const [timeLeft, setTimeLeft] = useState(0);
  const timeRef = useRef(0);
  const resolveRef = useRef<(a: InboxAction | "timeout") => void>(() => {});

  const scenario = scenarios[index];
  const mods = modsFor(boss.rule, index);
  const total = spotCount(boss);
  const damagePerHit = W_SPOT / total;

  // (re)start the clock whenever a new message appears
  const [clockKey, setClockKey] = useState(0);
  useEffect(() => {
    if (phase !== "answering" || mods.timer === null) return;
    const id = setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) resolveRef.current("timeout");
    }, 1000);
    return () => clearInterval(id);
  }, [phase, index, mods.timer, clockKey]);

  function beginMessage(timer: number | null) {
    timeRef.current = timer ?? 0;
    setTimeLeft(timer ?? 0);
    setClockKey((k) => k + 1);
  }

  // first message: start its clock
  useEffect(() => {
    timeRef.current = modsFor(boss.rule, 0).timer ?? 0;
    setTimeLeft(timeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resolve(action: InboxAction | "timeout") {
    if (phase !== "answering") return;

    let judgement: Judgement;
    if (action === "timeout") {
      judgement = {
        verdict: "wrong",
        headline: "Too slow! Time ran out.",
        result: { correct: false, xp: 0, trust: -5 },
      };
    } else {
      const j = judge(scenario, action);
      const correct = j.result.correct;
      // boss fights pay in XP and trust, and cost hearts instead of money
      const result: AnswerResult = correct
        ? { correct: true, xp: j.verdict === "great" ? 25 : 12, trust: 2 }
        : { correct: false, xp: 0, trust: -5 };
      judgement = { ...j, result };
    }

    const correct = judgement.result.correct;
    // Temptation: trusting a scam costs 2 hearts, reporting one hits twice as hard
    const trustedScam = mods.temptation && scenario.kind === "scam" && action === "trust";
    const hearts = correct ? 0 : trustedScam ? 2 : 1;
    const reportedScam = mods.temptation && scenario.kind === "scam" && action === "report" && correct;
    const damage = correct ? damagePerHit * (reportedScam ? 2 : 1) : 0;

    const next = applyAnswer(game, judgement.result);
    const leveledUp = levelOf(next.xp) > levelOf(game.xp);
    answer(judgement.result);
    if (scenario.kind === "scam" && getScamType(scenario.scamType)) {
      recordDex(scenario.scamType, correct ? "caught" : "fell");
    }

    if (correct) playCorrect();
    else playWrong();
    if (leveledUp) setTimeout(playLevelUp, 350);

    if (damage) onDamage(damage);
    if (hearts) onLoseLife(hearts);
    setBossLine(pick(correct ? boss.hitLines : boss.missLines));
    setLostHearts(hearts);
    setOutcome({
      scenario,
      judgement,
      dXp: next.xp - game.xp,
      dWallet: 0,
      dTrust: next.trust - game.trust,
      combo: comboMultiplier(game.streak),
      leveledUp,
      newLevel: levelOf(next.xp),
    });
    setPhase("feedback");
  }

  useEffect(() => {
    resolveRef.current = resolve;
  });

  function nextMessage() {
    if (lives <= 0) return onDefeat();
    if (index + 1 >= scenarios.length) return onDone();
    const i = index + 1;
    setIndex(i);
    setOutcome(null);
    setRevealed(false);
    setLostHearts(0);
    setPhase("answering");
    beginMessage(modsFor(boss.rule, i).timer);
  }

  if (!scenario) return null;

  const showResult = phase === "feedback" && outcome;
  const stamp = STAMP[scenario.kind];
  const ordered = mods.swap ? [...ACTIONS].reverse() : ACTIONS;
  const senderHidden = mods.hideSender && !revealed && !showResult;
  // with no wipes left the curse fizzles, so the message never stays unreadable
  const textBlurred = mods.blur && !revealed && !showResult && usesLeft > 0;
  const canUse = (mods.hideSender || mods.blur) && !revealed && !showResult && usesLeft > 0;
  const timeColor = timeLeft > 3 ? "#22e4ff" : "#ff3d6e";
  const reward = REWARDS[index % REWARDS.length];

  function useAbility() {
    setRevealed(true);
    setUsesLeft((n) => n - 1);
  }

  const abilityButton = canUse ? (
    <button
      type="button"
      onClick={useAbility}
      className="w-full rounded-lg border border-magenta px-3 py-2.5 font-mono text-xs font-bold text-magenta transition hover:bg-magenta/15 active:scale-95"
    >
      {mods.blur ? "WIPE THE LENS" : "INSPECT SENDER"} ({usesLeft} left)
    </button>
  ) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* status line: phase, progress, this message's rule */}
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] tracking-widest">
        <span className="text-muted">
          PHASE 1 · SPOT · MESSAGE {index + 1} OF {total}
        </span>
        {mods.banner && (
          <span className="rounded border border-warn px-2 py-0.5 font-bold text-warn">
            {mods.banner}
          </span>
        )}
      </div>

      {mods.timer !== null && phase === "answering" && (
        <div className="-mt-1">
          <Meter value={Math.max(0, timeLeft)} max={mods.timer} color={timeColor} />
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[auto_1fr]">
        {/* phone */}
        <div
          className={`min-h-0 ${showResult ? "hidden lg:block" : ""} ${
            showResult && lostHearts > 0 ? "shake" : ""
          }`}
        >
          <PhoneFrame
            key={scenario.id}
            className="h-full max-h-[560px]"
            title={senderHidden ? "???" : scenario.sender}
            subtitle={senderHidden ? "Unknown sender" : CHANNEL_LABEL[scenario.channel]}
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
                <div className="space-y-2">
                  {abilityButton}
                  <div className="grid grid-cols-3 gap-2">
                    {ordered.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => resolve(a.id)}
                        className={`rounded-lg border px-1 py-3 font-mono text-xs font-bold transition active:scale-95 ${a.button}`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : undefined
            }
          >
            {mods.temptation && (
              <p className="rounded-lg border border-warn bg-warn/10 px-3 py-1.5 text-center font-mono text-xs font-bold text-warn">
                TEMPTATION: +${reward} if you say yes!
              </p>
            )}
            {scenario.subject && (
              <p className="text-xs font-bold text-foreground">{scenario.subject}</p>
            )}
            <div className={textBlurred ? "select-none blur-[6px]" : ""}>
              <MessageBubble text={scenario.text} time="9:41" />
            </div>
          </PhoneFrame>
        </div>

        {/* right panel */}
        <div className="flex min-h-0 min-w-0 flex-col">
          {phase === "answering" && (
            <div
              className="slide-in hidden flex-1 flex-col justify-center gap-3 lg:flex"
              key={`q-${scenario.id}`}
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

              <div className="rounded-xl border border-warn/60 bg-warn/5 p-3">
                <p className="font-mono text-[10px] tracking-widest text-warn">
                  RULE: {boss.ruleName}
                </p>
                <p className="mt-1 text-xs text-muted">{boss.ruleText}</p>
              </div>

              {abilityButton}

              <div className="grid gap-2">
                {ordered.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => resolve(a.id)}
                    className={`rounded-xl border border-border bg-surface/70 p-3 text-left transition active:scale-[0.98] ${a.card}`}
                  >
                    <p className={`font-mono text-sm font-bold ${a.text}`}>{a.label}</p>
                    <p className="text-xs text-muted">{a.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showResult && (
            <Feedback
              outcome={outcome}
              onNext={nextMessage}
              last={index + 1 >= scenarios.length}
              note={`${boss.name}: "${bossLine}"`}
              nextLabel={
                lives <= 0
                  ? "FACE DEFEAT"
                  : index + 1 >= scenarios.length
                    ? "NEXT PHASE →"
                    : "NEXT ATTACK →"
              }
              extraChips={
                lostHearts > 0 ? (
                  <span className="rounded-md bg-danger/15 px-3 py-1 text-danger">
                    -{lostHearts} ♥
                  </span>
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
