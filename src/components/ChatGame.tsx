"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Hud from "@/components/Hud";
import MessageBubble from "@/components/MessageBubble";
import Meter from "@/components/Meter";
import PhoneFrame from "@/components/PhoneFrame";
import {
  MAX_TURNS,
  chatResult,
  type ChatMsg,
  type ChatReply,
  type ChatStatus,
} from "@/lib/chat";
import { applyAnswer, levelOf } from "@/lib/gameState";
import { useGame } from "@/lib/gameStore";
import { PERSONAS, randomOpener, type Persona } from "@/lib/personas";
import { RED_FLAGS, getScamType, type RedFlagId } from "@/lib/scamTypes";
import { CHANNEL_LABEL } from "@/lib/scenarioTypes";
import { playCorrect, playLevelUp, playWrong } from "@/lib/sound";

// This screen is built to fit the window exactly. Only the chat inside the phone scrolls.

type Phase = "pick" | "chat" | "result";

type Ending = {
  status: ChatStatus;
  reason: string;
  lesson: string;
  dXp: number;
  dWallet: number;
  dTrust: number;
  leveledUp: boolean;
  newLevel: number;
};

const ENDING_STYLE: Record<ChatStatus, { title: string; stamp: string; color: string }> = {
  won: { title: "You shut it down!", stamp: "ESCAPED", color: "#3dffa2" },
  survived: { title: "You survived!", stamp: "SURVIVED", color: "#3dffa2" },
  blocked: { title: "Blocked and reported", stamp: "BLOCKED", color: "#ffc83d" },
  lost: { title: "You got scammed!", stamp: "SCAMMED", color: "#ff3d6e" },
};

const FALLBACK_REASON: Record<"blocked", { reason: string; lesson: string }> = {
  blocked: {
    reason: "You blocked and reported the scammer. Ending contact is always a safe move.",
    lesson:
      "Next time, try telling them you will check with the real person or company first. It also teaches you to spot the tricks.",
  },
};

