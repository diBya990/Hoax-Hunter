// Rules for Scammer Chat: message types, the turn limit and the rewards.

import type { AnswerResult } from "@/lib/gameState";
import type { Persona } from "@/lib/personas";
import type { RedFlagId } from "@/lib/scamTypes";

export const MAX_TURNS = 8; // how many messages the player can send

export type ChatMsg = {
  id: number;
  from: "scammer" | "player";
  text: string;
  tactics?: RedFlagId[]; // tricks the scammer used in this message
};

// won      you shut it down (the AI judge decided)
// survived you reached the turn limit without giving in
// blocked  you pressed Block & Report
// lost     you gave in
export type ChatStatus = "won" | "survived" | "blocked" | "lost";

export type ChatReply = {
  status: ChatStatus | "continue";
  message: string; // the scammer's next message (may be empty)
  tactics: RedFlagId[];
  pressure: number; // 0-100
  reason: string; // why the judge decided this (empty while continuing)
  lesson: string; // what to remember (empty while continuing)
};

/** What the shared game state gets when a chat ends. */
export function chatResult(status: ChatStatus, playerTurns: number, persona: Persona): AnswerResult {
  switch (status) {
    case "won":
      // finishing it earlier earns more
      return { correct: true, xp: 60 + 5 * Math.max(0, MAX_TURNS - playerTurns), trust: 10 };
    case "survived":
      return { correct: true, xp: 40, trust: 5 };
    case "blocked":
      return { correct: true, xp: 25, trust: 3 };
    case "lost":
      return { correct: false, xp: 0, wallet: -persona.loss, trust: -20 };
  }
}
