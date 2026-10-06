import { NextResponse, type NextRequest } from "next/server";
import { AIError } from "@/lib/ai";
import { generateScenarios, planKinds, type KindPlan } from "@/lib/aiScenario";
import { ensureMinimumMix, pickRound } from "@/lib/inbox";
import { buildRound } from "@/lib/rounds";
import { SCAM_TYPES, type ScamTypeId } from "@/lib/scamTypes";
import type { Scenario } from "@/lib/scenarioTypes";

// GET /api/scenario?count=10&focus=bank-phishing,romance&mix=5,1,1&clues=1
//   count  how many scenarios (1 to 10)
//   focus  scam types to feature (up to 5)
//   mix    exact numbers of scam,safe,unsure (must add up to count). Without it,
//          the mix is random with at least 2 of each kind (Inbox Defender).
//   clues  1 = scams must have clues for Detective mode
// Returns { scenarios, source }. source is:
//   "ai"       all scenarios were written by the AI
//   "mixed"    some from the AI, the rest hand-written
//   "fallback" the AI was unavailable, so all are hand-written
// The game always gets enough scenarios, so a round can always start.

export const dynamic = "force-dynamic";

const MAX_COUNT = 10;

// Very simple per-visitor limit so nobody can drain the free AI quota.
const hits = new Map<string, number[]>();
function tooManyRequests(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

/** Reads ?mix=a,b,c. Returns null if it is missing or does not add up to count. */
function parseMix(value: string | null, count: number): KindPlan | null {
  if (!value) return null;
  const n = value.split(",").map((v) => Math.max(0, Math.floor(Number(v))));
  if (n.length !== 3 || n.some((v) => !Number.isFinite(v))) return null;
  if (n[0] + n[1] + n[2] !== count) return null;
  return { scam: n[0], safe: n[1], unsure: n[2] };
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyRequests(ip)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  }

  const params = request.nextUrl.searchParams;
  const count = Math.min(MAX_COUNT, Math.max(1, Number(params.get("count")) || MAX_COUNT));
  const focus = (params.get("focus") ?? "")
    .split(",")
    .filter((id): id is ScamTypeId => SCAM_TYPES.some((t) => t.id === id))
    .slice(0, 5);
  const exactMix = parseMix(params.get("mix"), count);
  const needClues = params.get("clues") === "1";
  const plan = exactMix ?? planKinds(count);

  let ai: Scenario[] = [];
  let note: string | undefined;
  try {
    ai = await generateScenarios(count, plan, focus);
  } catch (error) {
    note = error instanceof AIError ? error.message : "The AI had a problem.";
    if (!(error instanceof AIError)) console.error("[api/scenario]", error);
  }

  let scenarios: Scenario[];
  if (exactMix || needClues) {
    // Detective and Boss Fights: build the round to the exact mix
    scenarios = buildRound(ai, plan, { focus, needClues }).scenarios;
  } else {
    // Inbox Defender: use the AI's scenarios, top up if there are too few
    scenarios = ai.slice(0, count);
    if (scenarios.length < count) {
      const used = new Set(scenarios.map((s) => s.text));
      const backup = pickRound().filter((s) => !used.has(s.text));
      scenarios = [...scenarios, ...backup.slice(0, count - scenarios.length)];
    }
    // the AI sometimes ignores the requested mix: keep at least 2 of each kind
    if (count >= 6) scenarios = ensureMinimumMix(scenarios);
  }

  // be honest about where the messages came from
  const aiCount = scenarios.filter((s) => s.id.startsWith("ai-")).length;
  const source = aiCount === 0 ? "fallback" : aiCount === scenarios.length ? "ai" : "mixed";

  return NextResponse.json({ scenarios, source, ...(note ? { note } : {}) });
}
