import { NextResponse, type NextRequest } from "next/server";
import { AIError } from "@/lib/ai";
import { analyzeWithAI, type AiAnalysis } from "@/lib/aiHelper";
import { blend, levelOf, runRules, type Level, type RuleResult, type Signal } from "@/lib/riskEngine";

// POST /api/analyze  { text?: string, image?: { mimeType, data (base64) } }
//
// The hybrid Scam Helper:
//   1. the RULE ENGINE scores the pasted text (plain code, instant)
//   2. the AI judges it too, using the rule findings and our scam knowledge,
//      and reads the screenshot if there is one
//   3. the two scores are blended into one 0-100 risk score
// If the AI is unavailable, the answer comes from the rule engine alone.

export const dynamic = "force-dynamic";

// The AI can take a while on the free tier. Without this, Vercel's free plan would cut the
// request off after about 10 seconds. (Our own time budget in ai.ts is 22 seconds.)
export const maxDuration = 60;

const MAX_TEXT = 4000;
const MAX_IMAGE_BASE64 = 4_500_000; // about 3.3 MB of picture
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Per-visitor limit so nobody can drain the free AI quota (relaxed while developing).
const LIMIT_PER_MINUTE = process.env.NODE_ENV === "production" ? 15 : 200;
const hits = new Map<string, number[]>();
function tooManyRequests(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT_PER_MINUTE;
}

export type HelperResult = {
  score: number; // the blended 0-100 risk score
  level: Level;
  ruleScore: number | null;
  aiScore: number | null;
  signals: Signal[]; // what the rule engine found
  ai: AiAnalysis | null;
  text: string; // the message that was analysed
  source: "hybrid" | "rules-only";
  note?: string;
};

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyRequests(ip)) return fail("Too many checks. Wait a minute and try again.", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  const { text: rawText, image: rawImage } = (body ?? {}) as { text?: unknown; image?: unknown };

  const text = typeof rawText === "string" ? rawText.trim().slice(0, MAX_TEXT) : "";

  let image: { mimeType: string; data: string } | undefined;
  if (rawImage !== undefined && rawImage !== null) {
    const i = rawImage as { mimeType?: unknown; data?: unknown };
    if (
      typeof i.mimeType !== "string" ||
      !IMAGE_TYPES.includes(i.mimeType) ||
      typeof i.data !== "string" ||
      i.data.length === 0 ||
      i.data.length > MAX_IMAGE_BASE64 ||
      !/^[A-Za-z0-9+/=]+$/.test(i.data)
    ) {
      return fail("That picture could not be used. Try a PNG or JPEG screenshot.", 400);
    }
    image = { mimeType: i.mimeType, data: i.data };
  }

  if (!text && !image) return fail("Paste a message or add a screenshot first.", 400);

  // 1. rules on the pasted text
  const ruleOnText: RuleResult | null = text ? runRules(text) : null;

  // 2. the AI
  let ai: AiAnalysis | null = null;
  let note: string | undefined;
  try {
    ai = await analyzeWithAI({ text, image }, ruleOnText);
  } catch (error) {
    note = error instanceof AIError ? error.message : "The AI had a problem.";
    if (!(error instanceof AIError)) console.error("[api/analyze]", error);
  }

  // for a screenshot, the rules run on the text the AI read from it
  const analysed = text || ai?.extractedText || "";
  const rule = ruleOnText ?? (analysed ? runRules(analysed) : null);

  if (!rule && !ai) {
    return fail(note ?? "Could not read that screenshot. Try pasting the text instead.", 503);
  }

  // 3. blend
  const ruleScore = rule?.score ?? null;
  const aiScore = ai?.score ?? null;
  const score =
    ruleScore !== null ? blend(ruleScore, aiScore) : (aiScore ?? 0);

  const result: HelperResult = {
    score,
    level: levelOf(score),
    ruleScore,
    aiScore,
    signals: rule?.signals ?? [],
    ai,
    text: analysed,
    source: ai ? "hybrid" : "rules-only",
    ...(note ? { note } : {}),
  };
  return NextResponse.json(result);
}
