import Link from "next/link";
import { formatDate, formatRelativeTime } from "@/lib/relative-time";
import type { SpaceSummary } from "@/lib/space-api";
import { spaceHref } from "@/lib/space-url";

/**
 * One space on the dashboard: the lesson, how many topics it holds, and when
 * it was last touched. Opens its canvas at `/space/lesson-name-<id>`.
 */
export function SpaceCard({ space }: { space: SpaceSummary }) {
  const topics = `${space.topic_count} ${space.topic_count === 1 ? "topic" : "topics"}`;

  return (
    <Link
      href={spaceHref(space)}
      className="block h-full rounded-xl border border-border bg-surface p-6 transition-colors hover:border-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
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
    </Link>
  );
}
