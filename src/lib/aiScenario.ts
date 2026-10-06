// Asks the AI to write fresh game rounds, then checks every one of them.
// Server-side only (it uses the AI key through ai.ts).
//
// The AI is told the game's own scam knowledge (scam types + red flags) and the
// exact mix of messages we need, and must answer in a strict JSON shape.
// Anything that does not pass validation is thrown away.

import { AIError, askAI } from "@/lib/ai";
import { RED_FLAGS, SCAM_TYPES, type RedFlagId, type ScamTypeId } from "@/lib/scamTypes";
import type { Channel, Clue, Kind, Scenario } from "@/lib/scenarioTypes";

const CHANNELS: Channel[] = ["sms", "whatsapp", "email", "dm"];
const KINDS: Kind[] = ["scam", "safe", "unsure"];
const FLAG_IDS = Object.keys(RED_FLAGS) as RedFlagId[];
const SCAM_IDS = SCAM_TYPES.map((t) => t.id);

export type KindPlan = Record<Kind, number>;

/** Decides how many of each kind to ask for: at least 2 each when possible. */
export function planKinds(count: number): KindPlan {
  const plan: KindPlan = { scam: 0, safe: 0, unsure: 0 };
  for (let i = 0; i < count; i++) {
    // first fill the minimum round-robin, then pick randomly
    const kind = i < 6 ? KINDS[i % 3] : KINDS[Math.floor(Math.random() * 3)];
    plan[kind]++;
  }
  return plan;
}

// ---------- what we tell the AI ----------

const flagList = FLAG_IDS.map((id) => `- ${id}: ${RED_FLAGS[id].label}`).join("\n");
const typeList = SCAM_TYPES.map((t) => `- ${t.id}: ${t.name}. ${t.summary}`).join("\n");

const SYSTEM = `You write realistic but completely FICTIONAL practice messages for a scam-awareness game played by students worldwide. Players decide how to respond to each message.

THE THREE KINDS OF MESSAGE
- scam: a clear scam. The best response is to report it.
- safe: a normal, harmless message. The best response is to trust it. It has no red flags and asks for no money, codes or risky links.
- unsure: genuinely ambiguous. It could be real or fake and cannot be judged from the text alone. It looks plausible but has one or two warning signs. The best response is to verify through an official channel.

SCAM TYPES (use these ids for scamType on scam messages)
${typeList}

RED FLAG IDS (use only these ids in redFlags)
${flagList}

RULES
- Each message is exactly what a person would receive on their phone or inbox. Channels: sms, whatsapp, email, dm.
- scamType: scam messages use one scam type id from the list. safe messages use "legit". unsure messages use "unclear".
- redFlags: scam messages list 2 to 5 flags that truly appear in the text. unsure messages list 1 or 2 warning signs. safe messages use an empty list.
- NEVER use real company, brand, bank, government or person names, and never real phone numbers or working websites. Use generic names like "Your Bank", "Courier Service", "HR Careers" or invented first names. Any link must be an obviously fake lookalike address such as secure-bank-verify.co/login.
- Keep it international: use $ for money and avoid country-specific services.
- Vary the channel, the topic, the tone and the difficulty. Mix easy and hard ones. Do not copy the examples in these instructions.
- clues: for scam messages, 2 to 4 short phrases (1 to 8 words each) copied EXACTLY, character for character, from the message text, each showing one red flag (give that flag id). Phrases must not overlap each other. Use an empty list for safe and unsure messages.
- text: at most 280 characters. subject: only for email, otherwise an empty string.
- explanation: 1 or 2 simple sentences (reading level of a 13 year old) saying what the real clue is and what the player should do instead.
- difficulty: 1 (obvious), 2 (needs attention) or 3 (very convincing).
- Plain text only, no markdown. Nothing hateful, sexual, violent or targeting a real person.`;

const SCHEMA = {
  type: "object",
  properties: {
    scenarios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          channel: { type: "string", enum: CHANNELS },
          sender: { type: "string", description: "Name or phone number shown as the sender." },
          subject: { type: "string", description: "Email subject, or an empty string." },
          text: { type: "string", description: "The message itself." },
          kind: { type: "string", enum: KINDS },
          scamType: { type: "string", enum: [...SCAM_IDS, "legit", "unclear"] },
          redFlags: { type: "array", items: { type: "string", enum: FLAG_IDS } },
          explanation: { type: "string" },
          difficulty: { type: "integer", minimum: 1, maximum: 3 },
          clues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phrase: { type: "string", description: "Exact words copied from the text." },
                flag: { type: "string", enum: FLAG_IDS },
              },
              required: ["phrase", "flag"],
            },
          },
        },
        required: [
          "channel",
          "sender",
          "subject",
          "text",
          "kind",
          "scamType",
          "redFlags",
          "explanation",
          "difficulty",
          "clues",
        ],
      },
    },
  },
  required: ["scenarios"],
};

// ---------- checking what comes back ----------

