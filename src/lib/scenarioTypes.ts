// The shape of one game round. The hand-written scenarios and the
// AI-generated ones both use this, so the game modes do not care which is which.

import type { RedFlagId, ScamTypeId } from "@/lib/scamTypes";

export type Channel = "sms" | "whatsapp" | "email" | "dm";

// The 3 kinds of message in the game, matching the 3 answers:
//   scam   -> best answer is REPORT
//   safe   -> best answer is TRUST
//   unsure -> could be real or fake, best answer is VERIFY
export type Kind = "scam" | "safe" | "unsure";

// A phrase inside a message that shows a red flag (used by Detective mode).
// `phrase` is copied exactly from the message text.
export type Clue = { phrase: string; flag: RedFlagId };

export type Scenario = {
  id: string;
  channel: Channel;
  sender: string; // name or number shown on the phone
  subject?: string; // emails only
  text: string;
  kind: Kind;
  scamType: ScamTypeId | "legit" | "unclear";
  redFlags: RedFlagId[]; // warning signs (empty for safe messages)
  explanation: string; // shown after the player answers
  difficulty: 1 | 2 | 3;
  clues?: Clue[]; // exact phrases that show the red flags (scam messages)
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  sms: "Messages",
  whatsapp: "Chat",
  email: "Mail",
  dm: "Direct Message",
};
