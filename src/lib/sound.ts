// Tiny sound engine. All sounds are synthesized with the Web Audio API,
// so there are no audio files to download or host.

const MUTE_KEY = "hh-muted";

let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// ---- mute state (works with useSyncExternalStore) ----

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(value: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // storage blocked: mute just won't persist
  }
  listeners.forEach((l) => l());
}

export function subscribeMuted(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ---- building blocks ----

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  endFreq?: number
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Filtered white noise that sweeps in pitch: a "whoosh". */
function whoosh(
  c: AudioContext,
  start: number,
  duration: number,
  fromHz: number,
  toHz: number,
  volume: number
) {
  const length = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(fromHz, start);
  filter.frequency.exponentialRampToValueAtTime(toHz, start + duration);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(start);
}

// ---- sounds ----

/** Punchy arcade "menu select": low thud + two-note bleep. */
export function playClick() {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(c, 260, t, 0.09, "sine", 0.18, 90); // thud
  tone(c, 784, t, 0.05, "square", 0.07); // G5
  tone(c, 1175, t + 0.05, 0.1, "square", 0.07); // D6
  tone(c, 2349, t + 0.05, 0.06, "triangle", 0.03); // sparkle
}

/** Big power-up for the START button: whoosh, rising sweep, chord, sparkle. */
export function playStart() {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;

  whoosh(c, t, 0.9, 300, 6000, 0.35);
  tone(c, 90, t, 0.8, "sawtooth", 0.07, 700); // rising engine sweep

  // fast arpeggio C5 E5 G5 C6 E6
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
    tone(c, f, t + 0.05 + i * 0.075, 0.2, "square", 0.06);
  });

  // final power chord
  [261.63, 392, 523.25, 783.99].forEach((f) => {
    tone(c, f, t + 0.45, 0.6, "sawtooth", 0.05);
  });
  tone(c, 1568, t + 0.45, 0.5, "triangle", 0.05, 3136); // sparkle
  tone(c, 65.4, t + 0.45, 0.5, "sine", 0.2, 40); // sub boom
}