const asString = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Turns one AI item into a safe Scenario, or null if it is not good enough. */
function cleanOne(raw: unknown, id: string): Scenario | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;

  const channel = CHANNELS.find((c) => c === o.channel);
  const kind = KINDS.find((k) => k === o.kind);
  const text = asString(o.text, 320);
  const sender = asString(o.sender, 60);
  const explanation = asString(o.explanation, 400);
  if (!channel || !kind || !text || !sender || !explanation) return null;

  // keep only real red flag ids, without repeats
  const flags = Array.isArray(o.redFlags)
    ? [...new Set(o.redFlags.filter((f): f is RedFlagId => FLAG_IDS.includes(f as RedFlagId)))]
    : [];

  let scamType: Scenario["scamType"];
  let redFlags: RedFlagId[];
  if (kind === "scam") {
    const t = SCAM_IDS.find((s) => s === o.scamType);
    if (!t || flags.length === 0) return null;
    scamType = t as ScamTypeId;
    redFlags = flags.slice(0, 5);
  } else if (kind === "unsure") {
    scamType = "unclear";
    redFlags = flags.slice(0, 2);
  } else {
    scamType = "legit";
    redFlags = [];
  }

  const d = Number(o.difficulty);
  const difficulty = (d === 1 || d === 2 || d === 3 ? d : 2) as 1 | 2 | 3;
  const subject = channel === "email" ? asString(o.subject, 100) : "";
  const clues = kind === "scam" ? cleanClues(o.clues, text) : [];

  return {
    id,
    channel,
    sender,
    ...(subject ? { subject } : {}),
    text,
    kind,
    scamType,
    redFlags,
    explanation,
    difficulty,
    ...(clues.length ? { clues } : {}),
  };
}

/**
 * Keeps only clues whose phrase really appears in the message (ignoring upper
 * or lower case) and does not overlap another clue. The phrase is re-copied
 * from the message so its spelling is exact.
 */
function cleanClues(raw: unknown, text: string): Clue[] {
  if (!Array.isArray(raw)) return [];
  const lower = text.toLowerCase();
  const taken: [number, number][] = [];
  const clues: Clue[] = [];

  for (const item of raw) {
    const phrase = asString((item as { phrase?: unknown })?.phrase, 100);
    const flag = (item as { flag?: unknown })?.flag;
    if (!phrase || !FLAG_IDS.includes(flag as RedFlagId)) continue;

    const start = lower.indexOf(phrase.toLowerCase());
    if (start === -1) continue;
    const end = start + phrase.length;
    if (taken.some(([a, b]) => start < b && end > a)) continue; // overlaps another clue

    taken.push([start, end]);
    clues.push({ phrase: text.slice(start, end), flag: flag as RedFlagId });
  }
  return clues.slice(0, 5);
}

const VARIETY_WORDS = [
  "student life",
  "online shopping",
  "social media",
  "part-time work",
  "travel",
  "gaming",
  "family",
  "banking app",
  "university",
  "phone plan",
  "streaming",
  "marketplace",
];

/** One AI request for a small batch of scenarios. */
async function generateChunk(
  plan: KindPlan,
  focus: ScamTypeId[],
  tag: string
): Promise<Scenario[]> {
  const count = plan.scam + plan.safe + plan.unsure;
  // a few random topics push the AI to vary between requests
  const topics = [...VARIETY_WORDS].sort(() => Math.random() - 0.5).slice(0, 4).join(", ");

  const prompt = `Write exactly ${count} messages: ${plan.scam} scam, ${plan.safe} safe and ${plan.unsure} unsure. Follow these numbers exactly.
${focus.length ? `Feature these scam types among the scams where possible: ${focus.join(", ")}.\n` : ""}Some topics to draw on this time: ${topics}.
Put the messages in a shuffled order, not grouped by kind.`;

  const stamp = Date.now().toString(36);

  return askAI({ system: SYSTEM, prompt, schema: SCHEMA, temperature: 1 }, (raw) => {
    const list = (raw as { scenarios?: unknown })?.scenarios;
    if (!Array.isArray(list)) throw new AIError("The AI's answer was incomplete. Please try again.");

    const seen = new Set<string>();
    const good: Scenario[] = [];
    list.forEach((item, i) => {
      const s = cleanOne(item, `ai-${stamp}-${tag}-${i}`);
      if (!s || seen.has(s.text)) return;
      seen.add(s.text);
      good.push(s);
    });
    if (good.length === 0) throw new AIError("The AI's answer was incomplete. Please try again.");
    return good;
  });
}

/** Splits a plan into two halves so two requests can run at the same time. */
function splitPlan(plan: KindPlan): [KindPlan, KindPlan] {
  const a: KindPlan = {
    scam: Math.ceil(plan.scam / 2),
    safe: Math.ceil(plan.safe / 2),
    unsure: Math.ceil(plan.unsure / 2),
  };
  const b: KindPlan = {
    scam: plan.scam - a.scam,
    safe: plan.safe - a.safe,
    unsure: plan.unsure - a.unsure,
  };
  return [a, b];
}

/**
 * Asks the AI for fresh scenarios following `plan`. Large rounds are split into
 * two requests that run in parallel, which roughly halves the waiting time.
 * Returns only the scenarios that passed validation (possibly fewer than asked).
 */
export async function generateScenarios(
  count: number,
  plan: KindPlan,
  focus: ScamTypeId[] = []
): Promise<Scenario[]> {
  const chunks = count > 5 ? splitPlan(plan) : [plan];

  const results = await Promise.allSettled(
    chunks.map((p, i) => generateChunk(p, focus, String(i)))
  );

  const scenarios = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (scenarios.length === 0) {
    // every request failed: pass on the first error so the caller can explain it
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    throw failed.reason;
  }

  // the two batches are separate, so remove duplicates between them and mix them up
  const seen = new Set<string>();
  return scenarios
    .filter((s) => (seen.has(s.text) ? false : (seen.add(s.text), true)))
    .sort(() => Math.random() - 0.5);
}
