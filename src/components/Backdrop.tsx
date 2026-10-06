// Animated background used on every page: glowing orbs + a moving grid.
export default function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#04070d]"
    >
      <div className="orb orb-cyan" />
      <div className="orb orb-magenta" />
      <div className="orb orb-green" />
      <div className="grid-floor" />
      <div className="scanlines" />
      <div className="vignette" />
    </div>
  );
}
