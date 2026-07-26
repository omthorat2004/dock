"use client";

import { useState } from "react";
import type { DemoTopic } from "@/lib/demo-space";

/**
 * One topic on the canvas: what it is, how far through it you are, and the two
 * ways into it — its videos and its chat.
 *
 * The video shelf renders only while it is open, so a canvas of twenty topics
 * holds twenty headers rather than sixty video rows.
 */
export function TopicCard({
  topic,
  active,
  onOpenChat,
}: {
  topic: DemoTopic;
  active: boolean;
  onOpenChat: () => void;
}) {
  const [showVideos, setShowVideos] = useState(false);
  const progress = Math.round(topic.progress * 100);

  return (
    <article
      data-canvas-card
      className={`w-[272px] rounded-xl border bg-surface p-5 shadow-sm transition-colors ${
        active ? "border-accent" : "border-border hover:border-muted/50"
      }`}
    >
      <p className="font-mono text-[11px] text-muted">{topic.syllabus_ref}</p>
      <h3 className="mt-1.5 text-sm font-semibold leading-snug tracking-tight text-balance">
        {topic.topic_name}
      </h3>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>{progress === 0 ? "Not started" : `${progress}% revised`}</span>
          {progress === 100 ? <span>Done</span> : null}
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${topic.topic_name} revision progress`}
          className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-foreground/60"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowVideos((open) => !open)}
          aria-expanded={showVideos}
          className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {showVideos ? "Hide videos" : `Videos · ${topic.videos.length}`}
        </button>
        <button
          type="button"
          onClick={onOpenChat}
          className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Chat
        </button>
      </div>

      {showVideos ? (
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {topic.videos.map((video) => (
            <li key={video.title}>
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-7 shrink-0 items-center justify-center rounded border border-border bg-subtle"
                >
                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-muted" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-xs leading-snug text-foreground group-hover:underline">
                    {video.title}
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted">
                    {video.channel} · {video.duration}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
