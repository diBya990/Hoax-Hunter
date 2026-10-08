// The RULE ENGINE of the Scam Helper: plain code, no AI, no network.
//
// It reads a message and looks for the classic signs of a scam: pressure,
// threats, requests for codes or money, tempting rewards, secrecy and
// suspicious links. Each sign adds points. Signs of a normal message (such as
// "never share this code") take points away. The total becomes a 0-100 score.
//
// The AI then double-checks this result (see aiHelper.ts) and the two scores
// are blended. Rules are fast and explainable, but they can be fooled, which
// is why the AI is there too.

import type { RedFlagId } from "@/lib/scamTypes";

export type Signal = {
  id: string;
  label: string; // shown to the user
  flag: RedFlagId; // which red flag it belongs to
  points: number; // positive = more suspicious, negative = reassuring
  evidence: string[]; // the exact words or links that triggered it
};

export type RuleResult = {
  score: number; // 0-100
  signals: Signal[];
  urls: string[];
};

// ---------- links ----------

const TLDS =
  "com|net|org|io|co|ly|xyz|info|me|top|click|link|site|online|support|live|app|biz|us|uk|ru|cn|tk|ml|ga|cf|gq|icu|vip|shop|store|work|cc|ws|pw";
const URL_RE = new RegExp(
  `(?:https?:\\/\\/)?(?:[a-z0-9-]+\\.)+(?:${TLDS})(?:\\/[^\\s]*)?`,
  "gi"
);

const SHORTENERS = /^(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|cutt\.ly|rb\.gy|shorturl\.at|tiny\.cc)$/i;
const RISKY_TLDS = new Set(["xyz", "top", "click", "icu", "tk", "ml", "ga", "cf", "gq", "vip", "link", "pw", "cc", "ws"]);
const TRUST_WORDS =
  /(secure|verify|verification|login|signin|account|update|bank|billing|pay|support|confirm|refund|appeal|claim|portal|wallet|unlock|alert)/i;

/** Finds the web addresses in a message (email addresses are ignored). */
export function extractUrls(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    if (text[start - 1] === "@") continue; // the domain of an email address
    const url = m[0].replace(/[.,;:!?)\]]+$/, "");
    if (!found.includes(url)) found.push(url);
  }
  return found;
}

/** Points for one link, and the reasons. */
function scoreUrl(url: string): { points: number; reasons: string[] } {
  const reasons: string[] = [];
  let points = 0;
  const hasScheme = /^https?:\/\//i.test(url);
  const host = url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0].toLowerCase();
  const tld = host.split(".").pop() ?? "";

  if (SHORTENERS.test(host)) {
    points += 20;
    reasons.push("shortened link");
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    points += 20;
    reasons.push("raw IP address");
  }
  if (RISKY_TLDS.has(tld)) {
    points += 15;
    reasons.push(`.${tld} ending`);
  }
  if (TRUST_WORDS.test(host.split(".").slice(0, -1).join("."))) {
    points += 15;
    reasons.push("lookalike words in the address");
  }
  if ((host.match(/-/g) ?? []).length >= 2) {
    points += 8;
    reasons.push("many hyphens");
  }
  if (host.includes("xn--") || url.includes("@")) {
    points += 15;
    reasons.push("disguised address");
  }
  if (host.split(".").length >= 5) {
    points += 8;
    reasons.push("very long address");
  }
  if (/^http:\/\//i.test(url) && hasScheme) {
    points += 5;
    reasons.push("not encrypted (http)");
  }
  return { points: Math.min(points, 35), reasons };
}

// ---------- wording ----------

type Pattern = {
  id: string;
  label: string;
  flag: RedFlagId;
  points: number;
  re: RegExp; // must have the g flag
  useStripped?: boolean; // ignore sentences that warn "never share ..."
};

