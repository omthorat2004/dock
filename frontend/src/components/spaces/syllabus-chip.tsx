type SyllabusChipProps = {
  label: string;
  onRemove: () => void;
};

/** A single added syllabus topic, with a cross button to remove it. */
export function SyllabusChip({ label, onRemove }: SyllabusChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-subtle py-1 pl-3 pr-1.5 text-sm text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition-colors hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth={2.5} aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}
