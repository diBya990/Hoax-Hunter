// One chat bubble. Links inside the text are highlighted so the player can see them.

// matches things like https://x.com/a, bit.ly/abc, example.co/login
const LINK = /((?:https?:\/\/)?(?:[\w-]+\.)+(?:com|net|org|io|co|ly|xyz|info|me)(?:\/\S*)?)/gi;

function renderText(text: string) {
  return text.split(LINK).map((part, i) =>
    // with a capture group, odd positions are the matched links
    i % 2 === 1 ? (
      <span key={i} className="break-all text-neon underline">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export default function MessageBubble({
  text,
  time,
  from = "them",
}: {
  text: string;
  time?: string;
  from?: "them" | "me";
}) {
  const mine = from === "me";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${
          mine
            ? "rounded-br-sm bg-neon/20 text-foreground"
            : "rounded-bl-sm border border-border bg-surface-2 text-foreground"
        }`}
      >
        <p>{renderText(text)}</p>
        {time && <p className="mt-1 text-right font-mono text-[9px] text-muted">{time}</p>}
      </div>
    </div>
  );
}
