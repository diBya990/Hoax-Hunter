import { NextResponse, type NextRequest } from "next/server";
import { AIError } from "@/lib/ai";
import { chatTurn, type HistoryItem } from "@/lib/aiChat";
import { MAX_TURNS } from "@/lib/chat";
import { getPersona } from "@/lib/personas";

// POST /api/chat  { personaId, messages: [{ from, text }] }
// Returns the scammer's next message and the judge's verdict (see ChatReply).

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 2 * MAX_TURNS + 2;
const MAX_TEXT = 400;

// Simple per-visitor limit so nobody can drain the free AI quota.
const hits = new Map<string, number[]>();
function tooManyRequests(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 40;
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyRequests(ip)) return fail("Too many requests. Wait a minute.", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  const { personaId, messages, story } = (body ?? {}) as {
    personaId?: unknown;
    messages?: unknown;
    story?: unknown;
  };

  const persona = typeof personaId === "string" ? getPersona(personaId) : undefined;
  if (!persona) return fail("Unknown scammer.", 400);

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return fail("Invalid conversation.", 400);
  }

  // check every message, and keep only the fields we expect
  const history: HistoryItem[] = [];
  for (const m of messages) {
    const from = (m as { from?: unknown })?.from;
    const text = (m as { text?: unknown })?.text;
    if ((from !== "scammer" && from !== "player") || typeof text !== "string") {
      return fail("Invalid conversation.", 400);
    }
    history.push({ from, text: text.trim().slice(0, MAX_TEXT) });
  }

  const last = history[history.length - 1];
  const playerTurns = history.filter((m) => m.from === "player").length;
  if (last.from !== "player" || !last.text || playerTurns > MAX_TURNS) {
    return fail("Invalid conversation.", 400);
  }

  try {
    // the backstory comes from the browser, so keep it short (it is also cleaned inside chatTurn)
    const backstory = typeof story === "string" ? story.slice(0, 300) : "";
    const reply = await chatTurn(persona, history, backstory);

    // the turn limit is enforced here, not trusted to the browser
    if (reply.status === "continue" && playerTurns >= MAX_TURNS) {
      return NextResponse.json({
        ...reply,
        status: "survived",
        reason: `You made it through all ${MAX_TURNS} messages without giving in.`,
        lesson:
          "Staying calm and not giving in under pressure is the best defence. Ending the chat early is even safer.",
      });
    }
    return NextResponse.json(reply);
  } catch (error) {
    if (error instanceof AIError) return fail(error.message, 503);
    console.error("[api/chat]", error);
    return fail("The scammer lost signal. Please try again.", 500);
  }
}
