// Loads game rounds in the browser from /api/scenario.
// The next round is fetched in the background while you play, so
// "Play again" is instant. If the AI or the network fails, we fall back
// to the hand-written scenarios, so a round can always start.

import { ROUND_SIZE, pickRound } from "@/lib/inbox";
import type { Scenario } from "@/lib/scenarioTypes";

export type RoundSource = "ai" | "mixed" | "fallback";
export type LoadedRound = { scenarios: Scenario[]; source: RoundSource };

const TIMEOUT_MS = 40_000; // the AI can be slow on the free tier

async function load(url: string, size: number, fallback: () => Scenario[]): Promise<LoadedRound> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { scenarios?: Scenario[]; source?: RoundSource };
    if (!Array.isArray(data.scenarios) || data.scenarios.length < size) {
      throw new Error("not enough scenarios");
    }
    return { scenarios: data.scenarios, source: data.source ?? "ai" };
  } catch {
    return { scenarios: fallback(), source: "fallback" };
  } finally {
    clearTimeout(timer);
  }
}

// Rounds that are being (or have been) fetched in the background, one per URL.
const pending = new Map<string, Promise<LoadedRound>>();

/** Start loading a round now, if one is not already on the way. */
export function prefetch(url: string, size: number, fallback: () => Scenario[]) {
  if (!pending.has(url)) pending.set(url, load(url, size, fallback));
}

/** Get a round: the prefetched one if there is one, otherwise load a new one. */
export function take(url: string, size: number, fallback: () => Scenario[]): Promise<LoadedRound> {
  const promise = pending.get(url) ?? load(url, size, fallback);
  pending.delete(url);
  return promise;
}

// ---- Inbox Defender ----

const INBOX_URL = `/api/scenario?count=${ROUND_SIZE}`;

export function prefetchRound() {
  prefetch(INBOX_URL, ROUND_SIZE, pickRound);
}

export function takeRound(): Promise<LoadedRound> {
  return take(INBOX_URL, ROUND_SIZE, pickRound);
}
