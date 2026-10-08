// Extra content for the Scam Dex: a symbol and 3 protection tips per scam type,
// plus the rules for a card's status.

import type { DexEntry } from "@/lib/gameState";
import type { ScamTypeId } from "@/lib/scamTypes";

export const GLYPH: Record<ScamTypeId, string> = {
  "bank-phishing": "✉",
  "fake-delivery": "▣",
  "prize-lottery": "★",
  "fake-job": "$",
  "tech-support": "⚙",
  romance: "♥",
  "crypto-investment": "₿",
  "boss-impersonation": "♛",
  "otp-theft": "#",
  "fake-scholarship": "✎",
  "family-emergency": "☎",
  "gov-impersonation": "⚖",
  "rental-scam": "⌂",
};

export const PROTECT_TIPS: Record<ScamTypeId, string[]> = {
  "bank-phishing": [
    "Never click a link in a message about your account. Open your bank's app yourself.",
    "Banks never ask for your password or full card number by text or email.",
    "If a message scares you, call the number on the back of your card.",
  ],
  "fake-delivery": [
    "Check parcels only in the courier's official app or the shop's website.",
    "Real couriers do not ask for a small fee through a link.",
    "If you are not expecting a parcel, ignore the message.",
  ],
  "prize-lottery": [
    "You cannot win a contest you never entered.",
    "Real prizes never ask you to pay a fee first.",
    "Gift cards and wire transfers are almost impossible to get back.",
  ],
  "fake-job": [
    "Real employers never ask you to pay to get hired.",
    "Very high pay for easy work is a warning sign.",
    "Look the company up on its official website before you reply.",
  ],
  "tech-support": [
    "Companies do not detect viruses on your computer and message you out of the blue.",
    "Never give a stranger remote access to your device.",
    "Close the pop-up and run a scan with software you trust.",
  ],
  romance: [
    "Be careful with anyone who moves fast and soon asks for money.",
    "Never send gift cards, crypto or transfers to someone you only know online.",
    "Ask a trusted friend for their opinion, and ask for a live video call.",
  ],
  "crypto-investment": [
    "No one can guarantee investment returns.",
    "Be wary of private groups, urgency and 'only a few spots left'.",
    "Try a small withdrawal first. If it is blocked, stop.",
  ],
  "boss-impersonation": [
    "Call your boss on a number you already have before doing anything.",
    "Be suspicious of secret, urgent requests for gift cards.",
    "Read the sender's actual address, not just the name.",
  ],
  "otp-theft": [
    "Never read out a one-time code. It is only for you.",
    "A real bank will never ask you to share it.",
    "Hang up and call the bank yourself.",
  ],
  "fake-scholarship": [
    "Real scholarships do not charge fees.",
    "You normally apply first. Being 'selected' out of nowhere is suspicious.",
    "Never send a copy of your ID to an unverified address.",
  ],
  "family-emergency": [
    "Call the person on their old number before you send anything.",
    "Ask a question only the real person could answer.",
    "Be extra careful when you are told to keep it secret.",
  ],
  "gov-impersonation": [
    "Governments do not demand payment by gift card or by a link in a text.",
    "Check any notice on the official government website.",
    "Do not call the number given in the message.",
  ],
  "rental-scam": [
    "Never pay a deposit before you have seen the place in person.",
    "A price far below the market is a warning sign.",
    "Use trusted listing sites and meet the landlord.",
  ],
};

export type DexStatus = "locked" | "spotted" | "mastered";

export const EMPTY_ENTRY: DexEntry = { caught: 0, fell: 0, helper: 0 };

/** Locked until you meet it. Mastered after catching it 3 times with 70% or better. */
export function statusOf(e: DexEntry): DexStatus {
  const total = e.caught + e.fell + e.helper;
  if (total === 0) return "locked";
  const games = e.caught + e.fell;
  if (e.caught >= 3 && games > 0 && e.caught / games >= 0.7) return "mastered";
  return "spotted";
}

/** The scam types you fall for most, worst first. */
export function weakSpots(dex: Record<string, DexEntry>, max = 3): { id: string; entry: DexEntry }[] {
  return Object.entries(dex)
    .filter(([, e]) => e.fell > 0)
    .sort(([, a], [, b]) => b.fell - b.caught * 0.5 - (a.fell - a.caught * 0.5))
    .slice(0, max)
    .map(([id, entry]) => ({ id, entry }));
}