export default function ChatGame() {
  const { game, answer, recordDex } = useGame();
  const [phase, setPhase] = useState<Phase>("pick");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pressure, setPressure] = useState(0);
  const [tactics, setTactics] = useState<RedFlagId[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState<Ending | null>(null);
  const [draft, setDraft] = useState("");
  const [story, setStory] = useState(""); // private backstory the AI scammer keeps consistent

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const playerTurns = messages.filter((m) => m.from === "player").length;

  // keep the newest message in view inside the phone
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, error]);

  // put the cursor back in the box after each scammer reply
  useEffect(() => {
    if (phase === "chat" && !thinking) inputRef.current?.focus();
  }, [phase, thinking, messages.length]);

  // Every chat is a new story: the AI writes a fresh opening message and backstory.
  // If that is slow or fails, a random hand-written opener is used instead.
  async function startChat(p: Persona) {
    setPersona(p);
    setMessages([]);
    setStory("");
    setPressure(15);
    setTactics([]);
    setError(null);
    setEnding(null);
    setDraft("");
    setThinking(true); // shows the "typing" dots while the first message is written
    setPhase("chat");

    let opener = "";
    let backstory = "";
    try {
      const res = await fetch("/api/chat/opener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: p.id }),
        signal: AbortSignal.timeout(8_000),
      });
      const data = (await res.json()) as { opener?: string; story?: string };
      if (res.ok && data.opener) {
        opener = data.opener;
        backstory = data.story ?? "";
      }
    } catch {
      // fall through to the hand-written opener below
    }

    setStory(backstory);
    setMessages([{ id: 0, from: "scammer", text: opener || randomOpener(p) }]);
    setThinking(false);
  }

  function finish(status: ChatStatus, reason: string, lesson: string, turns: number, p: Persona) {
    const result = chatResult(status, turns, p);
    const next = applyAnswer(game, result);
    const leveledUp = levelOf(next.xp) > levelOf(game.xp);

    answer(result);
    recordDex(p.scamType, status === "lost" ? "fell" : "caught");
    if (status === "lost") playWrong();
    else playCorrect();
    if (leveledUp) setTimeout(playLevelUp, 350);

    setEnding({
      status,
      reason,
      lesson,
      dXp: next.xp - game.xp,
      dWallet: next.wallet - game.wallet,
      dTrust: next.trust - game.trust,
      leveledUp,
      newLevel: levelOf(next.xp),
    });
    setPhase("result");
  }

  // Ask the server for the scammer's next message and the judge's verdict.
  async function requestReply(history: ChatMsg[], p: Persona) {
    setThinking(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: p.id,
          story,
          messages: history.map((m) => ({ from: m.from, text: m.text })),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "The scammer lost signal.");
      const reply = data as ChatReply;

      const withReply = reply.message
        ? [
            ...history,
            {
              id: history.length,
              from: "scammer" as const,
              text: reply.message,
              tactics: reply.tactics,
            },
          ]
        : history;
      setMessages(withReply);
      setPressure(reply.pressure);
      setTactics((prev) => [...new Set([...prev, ...reply.tactics])]);
      setThinking(false);

      if (reply.status !== "continue") {
        const turns = history.filter((m) => m.from === "player").length;
        // let the player read the scammer's last message first
        setTimeout(() => finish(reply.status as ChatStatus, reply.reason, reply.lesson, turns, p), 1600);
      }
    } catch (e) {
      setThinking(false);
      setError(e instanceof Error && e.message ? e.message : "The scammer lost signal.");
    }
  }

  function send() {
    const text = draft.trim();
    if (!text || thinking || !persona || phase !== "chat") return;
    const history: ChatMsg[] = [...messages, { id: messages.length, from: "player", text }];
    setMessages(history);
    setDraft("");
    void requestReply(history, persona);
  }

  function block() {
    if (!persona || thinking || phase !== "chat") return;
    finish("blocked", FALLBACK_REASON.blocked.reason, FALLBACK_REASON.blocked.lesson, playerTurns, persona);
  }

  // ---------------- pick an opponent ----------------
  if (phase === "pick") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <Hud className="" />
        <div className="text-center">
          <p className="font-mono text-[11px] tracking-[0.3em] text-muted">GAME MODE 2</p>
          <h1 className="title-gradient text-3xl font-black sm:text-4xl">Scammer Chat</h1>
          <p className="mx-auto mt-1 max-w-xl text-xs text-muted sm:text-sm">
            Pick a scammer and chat for real. You have {MAX_TURNS} messages. Every chat is a new
            story, so the opening message and details change each time. Practice only: never type
            your real passwords, codes or card numbers.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 content-center gap-3 lg:grid-cols-4">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => startChat(p)}
              className="flex flex-col rounded-xl border border-border bg-surface/80 p-3 text-left transition hover:-translate-y-1 hover:border-neon hover:shadow-[0_0_24px_rgba(34,228,255,0.3)] active:scale-[0.98] sm:p-4"
            >
              <div className="flex items-center justify-between font-mono text-[10px] tracking-widest">
                <span className="text-warn">{"●".repeat(p.difficulty) + "○".repeat(3 - p.difficulty)}</span>
                <span className="text-muted">{CHANNEL_LABEL[p.channel].toUpperCase()}</span>
              </div>
              <p className="mt-2 text-sm font-extrabold text-neon sm:text-base">{p.title}</p>
              <p className="text-xs text-foreground">{p.name}</p>
              <p className="mt-1 hidden text-xs text-muted sm:block">{p.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------------- chat + result ----------------
  if (!persona) return null;
  const scamName = getScamType(persona.scamType)?.name ?? "";
  const inResult = phase === "result" && ending;
  const style = ending ? ENDING_STYLE[ending.status] : null;
  const pressureColor = pressure >= 70 ? "#ff3d6e" : pressure >= 40 ? "#ffc83d" : "#22e4ff";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Hud className="" />

      {/* status row: turns, pressure, block */}
      <div className="flex items-center gap-4">
        <span className="shrink-0 font-mono text-[11px] tracking-widest text-muted">
          TURN {Math.min(playerTurns, MAX_TURNS)} / {MAX_TURNS}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between font-mono text-[10px] tracking-widest">
            <span className="text-muted">PRESSURE</span>
            <span style={{ color: pressureColor }}>{pressure}</span>
          </div>
          <div className="mt-1">
            <Meter value={pressure} max={100} color={pressureColor} />
          </div>
        </div>
        {!inResult && (
          <button
            type="button"
            onClick={block}
            disabled={thinking}
            className="shrink-0 rounded-lg border border-warn px-3 py-2 font-mono text-[11px] font-bold text-warn transition hover:bg-warn/15 active:scale-95 disabled:opacity-40"
          >
            BLOCK &amp; REPORT
          </button>
        )}
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[auto_1fr]">
        {/* phone (hidden on small screens once the chat has ended) */}
        <div className={`min-h-0 ${inResult ? "hidden lg:block" : ""}`}>
          <PhoneFrame
            className="h-full max-h-[600px]"
            title={persona.name}
            subtitle={CHANNEL_LABEL[persona.channel]}
            bodyRef={bodyRef}
            overlay={
              inResult && style ? (
                <div
                  className="stamp-pop rounded-xl border-4 px-5 py-2 text-3xl font-black tracking-widest"
                  style={{ color: style.color, borderColor: style.color }}
                >
                  {style.stamp}
                </div>
              ) : undefined
            }
            footer={
              phase === "chat" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                  className="flex gap-2"
                >
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={300}
                    disabled={thinking}
                    placeholder={thinking ? "..." : "Type your reply"}
                    className="field !py-2 text-sm"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={thinking || !draft.trim()}
                    className="shrink-0 rounded-lg border border-neon px-3 font-mono text-xs font-bold text-neon transition hover:bg-neon/15 active:scale-95 disabled:opacity-40"
                  >
                    SEND
                  </button>
                </form>
              ) : undefined
            }
          >
            {messages.map((m) => (
              <div key={m.id} className="slide-in space-y-1.5">
                <MessageBubble text={m.text} from={m.from === "player" ? "me" : "them"} />
                {m.tactics && m.tactics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.tactics.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-danger/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-danger"
                      >
                        ⚑ {RED_FLAGS[t].label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="flex gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-surface-2 px-4 py-3">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-danger/50 bg-danger/10 p-3 text-xs text-danger">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void requestReply(messages, persona)}
                  className="mt-2 rounded border border-danger px-3 py-1 font-mono font-bold hover:bg-danger/15"
                >
                  RETRY
                </button>
              </div>
            )}
          </PhoneFrame>
        </div>

        {/* right panel */}
        <div className="flex min-h-0 min-w-0 flex-col">
          {!inResult && (
            <div className="hidden min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex">
              <div className="rounded-xl border border-border bg-surface/80 p-4">
                <p className="font-mono text-[10px] tracking-widest text-muted">YOUR OPPONENT</p>
                <p className="mt-1 text-lg font-extrabold text-neon">{persona.title}</p>
                <p className="text-sm text-muted">
                  {persona.name} · {scamName}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Goal: stay safe. Ask questions, check with the real person or company, and say
                  no. Never share codes, money or personal details.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface/80 p-4">
                <p className="font-mono text-[10px] tracking-widest text-muted">TACTICS SPOTTED</p>
                {tactics.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">
                    The tricks the scammer uses will show up here as the chat goes on.
                  </p>
                ) : (
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {tactics.slice(-6).map((t) => (
                      <li key={t} className="rounded-lg border border-border bg-black/30 px-2.5 py-1.5">
                        <p className="text-xs font-semibold text-danger">⚑ {RED_FLAGS[t].label}</p>
                        <p className="text-[11px] leading-tight text-muted">{RED_FLAGS[t].tip}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {inResult && ending && style && (
            <div
              className="slide-in flex h-full min-h-0 flex-col gap-2.5 overflow-hidden rounded-xl border bg-surface/85 p-4 backdrop-blur"
              style={{ borderColor: style.color }}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-2xl font-extrabold" style={{ color: style.color }}>
                  {style.title}
                </h2>
                <span
                  className="rounded border px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest"
                  style={{ color: style.color, borderColor: style.color }}
                >
                  {persona.title.toUpperCase()}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 font-mono text-xs font-bold">
                {ending.dXp > 0 && (
                  <span className="rounded-md bg-neon/15 px-3 py-1 text-neon">
                    +{ending.dXp} XP
                  </span>
                )}
                {ending.dWallet < 0 && (
                  <span className="rounded-md bg-danger/15 px-3 py-1 text-danger">
                    -${Math.abs(ending.dWallet)} stolen
                  </span>
                )}
                {ending.dTrust !== 0 && (
                  <span
                    className="rounded-md px-3 py-1"
                    style={{
                      color: ending.dTrust > 0 ? "#3dffa2" : "#ff3d6e",
                      background:
                        ending.dTrust > 0 ? "rgba(61,255,162,.15)" : "rgba(255,61,110,.15)",
                    }}
                  >
                    {ending.dTrust > 0 ? "+" : ""}
                    {ending.dTrust} trust
                  </span>
                )}
                {ending.leveledUp && (
                  <span className="rounded-md border border-neon bg-neon/10 px-3 py-1 text-neon">
                    LEVEL UP! Level {ending.newLevel}
                  </span>
                )}
              </div>

              <div>
                <p className="font-mono text-[10px] tracking-widest text-muted">WHAT HAPPENED</p>
                <p className="text-[13px] leading-snug text-foreground">{ending.reason}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-widest text-muted">REMEMBER THIS</p>
                <p className="text-[13px] leading-snug text-foreground">{ending.lesson}</p>
              </div>

              {tactics.length > 0 && (
                <div className="min-h-0">
                  <p className="font-mono text-[10px] tracking-widest text-muted">
                    TACTICS THEY USED
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {tactics.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-danger/15 px-2 py-1 font-mono text-[10px] font-bold text-danger"
                      >
                        ⚑ {RED_FLAGS[t].label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPhase("pick")}
                  className="start-btn !px-6 !py-2.5 !text-sm"
                >
                  CHOOSE ANOTHER
                </button>
                <Link
                  href="/play"
                  className="rounded-xl border border-border px-5 py-2.5 font-mono text-sm font-bold text-muted transition hover:border-neon hover:text-neon"
                >
                  BACK TO PLAY
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
