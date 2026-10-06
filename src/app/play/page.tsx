import Link from "next/link";
import MessageBubble from "@/components/MessageBubble";
import PhoneFrame from "@/components/PhoneFrame";
import { SCAM_TYPES } from "@/lib/scamTypes";

const modes = [
  {
    name: "Inbox Defender",
    text: "Trust, Verify or Report each message.",
    status: "PLAY",
    href: "/play/inbox",
  },
  {
    name: "Scammer Chat",
    text: "Out-talk a live AI scammer.",
    status: "PLAY",
    href: "/play/chat",
  },
  { name: "Detective", text: "Tap every red flag before time runs out.", status: "SOON" },
  { name: "Boss Fights", text: "Beat one scam master per level.", status: "SOON" },
];

export default function PlayPage() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
      <div>
        <p className="font-mono text-[11px] tracking-[0.3em] text-muted">GAME MODES</p>
        <h1 className="title-gradient mt-1 text-4xl font-black">Play</h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {modes.map((m) => {
            const card = (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-neon">{m.name}</h2>
                  <span
                    className={`font-mono text-[10px] tracking-widest ${
                      m.href ? "text-safe" : "text-warn"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{m.text}</p>
              </>
            );
            return m.href ? (
              <Link
                key={m.name}
                href={m.href}
                className="rounded-xl border border-neon/60 bg-surface/80 p-4 transition hover:-translate-y-1 hover:border-neon hover:shadow-[0_0_24px_rgba(34,228,255,0.35)]"
              >
                {card}
              </Link>
            ) : (
              <div
                key={m.name}
                className="rounded-xl border border-border bg-surface/60 p-4 opacity-70"
              >
                {card}
              </div>
            );
          })}
        </div>

        <p className="mt-8 font-mono text-[11px] tracking-[0.3em] text-muted">
          {SCAM_TYPES.length} SCAM TYPES IN THE GAME
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SCAM_TYPES.map((t) => (
            <span
              key={t.id}
              className="rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted"
            >
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* phone preview (the real game rounds will appear inside this phone) */}
      <PhoneFrame title="+1 (555) 014-2290" subtitle="Messages">
        <MessageBubble
          text="URGENT: Your bank account will be blocked in 1 hour. Verify now: bit.ly/bank-verfy"
          time="9:38"
        />
        <MessageBubble text="Is this really from my bank?" from="me" time="9:39" />
      </PhoneFrame>
    </div>
  );
}
