"use client";

import { MAX_YOUTUBE_LINKS } from "@/lib/constants";
import type { Topic } from "@/lib/space-api";

/**
 * One topic on the canvas: what it is, and the two ways into it.
 *
 * Both ways open a panel beside the canvas rather than expanding in place —
 * a card is too small to watch a video or hold a conversation in, and the
 * canvas has to stay legible behind whichever is open.
 *
 * A card that has hit either limit says so here, so the student learns it from
 * the canvas rather than by opening the panel and finding the button gone.
 */
export function TopicCard({
  topic,
  index,
  active,
  onOpenVideos,
  onOpenChat,
}: {
  topic: Topic;
  index: number;
  active: boolean;
  onOpenVideos: () => void;
  onOpenChat: () => void;
}) {
  const videoCount = topic.youtube_links.length;

  return (
    <article
      data-canvas-card
      className={`w-[272px] rounded-xl border bg-surface p-5 shadow-sm transition-colors ${
        active ? "border-accent" : "border-border hover:border-muted/50"
      }`}
    >
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
        Topic {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className="mt-1.5 text-sm font-semibold leading-snug tracking-tight text-balance">
        {topic.topic_name}
      </h3>

      {topic.video_limit_reached || topic.session.limit_reached ? (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {topic.video_limit_reached ? (
            <StatusChip>All {MAX_YOUTUBE_LINKS} videos</StatusChip>
          ) : null}
          {topic.session.limit_reached ? (
            <StatusChip>Context limit reached</StatusChip>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-4">
        <p className="text-[11px] text-muted">Not started</p>
        <div
          role="progressbar"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${topic.topic_name} revision progress`}
          className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-foreground/60"
            style={{ width: "0%" }}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onOpenVideos}
          className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Videos · {videoCount}
        </button>
        <button
          type="button"
          onClick={onOpenChat}
          className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Chat
        </button>
      </div>
    </article>
  );
}

/**
 * A neutral pill stating a limit. Deliberately not `danger` — nothing has gone
 * wrong, the topic has simply had everything Dock can give it.
 */
function StatusChip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full border border-border bg-subtle px-2 py-0.5 text-[10px] font-medium text-muted">
      {children}
    </li>
  );
}
