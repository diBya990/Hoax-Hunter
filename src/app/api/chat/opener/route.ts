import { NextResponse, type NextRequest } from "next/server";
import { AIError } from "@/lib/ai";
import { generateOpener } from "@/lib/aiChat";
import { getPersona, randomOpener } from "@/lib/personas";

// POST /api/chat/opener  { personaId }
// Returns { opener, story, source }. The opening message is different every time.
// If the AI is unavailable, a random hand-written opener is returned instead,
// so a chat can always start.

export const dynamic = "force-dynamic";

// The AI can take a while on the free tier. Without this, Vercel's free plan would cut the
// request off after about 10 seconds. (Our own time budget in ai.ts is 22 seconds.)
export const maxDuration = 60;

// Simple per-visitor limit so nobody can drain the free AI quota.
const hits = new Map<string, number[]>();
function tooManyRequests(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyRequests(ip)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  }

  let personaId: unknown;
  try {
    personaId = ((await request.json()) as { personaId?: unknown })?.personaId;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const persona = typeof personaId === "string" ? getPersona(personaId) : undefined;
  if (!persona) return NextResponse.json({ error: "Unknown scammer." }, { status: 400 });

  try {
    const { opener, story } = await generateOpener(persona);
    return NextResponse.json({ opener, story, source: "ai" });
  } catch (error) {
    if (!(error instanceof AIError)) console.error("[api/chat/opener]", error);
    return NextResponse.json({ opener: randomOpener(persona), story: "", source: "fallback" });
  }
}
