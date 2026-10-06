// Game rules and pure state logic. No React and no storage in here,
// so it is easy to read and easy to test.

export const START_WALLET = 1000;
export const START_TRUST = 70;
export const XP_PER_LEVEL = 200;
export const MAX_COMBO = 5; // streak bonus stops growing after this many in a row

export type GameState = {
  xp: number;
  wallet: number; // money you have not lost to scammers yet
  trust: number; // 0-100, how safe your instincts are
  streak: number; // correct answers in a row
  bestStreak: number;
  answered: number;
  correct: number;
  bosses: string[]; // ids of the bosses you have defeated
};

export const DEFAULT_STATE: GameState = {
  xp: 0,
  wallet: START_WALLET,
  trust: START_TRUST,
  streak: 0,
  bestStreak: 0,
  answered: 0,
  correct: 0,
  bosses: [],
};

/** One answered question or round, reported by any game mode. */
export type AnswerResult = {
  correct: boolean;
  xp: number; // base XP (only awarded when correct, before combo bonus)
  wallet?: number; // + or - money change
  trust?: number; // + or - trust change
};

const RANKS = [
  "Rookie",
  "Spotter",
  "Sleuth",
  "Investigator",
  "Hunter",
  "Master Hunter",
];

export function levelOf(xp: number): number {
  return 1 + Math.floor(xp / XP_PER_LEVEL);
}

export function rankOf(level: number): string {
  return RANKS[Math.min(level - 1, RANKS.length - 1)];
}

/** XP progress inside the current level. */
export function levelProgress(xp: number) {
  return { into: xp % XP_PER_LEVEL, needed: XP_PER_LEVEL };
}

/** x1.0 at streak 0, up to x2.0 at MAX_COMBO. */
export function comboMultiplier(streak: number): number {
  return 1 + Math.min(streak, MAX_COMBO) * 0.2;
}

export function accuracy(s: GameState): number {
  return s.answered === 0 ? 0 : Math.round((s.correct / s.answered) * 100);
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Returns the new state after one answer. Never changes the old state. */
export function applyAnswer(s: GameState, r: AnswerResult): GameState {
  const streak = r.correct ? s.streak + 1 : 0;
  const gainedXp = r.correct ? Math.round(r.xp * comboMultiplier(s.streak)) : 0;

  return {
    xp: s.xp + gainedXp,
    wallet: Math.max(0, s.wallet + (r.wallet ?? 0)),
    trust: clamp(s.trust + (r.trust ?? 0), 0, 100),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    answered: s.answered + 1,
    correct: s.correct + (r.correct ? 1 : 0),
    bosses: s.bosses,
  };
}

/** Returns the new state with this boss marked as defeated. */
export function withBossBeaten(s: GameState, bossId: string): GameState {
  return s.bosses.includes(bossId) ? s : { ...s, bosses: [...s.bosses, bossId] };
}

/** Makes sure data read from storage is safe to use. */
export function sanitize(raw: unknown): GameState {
  if (typeof raw !== "object" || raw === null) return DEFAULT_STATE;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  return {
    xp: Math.max(0, num(o.xp, 0)),
    wallet: Math.max(0, num(o.wallet, START_WALLET)),
    trust: clamp(num(o.trust, START_TRUST), 0, 100),
    streak: Math.max(0, num(o.streak, 0)),
    bestStreak: Math.max(0, num(o.bestStreak, 0)),
    answered: Math.max(0, num(o.answered, 0)),
    correct: Math.max(0, num(o.correct, 0)),
    bosses: Array.isArray(o.bosses)
      ? o.bosses.filter((b): b is string => typeof b === "string").slice(0, 20)
      : [],
  };
}
