type SuggestedTopicChipProps = {
  label: string;
  added: boolean;
  onAdd: () => void;
};

/**
 * A topic the model proposed, waiting to be taken or ignored.
 *
 * Deliberately unlike `SyllabusChip`: this one is a button that adds, marked
 * with a spark so it reads as a suggestion rather than something already on
 * the list. Once added it is an ordinary topic and nothing records where it
 * came from.
 */
export function SuggestedTopicChip({
  label,
  added,
  onAdd,
}: SuggestedTopicChipProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={added}
      aria-label={added ? `${label}, already added` : `Add ${label}`}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        added
          ? "cursor-not-allowed border-border bg-subtle text-muted"
          : "border-accent/40 bg-accent-subtle text-foreground hover:border-accent",
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden>
        <path d="M12 2.5l1.7 4.6 4.6 1.7-4.6 1.7-1.7 4.6-1.7-4.6-4.6-1.7 4.6-1.7L12 2.5Zm6.4 11.6l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3ZM5.6 14.6l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
      </svg>
      {label}
      {added ? null : <span aria-hidden className="text-muted">+</span>}
    </button>
  );
}
