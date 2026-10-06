// Portal transition played when START is pressed: a glowing ring expands
// from the center of the screen and swallows it.

export const TRANSITION_MS = 950;

export default function Transition() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="fx-ring" />
      <div className="fx-ring fx-ring-2" />
      <div className="fx-fill" />
    </div>
  );
}
