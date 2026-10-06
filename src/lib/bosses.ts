// The Boss Fights campaign: four scam masters, fought in order.
//
// Every fight has THREE phases and one health bar:
//   1. SPOT   sort the boss's messages. Each boss twists the rules (the "rule").
//   2. STRIKE a Detective round: tap the red flags in the boss's scam messages.
//   3. DUEL   a live chat with the boss in disguise. Refuse to land the final blow.
// You have a few hearts for the whole fight. Run out and the boss wins.

import type { KindPlan } from "@/lib/aiScenario";
import { buildRound } from "@/lib/rounds";
import type { ScamTypeId } from "@/lib/scamTypes";
import type { Scenario } from "@/lib/scenarioTypes";

// Where the boss's health goes: the share (in %) each phase takes off the bar.
export const W_SPOT = 40;
export const W_STRIKE = 25;
export const W_DUEL = 35;

// Phase 1 twists
export type RuleId = "storm" | "disguise" | "temptation" | "chaos";

export type Boss = {
  id: string;
  name: string;
  title: string;
  blurb: string;
  color: string;
  types: ScamTypeId[]; // the scam types this boss favours
  lives: number;
  rule: RuleId;
  ruleName: string;
  ruleText: string;
  spot: KindPlan; // phase 1: how many scam / safe / unsure messages
  strike: number; // phase 2: how many scam messages to investigate
  duelPersona: string; // phase 3: which scammer from Scammer Chat the boss pretends to be
  duelTurns: number; // phase 3: how many messages you get
  intro: string;
  hitLines: string[]; // the boss says one of these when you hit it
  missLines: string[]; // ...and one of these when you slip
  defeatLine: string; // said when the boss is beaten
  winLine: string; // said when you are beaten
};

export const BOSSES: Boss[] = [
  {
    id: "phisher-king",
    name: "The Phisher King",
    title: "Lord of Fake Links",
    blurb: "Fake banks, parcels and tax offices, all coming at lightning speed.",
    color: "#22e4ff",
    types: ["bank-phishing", "fake-delivery", "gov-impersonation", "otp-theft"],
    lives: 3,
    rule: "storm",
    ruleName: "LINK STORM",
    ruleText: "Every message has only 6 seconds. If time runs out, you fall for it.",
    spot: { scam: 2, safe: 1, unsure: 1 },
    strike: 2,
    duelPersona: "bank-fraud",
    duelTurns: 4,
    intro: "Welcome to my inbox, little fish. Let's see if you can tell a real bank from my bait.",
    hitLines: [
      "Tch... a lucky catch.",
      "You saw through my hook?!",
      "Impossible. My links are perfect!",
    ],
    missLines: [
      "Hahaha! Another fish on my line.",
      "Click, click, click... you're mine.",
      "That one was easy, wasn't it?",
    ],
    defeatLine: "My phishing nets... torn apart. Fine. You win this time.",
    winLine: "Another victim for the Phisher King. Your details are mine now.",
  },
  {
    id: "impostor",
    name: "The Impostor",
    title: "Master of Disguise",
    blurb: "You never see who is really sending the message.",
    color: "#ff3df0",
    types: ["boss-impersonation", "family-emergency", "tech-support", "romance"],
    lives: 3,
    rule: "disguise",
    ruleName: "DISGUISE",
    ruleText:
      "The sender is hidden behind ???. You can INSPECT a sender only twice in this phase, so choose wisely.",
    spot: { scam: 3, safe: 1, unsure: 1 },
    strike: 2,
    duelPersona: "boss-mark",
    duelTurns: 5,
    intro: "I can be anyone you trust. Your boss. Your sister. Your new friend. Who am I today?",
    hitLines: [
      "How did you know it was me?!",
      "My disguise was perfect...",
      "You asked the right question. Annoying.",
    ],
    missLines: [
      "Of course you trusted me. Everyone does.",
      "Don't tell anyone. It's our little secret.",
      "Nobody checks. Nobody ever checks.",
    ],
    defeatLine: "My masks are all broken. Remember: the real ones never ask for secrecy.",
    winLine: "You believed the mask. They always do.",
  },
  {
    id: "dr-greed",
    name: "Dr. Greed",
    title: "Prince of Easy Money",
    blurb: "Every message dangles a juicy reward in front of you.",
    color: "#ffc83d",
    types: ["prize-lottery", "fake-scholarship", "fake-job", "rental-scam", "crypto-investment"],
    lives: 3,
    rule: "temptation",
    ruleName: "TEMPTATION",
    ruleText:
      "A reward tempts you on every message. Reporting a scam deals DOUBLE damage, but trusting one costs you 2 hearts.",
    spot: { scam: 3, safe: 1, unsure: 2 },
    strike: 3,
    duelPersona: "crypto-dan",
    duelTurns: 5,
    intro: "Everyone wants something for nothing. Let me offer you riches. Just a tiny fee first.",
    hitLines: [
      "You did not take the money? Madness!",
      "Greed usually wins. Not today...",
      "Nobody refuses free money!",
    ],
    missLines: [
      "Ahaha! The fee was only a small price for your wallet.",
      "Too good to be true? You wanted it to be true.",
      "Another fortune... for me.",
    ],
    defeatLine: "My gold turns to dust. Real prizes never charge a fee. Remember that.",
    winLine: "Your money is mine. Thank you for your generous donation.",
  },
  {
    id: "zero-day",
    name: "Zero-Day",
    title: "The Final Boss",
    blurb: "Every trick at once. A new curse hits every message.",
    color: "#ff3d6e",
    types: [],
    lives: 3,
    rule: "chaos",
    ruleName: "CHAOS",
    ruleText:
      "A random curse hits each message: a 7-second timer, reversed buttons, blurred text or a hidden sender.",
    spot: { scam: 4, safe: 1, unsure: 1 },
    strike: 3,
    duelPersona: "romance-sophia",
    duelTurns: 6,
    intro: "You beat my lieutenants. But I know every trick there is. Let's see if you do.",
    hitLines: [
      "Hmph. You are better than I thought.",
      "You are learning... faster than most.",
      "Even I cannot fool you every time.",
    ],
    missLines: [
      "Even the best hunters slip.",
      "One mistake is all I need.",
      "Careful... I only need you to be wrong once.",
    ],
    defeatLine: "No... the master of scams, defeated by a student. You are a true Hoax Hunter.",
    winLine: "The scammers always win in the end... unless you stay careful.",
  },
];

