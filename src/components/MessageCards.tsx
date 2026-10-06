// Small fake scam-message cards that fill the empty space beside the hub cards.
// Two tidy columns, left and right. Only shown on wide screens.

type Msg = {
  sender: string;
  time: string;
  text: string;
  safe?: boolean;
  delay: string;
};

const left: Msg[] = [
  {
    sender: "Your Bank",
    time: "now",
    text: "Your account is locked! Verify now: bit.ly/bank-verfy",
    delay: "0s",
  },
  {
    sender: "Mobile Carrier",
    time: "2m",
    text: "Your bill is $45, due 25 Oct. Pay in the official carrier app.",
    safe: true,
    delay: "-1.7s",
  },
  {
    sender: "HR Careers",
    time: "5m",
    text: "Work from home, $4,000/mo. Send your ID + $100 training fee.",
    delay: "-3.4s",
  },
];

const right: Msg[] = [
  {
    sender: "Prize Center",
    time: "now",
    text: "You won a laptop! Pay a $50 delivery fee to claim it.",
    delay: "-0.9s",
  },
  {
    sender: "Scholarship Cell",
    time: "3m",
    text: "You are selected! Share your OTP to receive the funds.",
    delay: "-2.6s",
  },
  {
    sender: "University",
    time: "9m",
    text: "Class routine updated. Check it on the student portal.",
    safe: true,
    delay: "-4.2s",
  },
];

function Card({ m }: { m: Msg }) {
  return (
    <div
      className={`msg-card p-3 ${m.safe ? "msg-card-safe" : ""}`}
      style={{ animationDelay: m.delay }}
    >
      <div className="flex items-center justify-between font-mono text-[10px] text-muted">
        <span className="font-bold tracking-wide text-foreground">{m.sender}</span>
        <span>{m.time}</span>
      </div>
      <p className="mt-1.5 text-xs leading-snug text-muted">{m.text}</p>
      <span
        className={`msg-chip ${m.safe ? "msg-chip-safe" : "msg-chip-scam"} mt-2 rounded px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest`}
        style={{
          color: "var(--c)",
          background: "color-mix(in srgb, var(--c) 15%, transparent)",
        }}
      >
        {m.safe ? "✓ SAFE" : "⚑ SCAM"}
      </span>
    </div>
  );
}

export default function MessageCards() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 top-20 z-20 hidden xl:block"
    >
      <div className="absolute bottom-0 left-8 top-0 flex w-60 flex-col justify-center gap-5 2xl:left-16">
        {left.map((m) => (
          <Card key={m.sender} m={m} />
        ))}
      </div>
      <div className="absolute bottom-0 right-8 top-0 flex w-60 flex-col justify-center gap-5 2xl:right-16">
        {right.map((m) => (
          <Card key={m.sender} m={m} />
        ))}
      </div>
    </div>
  );
}
