// A thin progress bar used for XP and Trust.
export default function Meter({
  value,
  max,
  color,
  height = "h-2",
}: {
  value: number;
  max: number;
  color: string;
  height?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`${height} w-full overflow-hidden rounded-full bg-black/50`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
    </div>
  );
}

/** Trust turns from green to yellow to red as it drops. */
export function trustColor(trust: number): string {
  if (trust >= 60) return "#3dffa2";
  if (trust >= 30) return "#ffc83d";
  return "#ff3d6e";
}