export function getBoss(id: string): Boss | undefined {
  return BOSSES.find((b) => b.id === id);
}

export const spotCount = (b: Boss) => b.spot.scam + b.spot.safe + b.spot.unsure;

/** Boss number `i` is open when it is the first, or the one before it was beaten. */
export function isUnlocked(i: number, beaten: string[]): boolean {
  return i === 0 || beaten.includes(BOSSES[i - 1].id);
}

/** The first boss you have not beaten yet (or the last one). */
export function nextBoss(beaten: string[]): Boss {
  return BOSSES.find((b) => !beaten.includes(b.id)) ?? BOSSES[BOSSES.length - 1];
}

const focusParam = (b: Boss) => (b.types.length ? `&focus=${b.types.join(",")}` : "");

/** The API request that builds this boss's phase 1 messages. */
export function spotUrl(b: Boss): string {
  const { scam, safe, unsure } = b.spot;
  return `/api/scenario?count=${spotCount(b)}&mix=${scam},${safe},${unsure}${focusParam(b)}`;
}

/** The API request that builds this boss's phase 2 messages (scams with clues). */
export function strikeUrl(b: Boss): string {
  return `/api/scenario?count=${b.strike}&mix=${b.strike},0,0&clues=1${focusParam(b)}`;
}

/** Hand-written backups, used if the AI is unavailable. */
export function spotFallback(b: Boss): Scenario[] {
  return buildRound([], b.spot, { focus: b.types }).scenarios;
}
export function strikeFallback(b: Boss): Scenario[] {
  return buildRound([], { scam: b.strike, safe: 0, unsure: 0 }, { focus: b.types, needClues: true })
    .scenarios;
}

export const pick = <T,>(lines: T[]): T => lines[Math.floor(Math.random() * lines.length)];
