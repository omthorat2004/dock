import { formatDate, formatRelativeTime } from "@/lib/relative-time";
import type { SpaceSummary } from "@/lib/space-api";

/**
 * One space on the dashboard: the lesson, how many topics it holds, and when
 * it was last touched. Not a link yet — the space's own page is the next thing
 * being built, and a card that goes nowhere is worse than one that does not
 * pretend to.
 */
export function SpaceCard({ space }: { space: SpaceSummary }) {
  const topics = `${space.topic_count} ${space.topic_count === 1 ? "topic" : "topics"}`;

  return (
    <article className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-muted/40">
      <h3 className="text-base font-semibold tracking-tight text-balance">
        {space.lesson_name}
      </h3>
      <p className="mt-1 text-sm text-muted">{topics}</p>

      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
        <div className="flex gap-1.5">
          <dt>Updated</dt>
          <dd>
            <time dateTime={space.updated_at}>
              {formatRelativeTime(space.updated_at)}
            </time>
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Created</dt>
          <dd>
            <time dateTime={space.created_at}>{formatDate(space.created_at)}</time>
          </dd>
        </div>
      </dl>
    </article>
  );
}
