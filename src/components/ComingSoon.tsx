export default function ComingSoon({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <div className="w-full max-w-xl rounded-xl border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-bold text-neon neon-text">{title}</h1>
        <p className="mt-3 text-muted">{text}</p>
        <p className="mt-6 font-mono text-xs text-warn">{"// under construction"}</p>
      </div>
    </div>
  );
}
