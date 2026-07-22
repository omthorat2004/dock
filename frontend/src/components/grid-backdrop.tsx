/** Background texture only — no colour, no glow. See the design-system skill. */
export function GridBackdrop({ fade = true }: { fade?: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 grid-surface ${
        fade ? "grid-fade" : ""
      }`}
    />
  );
}
