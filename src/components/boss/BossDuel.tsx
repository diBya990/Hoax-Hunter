"use client";

import { useEffect, useRef, useState } from "react";
import MessageBubble from "@/components/MessageBubble";
import Meter from "@/components/Meter";
import PhoneFrame from "@/components/PhoneFrame";
import { W_DUEL, type Boss } from "@/lib/bosses";
import type { ChatMsg, ChatReply, ChatStatus } from "@/lib/chat";
import { useGame } from "@/lib/gameStore";
import { randomOpener, type Persona } from "@/lib/personas";
import { RED_FLAGS, type RedFlagId } from "@/lib/scamTypes";
import { CHANNEL_LABEL } from "@/lib/scenarioTypes";

// BOSS PHASE 3: THE DUEL. The boss is disguised as a scammer and chats with you
// live. Refuse it, or say you will verify, to land the final blow.
// Giving in means defeat. Sound and rewards are handled by the boss screen.

type Props = {
  boss: Boss;
  persona: Persona;
  maxTurns: number;
  onDamage: (points: number) => void;
  onWon: () => void;
  onLost: () => void;
};

type Verdict = { status: ChatStatus; reason: string; lesson: string };

export default function BossDuel({ boss, persona, maxTurns, onDamage, onWon, onLost }: Props) {
  const { recordDex } = useGame();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pressure, setPressure] = useState(15);
  const [tactics, setTactics] = useState<RedFlagId[]>([]);
  const [thinking, setThinking] = useState(true); // starts true: the first message is being written
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [story, setStory] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const playerTurns = messages.filter((m) => m.from === "player").length;

  // the boss's first message: written fresh by the AI, with a hand-written backup
  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat/opener", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId: persona.id }),
      signal: AbortSignal.timeout(8_000),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        const d = data as { opener?: string; story?: string };
        setStory(ok && d.opener ? (d.story ?? "") : "");
        setMessages([{ id: 0, from: "scammer", text: ok && d.opener ? d.opener : randomOpener(persona) }]);
        setThinking(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([{ id: 0, from: "scammer", text: randomOpener(persona) }]);
        setThinking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [persona]);

  // keep the newest message in view inside the phone
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, error]);

  // put the cursor back in the box after each reply
  useEffect(() => {
    if (!thinking && !verdict) inputRef.current?.focus();
  }, [thinking, verdict, messages.length]);

  async function requestReply(history: ChatMsg[]) {
    setThinking(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id,
          story,
          maxTurns,
          messages: history.map((m) => ({ from: m.from, text: m.text })),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "The boss lost signal.");
      const reply = data as ChatReply;

      setMessages(
        reply.message
          ? [
              ...history,
              {
                id: history.length,
                from: "scammer" as const,
                text: reply.message,
                tactics: reply.tactics,
              },
            ]
          : history
      );
      setPressure(reply.pressure);
      setTactics((prev) => [...new Set([...prev, ...reply.tactics])]);
      setThinking(false);

      if (reply.status === "continue") {
        // every message you survive chips away at the boss
        onDamage(W_DUEL / maxTurns);
      } else {
        // let the player read the boss's last message, then show the verdict
        setTimeout(
          () =>
            setVerdict({
              status: reply.status as ChatStatus,
              reason: reply.reason,
              lesson: reply.lesson,
            }),
          1500
        );
      }
    } catch (e) {
      setThinking(false);
      setError(e instanceof Error && e.message ? e.message : "The boss lost signal.");
    }
  }

  function send() {
    const text = draft.trim();
    if (!text || thinking || verdict) return;
    const history: ChatMsg[] = [...messages, { id: messages.length, from: "player", text }];
    setMessages(history);
    setDraft("");
    void requestReply(history);
  }

  const lost = verdict?.status === "lost";
  const pressureColor = pressure >= 70 ? "#ff3d6e" : pressure >= 40 ? "#ffc83d" : "#22e4ff";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="shrink-0 font-mono text-[11px] tracking-widest text-muted">
          PHASE 3 · THE DUEL · MESSAGE {Math.min(playerTurns, maxTurns)} / {maxTurns}
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
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[auto_1fr]">
        {/* phone (hidden on small screens once there is a verdict) */}
        <div className={`min-h-0 ${verdict ? "hidden lg:block" : ""}`}>
          <PhoneFrame
            className="h-full max-h-[560px]"
            title={persona.name}
            subtitle={CHANNEL_LABEL[persona.channel]}
            bodyRef={bodyRef}
            footer={
              !verdict ? (
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
                  onClick={() => void requestReply(messages)}
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
          {!verdict && (
            <div className="hidden min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex">
              <div
                className="rounded-xl border bg-black/30 p-4"
                style={{ borderColor: `${boss.color}88` }}
              >
                <p className="font-mono text-[10px] tracking-widest" style={{ color: boss.color }}>
                  THE FINAL DUEL
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {boss.name} is hiding behind <span className="font-bold">{persona.name}</span>.
                  Refuse, ask for proof, or say you will check with the real person to land the
                  final blow. Give in and you lose the fight.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface/80 p-4">
                <p className="font-mono text-[10px] tracking-widest text-muted">TACTICS SPOTTED</p>
                {tactics.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">
                    The tricks the boss uses will show up here as the chat goes on.
                  </p>
                ) : (
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {tactics.slice(-6).map((t) => (
                      <li
                        key={t}
                        className="rounded-lg border border-border bg-black/30 px-2.5 py-1.5"
                      >
                        <p className="text-xs font-semibold text-danger">⚑ {RED_FLAGS[t].label}</p>
                        <p className="text-[11px] leading-tight text-muted">{RED_FLAGS[t].tip}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {verdict && (
            <div
              className="slide-in flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-xl border bg-surface/85 p-4 backdrop-blur"
              style={{ borderColor: lost ? "#ff3d6e" : "#3dffa2" }}
            >
              <h2 className="text-2xl font-extrabold" style={{ color: lost ? "#ff3d6e" : "#3dffa2" }}>
                {lost ? "You gave in!" : verdict.status === "survived" ? "You held firm!" : "FINAL BLOW!"}
              </h2>
              <div>
                <p className="font-mono text-[10px] tracking-widest text-muted">WHAT HAPPENED</p>
                <p className="text-[13px] leading-snug text-foreground">{verdict.reason}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-widest text-muted">REMEMBER THIS</p>
                <p className="text-[13px] leading-snug text-foreground">{verdict.lesson}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  recordDex(persona.scamType, lost ? "fell" : "caught");
                  if (lost) onLost();
                  else onWon();
                }}
                className="start-btn mt-auto !px-8 !py-2.5 !text-base"
              >
                {lost ? "FACE DEFEAT" : "DELIVER THE FINAL BLOW →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
