"use client";

import { useState } from "react";
import Link from "next/link";
import { useSpace } from "@/hooks/use-spaces";
import { CanvasNode, SpaceCanvas } from "@/components/space/space-canvas";
import { LearnPanel } from "@/components/space/learn-panel";
import { LessonNode } from "@/components/space/lesson-node";
import { TopicCard } from "@/components/space/topic-card";
import { VideoPanel } from "@/components/space/video-panel";
import { topicPosition } from "@/lib/topic-layout";

/**
 * Which panel is beside the canvas, and for which card. One piece of state,
 * not two, because learn mode and the video shelf share the same slot, so opening
 * either has to close the other.
 */
type OpenPanel = { topicId: string; mode: "chat" | "videos" };

/**
 * A space, opened: the lesson in the middle of its canvas with its topic cards
 * laid out around it, and learn mode in a panel beside them.
 *
 * The cards are built here and handed to `SpaceCanvas` as children, so panning
 * and zooming re-render the canvas alone. React reuses these elements and
 * never walks the cards again.
 */
export function SpaceDetail({ spaceId }: { spaceId: string }) {
  const { data: space, isPending, error } = useSpace(spaceId);
  const [panel, setPanel] = useState<OpenPanel | null>(null);

  if (isPending) return <SpaceShimmer />;

  if (error) {
    return (
      <Shell>
        <p className="text-sm text-muted">
          {error.status === 404
            ? "That space does not exist, or is not yours."
            : error.message}
        </p>
        <Link href="/spaces" className="mt-4 text-sm text-accent hover:underline">
          Back to your spaces
        </Link>
      </Shell>
    );
  }

  // Read the open topic out of the freshly fetched space rather than holding
  // the object in state: a chat or a generate updates the space in the cache,
  // and a copy captured on open would go stale the moment either happened.
  const openTopic = space.topics.find((t) => t.id === panel?.topicId) ?? null;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
        <div className="min-w-0">
          <Link
            href="/spaces"
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            ← Spaces
          </Link>
          <h1 className="mt-0.5 truncate text-sm font-semibold tracking-tight">
            {space.lesson_name}
          </h1>
        </div>
        <p className="hidden shrink-0 font-mono text-xs text-muted sm:block">
          {space.topics.length} topics
        </p>
      </div>

      <div className="flex min-h-0 flex-1">
        <SpaceCanvas className="flex-1">
          <CanvasNode x={0} y={0}>
            <LessonNode
              lessonName={space.lesson_name}
              topicCount={space.topics.length}
            />
          </CanvasNode>

          {space.topics.map((topic, index) => {
            const { x, y } = topicPosition(index, space.topics.length);
            return (
              <CanvasNode key={topic.id} x={x} y={y}>
                <TopicCard
                  topic={topic}
                  index={index}
                  active={topic.id === panel?.topicId}
                  onOpenVideos={() =>
                    setPanel({ topicId: topic.id, mode: "videos" })
                  }
                  onOpenChat={() => setPanel({ topicId: topic.id, mode: "chat" })}
                />
              </CanvasNode>
            );
          })}
        </SpaceCanvas>

        {openTopic && panel ? (
          panel.mode === "chat" ? (
            <LearnPanel
              // Remount when the student switches card, so the composer draft
              // and any error state belong to the topic on screen.
              key={`chat-${openTopic.id}`}
              spaceId={space.id}
              topic={openTopic}
              onClose={() => setPanel(null)}
            />
          ) : (
            <VideoPanel
              key={`videos-${openTopic.id}`}
              spaceId={space.id}
              topic={openTopic}
              onClose={() => setPanel(null)}
            />
          )
        ) : null}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}

function SpaceShimmer() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col" aria-hidden>
      <div className="border-b border-border bg-surface px-6 py-3">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton mt-2 h-4 w-48 rounded" />
      </div>
      <div className="grid flex-1 place-items-center">
        <div className="skeleton h-32 w-[340px] rounded-xl" />
      </div>
    </div>
  );
}
