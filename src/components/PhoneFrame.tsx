import type { ReactNode } from "react";

// A flat cyber-noir phone used by the game modes. Put message bubbles inside.
export default function PhoneFrame({
  title,
  subtitle,
  children,
  footer,
  overlay,
  className = "h-[560px]",
  footerClassName = "",
}: {
  footerClassName?: string; // e.g. "lg:hidden" to hide the footer on wide screens
  className?: string; // sets the height; the default is a fixed 560px
  title: string; // contact name / app name in the header
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode; // e.g. the Trust / Verify / Report buttons
  overlay?: ReactNode; // e.g. a big SCAM / SAFE stamp on top of the messages
}) {
  return (
    <div className={`relative mx-auto flex ${className} w-[300px] max-w-full flex-col overflow-hidden rounded-[2.2rem] border-2 border-neon bg-gradient-to-b from-[#0f1c33] to-[#060b16] shadow-[0_0_50px_rgba(34,228,255,0.3)]`}>
      {/* notch + status bar */}
      <div className="flex items-center justify-between px-6 pt-3 font-mono text-[10px] text-muted">
        <span>9:41</span>
        <span className="h-4 w-20 rounded-full bg-black/70" />
        <span>5G ▮▮▮</span>
      </div>

      {/* header */}
      <div className="mt-2 border-b border-border px-5 pb-3">
        <p className="truncate text-sm font-bold text-foreground">{title}</p>
        {subtitle && (
          <p className="truncate font-mono text-[10px] text-muted">{subtitle}</p>
        )}
      </div>

      {/* messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">{children}</div>

      {overlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
          {overlay}
        </div>
      )}

      {footer && (
        <div className={`border-t border-border bg-black/30 p-3 ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
