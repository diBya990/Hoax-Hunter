import { NextResponse, type NextRequest } from "next/server";
import { AIError } from "@/lib/ai";
import { generateScenarios, planKinds } from "@/lib/aiScenario";
import { ensureMinimumMix, pickRound } from "@/lib/inbox";
import { SCAM_TYPES, type ScamTypeId } from "@/lib/scamTypes";
import type { Scenario } from "@/lib/scenarioTypes";

// GET /api/scenario?count=10&focus=bank-phishing,romance
// Returns { scenarios, source }. source is:
//   "ai"       all scenarios were written by the AI
//   "mixed"    some from the AI, the rest hand-written (the AI gave too few good ones)
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
  return recent.length > 12;
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
    .slice(0, 4);

  let scenarios: Scenario[] = [];
  let source: "ai" | "mixed" | "fallback" = "fallback";
  let note: string | undefined;

  try {
    scenarios = (await generateScenarios(count, planKinds(count), focus)).slice(0, count);
    source = scenarios.length >= count ? "ai" : "mixed";
  } catch (error) {
    note = error instanceof AIError ? error.message : "The AI had a problem.";
    if (!(error instanceof AIError)) console.error("[api/scenario]", error);
  }

  // top up with hand-written scenarios if the AI gave too few
  if (scenarios.length < count) {
    const used = new Set(scenarios.map((s) => s.text));
    const backup = pickRound().filter((s) => !used.has(s.text));
    scenarios = [...scenarios, ...backup.slice(0, count - scenarios.length)];
  }

  // the AI sometimes ignores the requested mix: keep at least 2 of each kind
  if (count >= 6) scenarios = ensureMinimumMix(scenarios);

  // be honest about where the messages came from
  if (source === "ai" && scenarios.some((s) => !s.id.startsWith("ai-"))) source = "mixed";

  return NextResponse.json({ scenarios, source, ...(note ? { note } : {}) });
}
