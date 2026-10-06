// 3D hero art for the title screen, built from plain CSS 3D (no image files).
// A phone receiving a scam SMS, a shield floating in front of it, spinning
// rings behind it, and "red flag" chips orbiting around.

const edgeLayers = Array.from({ length: 10 }, (_, i) => i + 1);

const chips = [
  { text: "FAKE LINK", left: "-6%", top: "14%", z: 130, color: "#ff3d6e", delay: "0s" },
  { text: "URGENCY!", left: "78%", top: "6%", z: 90, color: "#ffc83d", delay: "-1.2s" },
  { text: "OTP REQUEST", left: "84%", top: "62%", z: 150, color: "#ff3df0", delay: "-2.4s" },
  { text: "BAD SENDER", left: "-10%", top: "72%", z: 70, color: "#22e4ff", delay: "-3.3s" },
];

export default function Hero3D() {
  return (
    <div className="hero-scene" aria-hidden>
      <div className="hero-stage">
        {/* spinning rings behind the phone */}
        <div className="hero-ring hero-ring-a" />
        <div className="hero-ring hero-ring-b" />

        {/* phone body: stacked layers give it thickness */}
        {edgeLayers.map((i) => (
          <div
            key={i}
            className="phone-layer phone-edge"
            style={{ transform: `translateZ(${-i * 2}px)` }}
          />
        ))}

        {/* phone front face */}
        <div className="phone-layer phone-front">
          <div className="phone-scan" />
          <div className="flex items-center justify-between px-5 pt-4 font-mono text-[9px] text-muted">
            <span>9:41</span>
            <span>5G ▮▮▮</span>
          </div>
          <div className="mx-auto mt-1 h-1.5 w-16 rounded-full bg-black/60" />

          <div className="px-4 pt-5">
            <p className="font-mono text-[9px] text-muted">+1 (555) 014-2290</p>
            <div className="mt-2 rounded-2xl rounded-tl-sm border border-danger/40 bg-danger/10 p-3 text-[11px] leading-snug text-foreground">
              <span className="font-bold text-danger">URGENT:</span> Your bank
              account will be <u>blocked</u> in 1 hour. Verify now:{" "}
              <span className="text-neon underline">bit.ly/bank-verfy</span>
            </div>
          </div>

          <div className="px-4 pt-5">
            <div className="flex items-center justify-between font-mono text-[9px] tracking-widest">
              <span className="text-muted">RISK SCORE</span>
              <span className="text-danger">94%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50">
              <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-warn to-danger" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 px-4 text-center font-mono text-[9px] font-bold">
            <span className="rounded-md border border-border py-2 text-muted">TRUST</span>
            <span className="rounded-md border border-border py-2 text-warn">VERIFY</span>
            <span className="rounded-md border border-safe bg-safe/15 py-2 text-safe">
              REPORT
            </span>
          </div>
        </div>

        {/* shield in front of the phone */}
        <div className="hero-float" style={{ transform: "translateZ(110px)", left: "52%", top: "46%" }}>
          <div className="hero-bob">
            <svg width="150" height="180" viewBox="0 0 100 120" fill="none">
              <defs>
                <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#5cf0ff" />
                  <stop offset="1" stopColor="#8f7bff" />
                </linearGradient>
              </defs>
              <path
                d="M50 4 92 20v36c0 30-18 51-42 60C26 107 8 86 8 56V20z"
                fill="url(#shieldGrad)"
                fillOpacity="0.35"
                stroke="url(#shieldGrad)"
                strokeWidth="3"
              />
              <path
                d="M50 14 82 26v30c0 23-13 40-32 48-19-8-32-25-32-48V26z"
                fill="#04070d"
                fillOpacity="0.55"
              />
              <path
                d="M33 58l12 12 23-26"
                stroke="#3dffa2"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* red-flag chips */}
        {chips.map((c) => (
          <div
            key={c.text}
            className="hero-float"
            style={{ transform: `translateZ(${c.z}px)`, left: c.left, top: c.top }}
          >
            <div className="hero-bob" style={{ animationDelay: c.delay }}>
              <span
                className="whitespace-nowrap rounded-md border px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest backdrop-blur"
                style={{
                  color: c.color,
                  borderColor: c.color,
                  background: "rgba(4,7,13,0.7)",
                  boxShadow: `0 0 18px ${c.color}66`,
                }}
              >
                ⚑ {c.text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
