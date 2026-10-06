// Rules for Detective mode: the player taps the suspicious words in a scam
// message. A clue counts as found if any word inside its phrase was tapped.
// Tapped words that are not part of any clue are false alarms.

import type { AnswerResult } from "@/lib/gameState";
import type { RedFlagId } from "@/lib/scamTypes";
import { SCENARIOS } from "@/lib/scenarios";
import type { Scenario } from "@/lib/scenarioTypes";

export const DETECTIVE_ROUND = 5; // messages per round
export const TIME_PER_MESSAGE = 25; // seconds
export const DETECTIVE_URL = `/api/scenario?count=${DETECTIVE_ROUND}&mix=${DETECTIVE_ROUND},0,0&clues=1`;

/** Hand-written backup round: scam messages that have clues. */
export function pickDetectiveRound(): Scenario[] {
  const pool = SCENARIOS.filter((s) => s.kind === "scam" && (s.clues?.length ?? 0) >= 2);
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, DETECTIVE_ROUND);
}

// ---------- words and clues ----------

export type Word = { text: string; start: number; end: number };

/** Splits a message into tappable words, remembering where each one sits in the text. */
export function splitWords(text: string): Word[] {
  const words: Word[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    words.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return words;
}

export type ClueRange = { start: number; end: number; flag: RedFlagId; phrase: string };

/** Where each clue sits in the message text. Clues that cannot be found are skipped. */
export function clueRanges(s: Scenario): ClueRange[] {
  const lower = s.text.toLowerCase();
  const ranges: ClueRange[] = [];
  for (const c of s.clues ?? []) {
    const start = lower.indexOf(c.phrase.toLowerCase());
    if (start !== -1) ranges.push({ start, end: start + c.phrase.length, flag: c.flag, phrase: c.phrase });
  }
  return ranges;
}

/** Index of the clue this word belongs to, or -1. */
export function clueOfWord(w: Word, ranges: ClueRange[]): number {
  return ranges.findIndex((r) => w.start < r.end && w.end > r.start);
}

// ---------- scoring ----------

export type Finding = {
  found: number[]; // clue indexes the player found
  missed: number[]; // clue indexes the player missed
  falseWords: number[]; // tapped word indexes that are not clues
  total: number;
};

export function evaluate(s: Scenario, selected: number[]): Finding {
  const words = splitWords(s.text);
  const ranges = clueRanges(s);

  const found = new Set<number>();
  const falseWords: number[] = [];
  for (const i of selected) {
    const clue = clueOfWord(words[i], ranges);
    if (clue === -1) falseWords.push(i);
    else found.add(clue);
  }

  return {
    found: [...found],
    missed: ranges.map((_, i) => i).filter((i) => !found.has(i)),
    falseWords,
    total: ranges.length,
  };
}

export type DetectiveJudgement = {
  result: AnswerResult;
  verdict: "great" | "ok" | "wrong";
  headline: string;
};

export function judgeDetective(f: Finding): DetectiveJudgement {
  const ratio = f.total === 0 ? 0 : f.found.length / f.total;
  const perfect = f.found.length === f.total && f.falseWords.length === 0;
  const correct = ratio >= 0.6;

  if (!correct) {
    return {
      verdict: "wrong",
      headline: "You missed too many red flags.",
      result: { correct: false, xp: 0, trust: -3 },
    };
  }

  const xp = Math.max(
    5,
    f.found.length * 12 + (f.found.length === f.total ? 10 : 0) - f.falseWords.length * 3
  );
  return {
    verdict: perfect ? "great" : "ok",
    headline: perfect
      ? "Perfect detective work!"
      : f.found.length === f.total
        ? "You found them all, with a few extra taps."
        : "Good eye, but you missed some.",
    result: { correct: true, xp, trust: 3 },
  };
}
