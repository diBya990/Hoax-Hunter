// Keeps each player's game state in the browser (localStorage) and lets any
// component read it with the useGame() hook. All game modes share this state.
//
// Progress belongs to the ACCOUNT: every logged-in user has their own slot, so
// two people using the same browser never see each other's XP, Scam Dex, bosses
// or stats. The current user comes from the server (see GameUserSync).

import { useSyncExternalStore } from "react";
import {
  DEFAULT_STATE,
  applyAnswer,
  sanitize,
  withBossBeaten,
  withDexRecord,
  type AnswerResult,
  type DexOutcome,
  type GameState,
} from "@/lib/gameState";

const STORAGE_PREFIX = "hh-game-v2:"; // followed by the user's id

let userId: string | null = null; // who is logged in (null = nobody)
let userKnown = false; // have we read the user from the page yet?
let state: GameState = DEFAULT_STATE;
let loadedFor: string | null | undefined = undefined; // whose progress `state` holds
const listeners = new Set<() => void>();

function load(id: string | null): GameState {
  if (!id) return DEFAULT_STATE;
  try {
    const text = localStorage.getItem(STORAGE_PREFIX + id);
    return text ? sanitize(JSON.parse(text)) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function save() {
  if (!userId) return; // nobody is logged in: nothing to save
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(state));
  } catch {
    // storage blocked: the game still works, progress just won't be saved
  }
}

/** Makes sure `state` holds the progress of the user who is logged in now. */
function ensureLoaded() {
  if (!userKnown && typeof document !== "undefined") {
    // the server writes the user's id onto <body data-user-id="...">
    userId = document.body.dataset.userId || null;
    userKnown = true;
  }
  if (loadedFor !== userId) {
    state = load(userId);
    loadedFor = userId;
  }
}

/** Called when the logged-in user changes (for example right after logging in). */
export function setGameUser(id: string | null) {
  userKnown = true;
  if (id === userId) return;
  userId = id;
  listeners.forEach((l) => l());
}

function set(next: GameState) {
  ensureLoaded();
  state = next;
  save();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// useSyncExternalStore needs the same object back until something changes.
function getSnapshot(): GameState {
  ensureLoaded();
  return state;
}

function getServerSnapshot(): GameState {
  return DEFAULT_STATE;
}

export function useGame() {
  const game = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    game,
    /** Report one answered question / round. */
    answer: (r: AnswerResult) => set(applyAnswer(getSnapshot(), r)),
    /** Write an encounter with a scam type into the Scam Dex. */
    recordDex: (typeId: string, outcome: DexOutcome) =>
      set(withDexRecord(getSnapshot(), typeId, outcome)),
    /** Mark a boss as defeated (unlocks the next one). */
    beatBoss: (bossId: string) => set(withBossBeaten(getSnapshot(), bossId)),
    reset: () => set(DEFAULT_STATE),
  };
}