const PATTERNS: Pattern[] = [
  {
    id: "urgency",
    label: "Pressure to act fast",
    flag: "urgency",
    points: 12,
    re: /\b(urgent(ly)?|immediately|right now|asap|within \d+ ?(hours?|hrs?|minutes?|mins?|days?)|expires? (today|tonight|soon)|last chance|final notice|act now|today only|before (it'?s|its) too late|limited (time|spots?)|spots? (close|run out)|don'?t delay|as soon as possible)\b/gi,
  },
  {
    id: "threat",
    label: "Threat or scary news",
    flag: "fear",
    points: 12,
    re: /\b(suspended|blocked|locked|frozen|disabled|deactivated|terminated|will be (deleted|closed|cancelled|canceled)|legal action|arrest(ed)?|penalt(y|ies)|fine of|unauthori[sz]ed|compromised|virus(es)?|infected|hacked)\b/gi,
  },
  {
    id: "code-request",
    label: "Asks for a code or password",
    flag: "otp",
    points: 26,
    useStripped: true,
    re: /\b(share|send|read|tell|reply with|provide|give|forward|confirm|enter|type|read out)\b[^.!?\n]{0,50}\b(otp|one[- ]time (code|password|passcode)|verification code|security code|passcode|password|pin)\b|\b(reply with|read|send|share|tell|give|provide|forward)\b[^.!?\n]{0,25}\b(the|your|that|this) codes?\b|\b(otp|code|password|pin|passcode)\b[^.!?\n]{0,30}\b(to (us|our agent|the agent|me)|back to)\b|\bread (it )?out\b/gi,
  },
  {
    id: "personal-info",
    label: "Asks for personal or bank details",
    flag: "personal-info",
    points: 18,
    useStripped: true,
    re: /\b(copy of your (id|passport)|your (id|passport|ssn|social security( number)?)|card number|cvv|bank details|account number|routing number|date of birth|home address|full name and address)\b/gi,
  },
  {
    id: "odd-payment",
    label: "Wants gift cards, crypto or a wire",
    flag: "odd-payment",
    points: 24,
    re: /\b(gift ?cards?|itunes|steam cards?|bitcoin|btc|crypto(currency)?|wire transfer|wire (me|the|a)|western union|money ?gram|cash ?app|zelle)\b/gi,
  },
  {
    id: "fee",
    label: "Asks you to pay a fee first",
    flag: "odd-payment",
    points: 18,
    re: /\b(processing|delivery|redelivery|admin(istrative)?|registration|training|starter|clearance|customs|release|handling|document|unlock|setup|equipment)\s+(fee|charge|deposit)\b|\bstarter[- ]kit\b/gi,
  },
  {
    id: "money-request",
    label: "Asks you to send money",
    flag: "odd-payment",
    points: 12,
    re: /\b(pay|send|transfer|deposit|wire)\b[^.!?\n]{0,60}(\$|usd|eur|gbp|£|€)\s?\d/gi,
  },
  {
    id: "deposit-first",
    label: "Deposit before you have seen it",
    flag: "odd-payment",
    points: 16,
    re: /\b(deposit|wire|payment)\b[^.!?\n]{0,60}\bbefore (you )?(view|viewing|see|seeing|visit|visiting)\b/gi,
  },
  {
    id: "reward",
    label: "Tempting reward or prize",
    flag: "greed",
    points: 14,
    re: /\b(congratulations|you(?:'ve| have)? (?:won|been selected|been chosen)|winner|prize|lottery|jackpot|reward|inheritance|tax refund|refund of|free (gift|iphone|laptop|phone|console)|selected (for|to receive))\b/gi,
  },
  {
    id: "too-good",
    label: "Too good to be true",
    flag: "too-good",
    points: 16,
    re: /\b(guaranteed|risk[- ]free|no experience( needed| required)?|earn \$?\d[\d,]*\s*(per|a|\/)\s*(day|hour|week)|\d{2,3}% (returns?|profit|in \d+ days)|double your|passive income)\b/gi,
  },
  {
    id: "secrecy",
    label: "Asks you to keep it secret",
    flag: "secrecy",
    points: 16,
    re: /\b(don'?t|do not|please don'?t)\s+tell\s+(anyone|anybody|dad|mom|mum|your \w+|the others)\b|\bkeep (this|it) (a )?(secret|between us|confidential|quiet)\b|\bour (little )?secret\b/gi,
  },
  {
    id: "emotional",
    label: "Plays on your feelings",
    flag: "emotional",
    points: 12,
    re: /\b(i feel such a connection|my dear|stranded|please help me|so lonely|trust me|i love you|embarrassed|emergency)\b/gi,
  },
  {
    id: "surprise-charge",
    label: "Surprise charge you did not make",
    flag: "fear",
    points: 12,
    re: /\b(if you (did not|didn'?t) (make|authori[sz]e|recogni[sz]e)[^.!?\n]{0,30}|charge of \$\d[\d,.]*|unrecogni[sz]ed (charge|transaction|purchase)|unpaid (toll|invoice|fine|bill))\b/gi,
  },
  {
    id: "curiosity-bait",
    label: "Curiosity bait",
    flag: "emotional",
    points: 12,
    re: /\b(is (this|that) you (in|on)|you won'?t believe|watch this|check (this|it) out|look what i found|so embarrassing)\b/gi,
  },
  {
    id: "new-number",
    label: "Claims to be someone on a new number",
    flag: "bad-sender",
    points: 12,
    re: /\b(new number|lost my phone|phone (broke|is broken|died)|dropped my phone|my phone broke)\b/gi,
  },
  {
    id: "call-number",
    label: "Pushes you to call a phone number",
    flag: "urgency",
    points: 10,
    re: /\b(call|dial|contact)\b[^.!?\n]{0,25}(\+?\d[\d\s().-]{7,}\d)/gi,
  },
  {
    id: "remote-access",
    label: "Wants remote access to your device",
    flag: "authority",
    points: 18,
    re: /\b(remote access|anydesk|teamviewer|install (this|the) (app|software|program))\b/gi,
  },
  {
    id: "authority",
    label: "Speaks for a bank, government or boss",
    flag: "authority",
    points: 6,
    re: /\b(your bank|fraud (team|department)|tax office|revenue|customs|police|security team|support team|the ceo|hr department|payroll)\b/gi,
  },
  {
    id: "generic-greeting",
    label: "Generic greeting",
    flag: "bad-sender",
    points: 6,
    re: /\bdear (customer|user|client|sir|madam|valued|account holder|student)\b/gi,
  },
];

// reassuring signs (they take points away)
const REASSURING: { id: string; label: string; points: number; re: RegExp }[] = [
  {
    id: "warns-not-to-share",
    label: "Warns you never to share codes",
    points: -14,
    re: /\b(do not|don'?t|never)\b[^.!?\n]{0,30}\b(share|give|tell|disclose)\b[^.!?\n]{0,30}\b(code|codes|password|pin|otp|passcode)\b|\bwe (will )?never ask\b/gi,
  },
  {
    id: "no-action",
    label: "Says no action is needed",
    points: -10,
    re: /\bno action (is )?(needed|required|necessary)\b/gi,
  },
  {
    id: "official-channels",
    label: "Points you to official channels",
    points: -8,
    re: /\b(official (app|website|site)|in (the|your) (app|account|settings)|at the front desk|call the (clinic|office|branch)|contact support from the official)\b/gi,
  },
];

// Sentences like "Do not share this code" are advice, not requests, so they are
// removed before looking for requests for codes or personal details.
function stripWarnings(text: string): string {
  return text.replace(
    /[^.!?\n]*\b(do not|don'?t|never)\b[^.!?\n]*\b(share|give|tell|send|disclose|ask)\b[^.!?\n]*[.!?]?/gi,
    " "
  );
}

function unique(items: string[], max = 3): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))].slice(0, max);
}

/** Runs every rule over a message. */
export function runRules(text: string): RuleResult {
  const signals: Signal[] = [];
  const stripped = stripWarnings(text);
  const urls = extractUrls(text);

  for (const p of PATTERNS) {
    const source = p.useStripped ? stripped : text;
    const hits = [...source.matchAll(p.re)].map((m) => m[0]);
    if (hits.length) {
      signals.push({ id: p.id, label: p.label, flag: p.flag, points: p.points, evidence: unique(hits) });
    }
  }

  // links
  let linkPoints = 0;
  const linkEvidence: string[] = [];
  for (const url of urls) {
    const { points, reasons } = scoreUrl(url);
    if (points > 0) {
      linkPoints += points;
      linkEvidence.push(`${url} (${reasons.join(", ")})`);
    }
  }
  if (linkPoints > 0) {
    signals.push({
      id: "suspicious-link",
      label: "Suspicious link",
      flag: "bad-link",
      points: Math.min(linkPoints, 40),
      evidence: unique(linkEvidence, 2),
    });
  }

  // shouting
  const exclaims = (text.match(/!/g) ?? []).length;
  const shouted = (text.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  if (exclaims >= 3 || shouted >= 3) {
    signals.push({
      id: "shouting",
      label: "Shouting and pressure formatting",
      flag: "urgency",
      points: 6,
      evidence: [exclaims >= 3 ? `${exclaims} exclamation marks` : `${shouted} words in capitals`],
    });
  }

  // reassuring signs
  for (const r of REASSURING) {
    // pointing to "official channels" does not count when the message also has links
    if (r.id === "official-channels" && urls.length > 0) continue;
    const hits = [...text.matchAll(r.re)].map((m) => m[0]);
    if (hits.length) {
      signals.push({ id: r.id, label: r.label, flag: "authority", points: r.points, evidence: unique(hits, 1) });
    }
  }

  const sum = Math.max(0, signals.reduce((total, s) => total + s.points, 0));
  // diminishing returns: a few strong signs already mean a high score
  const score = Math.round(100 * (1 - Math.exp(-sum / 55)));

  signals.sort((a, b) => b.points - a.points);
  return { score, signals, urls };
}

// ---------- levels and blending ----------

export type Level = "low" | "suspicious" | "dangerous";

export function levelOf(score: number): Level {
  return score >= 60 ? "dangerous" : score >= 30 ? "suspicious" : "low";
}

export const RULE_WEIGHT = 0.4;
export const AI_WEIGHT = 0.6;

/**
 * The final score: rules and AI, blended. If the AI is unavailable, rules alone.
 *
 * One safety rule on top of the blend: if EITHER half is alarmed (the AI says
 * "suspicious" or worse, or the rules find a lot), the result is never shown as
 * low risk. Without this, a scam with no obvious keywords (no link, no money
 * request) could be pulled down to "low" by the rule engine's zero.
 */
export function blend(ruleScore: number, aiScore: number | null): number {
  if (aiScore === null) return ruleScore;
  const mixed = Math.round(RULE_WEIGHT * ruleScore + AI_WEIGHT * aiScore);
  const alarmed = aiScore >= 30 || ruleScore >= 60;
  return alarmed ? Math.max(mixed, 30) : mixed;
}
