// Rules for Inbox Defender: how a round is picked and how each answer is scored.

import type { AnswerResult } from "@/lib/gameState";
import { SCENARIOS } from "@/lib/scenarios";
import type { Kind, Scenario } from "@/lib/scenarioTypes";

export type InboxAction = "trust" | "verify" | "report";
export type Verdict = "great" | "ok" | "wrong";

export const ROUND_SIZE = 10;
const MIN_PER_KIND = 2; // every round has at least 2 scams, 2 safe and 2 unsure messages

/** Money lost when you fall for a scam: harder scams steal more. */
export function lossFor(s: Scenario): number {
  const full = [150, 250, 400][s.difficulty - 1];
  return s.kind === "unsure" ? Math.round(full / 2) : full;
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Messages from the previous round. The next round avoids them where it can,
// so back-to-back rounds do not feel repeated.
let lastRoundIds = new Set<string>();

/** Shuffle, then move messages seen last round to the back (sort is stable). */
function freshFirst(items: Scenario[]): Scenario[] {
  return shuffle(items).sort(
    (a, b) => Number(lastRoundIds.has(a.id)) - Number(lastRoundIds.has(b.id))
  );
}

/**
 * A new random round of 10 messages. All 3 kinds always appear (at least 2
 * each), and the last 4 slots are filled at random from everything left,
 * so the mix is different every round.
 */
export function pickRound(): Scenario[] {
  const byKind = (k: Kind) => freshFirst(SCENARIOS.filter((s) => s.kind === k));
  const pools: Record<Kind, Scenario[]> = {
    scam: byKind("scam"),
    safe: byKind("safe"),
    unsure: byKind("unsure"),
  };

  const picked: Scenario[] = [];
  (Object.keys(pools) as Kind[]).forEach((k) => {
    picked.push(...pools[k].splice(0, MIN_PER_KIND));
  });

  const rest = freshFirst([...pools.scam, ...pools.safe, ...pools.unsure]);
  picked.push(...rest.slice(0, ROUND_SIZE - picked.length));

  const round = shuffle(picked);
  lastRoundIds = new Set(round.map((s) => s.id));
  return round;
}

/**
 * Makes sure a round has at least `min` of every kind. If the AI ignored the
 * requested mix, extra messages of the most common kind are swapped for
 * hand-written ones of the missing kind.
 */
export function ensureMinimumMix(round: Scenario[], min = MIN_PER_KIND): Scenario[] {
  const result = [...round];
  const kinds: Kind[] = ["scam", "safe", "unsure"];
  const countOf = (k: Kind) => result.filter((s) => s.kind === k).length;
  const used = new Set(result.map((s) => s.text));

  for (const missing of kinds) {
    while (countOf(missing) < min) {
      // the kind with the most messages gives one up (it must stay above the minimum)
      const donor = [...kinds].sort((a, b) => countOf(b) - countOf(a))[0];
      if (countOf(donor) <= min) break;

      const replacement = shuffle(
        SCENARIOS.filter((s) => s.kind === missing && !used.has(s.text))
      )[0];
      const at = result.findIndex((s) => s.kind === donor);
      if (!replacement || at === -1) break;

      used.add(replacement.text);
      result[at] = replacement;
    }
  }
  return shuffle(result);
}

export type Judgement = {
  result: AnswerResult; // what changes in the shared game state
  verdict: Verdict;
  headline: string;
};

export function judge(s: Scenario, action: InboxAction): Judgement {
  if (s.kind === "scam") {
    if (action === "report") {
      return {
        verdict: "great",
        headline: "Reported! Great catch.",
        result: { correct: true, xp: 30, trust: 5 },
      };
    }
    if (action === "verify") {
      return {
        verdict: "ok",
        headline: "Smart: you checked before acting.",
        result: { correct: true, xp: 20, trust: 3 },
      };
    }
    return {
      verdict: "wrong",
      headline: "You fell for it!",
      result: { correct: false, xp: 0, wallet: -lossFor(s), trust: -15 },
    };
  }

  if (s.kind === "safe") {
    if (action === "trust") {
      return {
        verdict: "great",
        headline: "Correct, this one is safe.",
        result: { correct: true, xp: 25, trust: 3 },
      };
    }
    if (action === "verify") {
      return {
        verdict: "ok",
        headline: "Careful, but this one was safe.",
        result: { correct: true, xp: 10, trust: 1 },
      };
    }
    return {
      verdict: "wrong",
      headline: "False alarm. This message was safe.",
      result: { correct: false, xp: 0, trust: -5 },
    };
  }

  // unsure: you cannot tell from the message alone, so verifying is the best move
  if (action === "verify") {
    return {
      verdict: "great",
      headline: "Exactly right: verify first.",
      result: { correct: true, xp: 30, trust: 5 },
    };
  }
  if (action === "report") {
    return {
      verdict: "ok",
      headline: "Cautious, but it might have been real.",
      result: { correct: true, xp: 10 },
    };
  }
  return {
    verdict: "wrong",
    headline: "Risky! You could not be sure.",
    result: { correct: false, xp: 0, wallet: -lossFor(s), trust: -10 },
  };
}

export function rating(correct: number, total: number): string {
  const pct = correct / total;
  if (pct === 1) return "Perfect Hunter";
  if (pct >= 0.75) return "Sharp Eyes";
  if (pct >= 0.5) return "Getting There";
  return "Scammers Love You";
}
