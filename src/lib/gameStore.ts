// Keeps the game state in the browser (localStorage) and lets any component
// read it with the useGame() hook. All game modes share this one state.

import { useSyncExternalStore } from "react";
import {
  DEFAULT_STATE,
  applyAnswer,
  sanitize,
  withBossBeaten,
  type AnswerResult,
  type GameState,
} from "@/lib/gameState";

const STORAGE_KEY = "hh-game-v1";

let state: GameState = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load(): GameState {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? sanitize(JSON.parse(text)) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage blocked: the game still works, progress just won't be saved
  }
}

function set(next: GameState) {
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
  if (!loaded) {
    loaded = true;
    state = load();
  }
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
    /** Mark a boss as defeated (unlocks the next one). */
    beatBoss: (bossId: string) => set(withBossBeaten(getSnapshot(), bossId)),
    reset: () => set(DEFAULT_STATE),
  };
}
