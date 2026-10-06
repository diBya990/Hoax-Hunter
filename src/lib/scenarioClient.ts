// Loads game rounds in the browser from /api/scenario.
// The next round is fetched in the background while you play, so
// "Play again" is instant. If the AI or the network fails, we fall back
// to the hand-written scenarios, so a round can always start.

import { ROUND_SIZE, pickRound } from "@/lib/inbox";
import type { Scenario } from "@/lib/scenarioTypes";

export type RoundSource = "ai" | "mixed" | "fallback";
export type LoadedRound = { scenarios: Scenario[]; source: RoundSource };

const TIMEOUT_MS = 40_000; // the AI can be slow on the free tier

async function load(): Promise<LoadedRound> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`/api/scenario?count=${ROUND_SIZE}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { scenarios?: Scenario[]; source?: RoundSource };
    if (!Array.isArray(data.scenarios) || data.scenarios.length < ROUND_SIZE) {
      throw new Error("not enough scenarios");
    }
    return { scenarios: data.scenarios, source: data.source ?? "ai" };
  } catch {
    return { scenarios: pickRound(), source: "fallback" };
  } finally {
    clearTimeout(timer);
  }
}

// The round that is being (or has been) fetched in the background.
let pending: Promise<LoadedRound> | null = null;

/** Start loading the next round now, if one is not already on the way. */
export function prefetchRound() {
  if (!pending) pending = load();
}

/** Get a round: the prefetched one if there is one, otherwise load a new one. */
export function takeRound(): Promise<LoadedRound> {
  const promise = pending ?? load();
  pending = null;
  return promise;
}
