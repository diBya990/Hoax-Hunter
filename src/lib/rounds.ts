// Builds a round with an exact mix of message kinds, used by Detective and Boss
// Fights. The AI's scenarios are used first. Whatever is missing (the AI wrote
// too few of a kind, or some had no usable clues) is topped up from the
// hand-written scenarios, so a round is always complete.

import type { KindPlan } from "@/lib/aiScenario";
import type { ScamTypeId } from "@/lib/scamTypes";
import { SCENARIOS } from "@/lib/scenarios";
import type { Kind, Scenario } from "@/lib/scenarioTypes";

const KINDS: Kind[] = ["scam", "safe", "unsure"];

type Options = {
  focus?: ScamTypeId[]; // scam types to prefer
  needClues?: boolean; // scams must have at least 2 clues (Detective)
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildRound(
  ai: Scenario[],
  plan: KindPlan,
  { focus = [], needClues = false }: Options = {}
): { scenarios: Scenario[]; aiCount: number } {
  const used = new Set<string>();
  const result: Scenario[] = [];

  const usable = (s: Scenario) =>
    !used.has(s.text) && (!needClues || s.kind !== "scam" || (s.clues?.length ?? 0) >= 2);

  // scams of the focus types come first
  const preferFocus = (list: Scenario[]) =>
    focus.length === 0
      ? list
      : [...list].sort(
          (a, b) =>
            Number(focus.includes(b.scamType as ScamTypeId)) -
            Number(focus.includes(a.scamType as ScamTypeId))
        );

  for (const kind of KINDS) {
    const want = plan[kind];
    const take = (pool: Scenario[]) => {
      for (const s of pool) {
        if (result.filter((r) => r.kind === kind).length >= want) break;
        if (!usable(s)) continue;
        used.add(s.text);
        result.push(s);
      }
    };

    take(preferFocus(ai.filter((s) => s.kind === kind)));
    take(preferFocus(shuffle(SCENARIOS.filter((s) => s.kind === kind))));
  }

  return {
    scenarios: shuffle(result),
    aiCount: result.filter((s) => s.id.startsWith("ai-")).length,
  };
}
