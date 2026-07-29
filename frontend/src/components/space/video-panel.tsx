"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGenerateVideos } from "@/hooks/use-videos";
import {
  ERROR_CODES,
  MAX_YOUTUBE_LINKS,
  YOUTUBE_LINKS_PER_REQUEST,
} from "@/lib/constants";
import type { Topic } from "@/lib/space-api";

/**
 * The video shelf for one topic, in a panel beside the canvas.
 *
 * The same surface learn mode uses, for the same reason: the topic stays in
 * view while you watch, and Escape closes it. The difference is only what
 * fills the panel — explainers matched to this topic instead of a conversation
 * about it.
 *
 * The player is an embed rather than a link out, so revising does not mean
 * leaving Dock for a tab full of recommendations.
 *
 * Filling the shelf is one server call that can take a while — the model runs
 * real YouTube searches before it picks — so the button says what it is doing
 * and the panel stays usable while it does.
 */
export function VideoPanel({
  spaceId,
  topic,
  onClose,
}: {
  spaceId: string;
  topic: Topic;
  onClose: () => void;
}) {
  const generate = useGenerateVideos(spaceId, topic.id);
  const links = topic.youtube_links;

  // What the student picked, by id rather than index — a generate appends to
  // the list, and an index would silently come to mean a different video.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Derived, not synced: falling back to the first video means the player
  // fills itself as soon as any arrive, without an effect writing state back
  // during render — which the React Compiler lint rejects outright.
  const playing =
    links.find((link) => link.video_id === selectedId) ?? links[0] ?? null;
  const playingId = playing?.video_id ?? null;
  const needsKey = generate.error?.code === ERROR_CODES.apiKeyNotConfigured;
  const foundNothing = generate.isSuccess && generate.data.added.length === 0;

  // YouTube being down or out of quota is not the student's mistake and there
  // is nothing for them to fix, so it reads as a neutral "not right now"
  // rather than as an error in danger red.
  const youtubeIsDown =
    generate.error?.code === ERROR_CODES.youtubeUnavailable ||
    generate.error?.code === ERROR_CODES.youtubeRateLimited;

  return (
    <aside
      aria-label={`Videos: ${topic.topic_name}`}
      className="flex w-full shrink-0 flex-col border-l border-border bg-surface sm:w-[380px]"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Videos
          </p>
          <h2 className="mt-1 truncate text-sm font-semibold tracking-tight">
            {topic.topic_name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close videos"
          className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 fill-none stroke-current"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {playing ? (
        <div className="border-b border-border px-5 py-4">
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-subtle">
            <iframe
              // Keyed by id so switching video swaps the player rather than
              // leaving the previous one loaded underneath.
              key={playing.video_id}
              src={`https://www.youtube-nocookie.com/embed/${playing.video_id}`}
              title={playing.title}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
          <p className="mt-2.5 text-xs font-medium leading-snug text-foreground text-pretty">
            {playing.title}
          </p>
          <a
            href={playing.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-[11px] text-muted transition-colors hover:text-foreground"
          >
            Open on YouTube ↗
          </a>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {links.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted">
            No videos yet. Dock searches YouTube for this topic and picks a mix
            of Indian and international explainers — every one a real search
            result, so nothing here is a dead link.
          </p>
        ) : (
          <ul className="space-y-1">
            {links.map((video, index) => {
              const isPlaying = video.video_id === playingId;
              return (
                <li key={video.video_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(video.video_id)}
                    aria-current={isPlaying || undefined}
                    className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                      isPlaying ? "bg-subtle" : "hover:bg-subtle"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-5 w-7 shrink-0 items-center justify-center rounded border border-border bg-subtle font-mono text-[10px] text-muted"
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`min-w-0 text-xs leading-snug ${
                        isPlaying ? "font-medium text-foreground" : "text-muted"
                      }`}
                    >
                      {video.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-5 py-4">
        {topic.video_limit_reached ? (
          <p className="text-xs leading-relaxed text-muted">
            That is all {MAX_YOUTUBE_LINKS} videos for this topic — Dock cannot
            show you more.
          </p>
        ) : needsKey ? (
          <p className="text-xs leading-relaxed text-muted">
            Finding videos runs on your own model.{" "}
            <Link href="/api-key" className="text-accent hover:underline">
              Add your API key
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {generate.isPending
                ? "Finding videos…"
                : links.length === 0
                  ? `Find ${YOUTUBE_LINKS_PER_REQUEST} videos`
                  : `Find ${YOUTUBE_LINKS_PER_REQUEST} more`}
            </button>

            {generate.isError ? (
              <p
                role="alert"
                className={`mt-2 text-xs leading-relaxed ${
                  youtubeIsDown ? "text-muted" : "text-danger"
                }`}
              >
                {generate.error.message}
              </p>
            ) : foundNothing ? (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Nothing new checked out this time. Try again for a different set.
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-muted">
                {links.length} of {MAX_YOUTUBE_LINKS}
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
