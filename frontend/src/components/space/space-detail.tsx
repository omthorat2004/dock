"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSpace } from "@/hooks/use-spaces";
import { AddTopicsModal } from "@/components/space/add-topics-modal";
import { CanvasNode, SpaceCanvas } from "@/components/space/space-canvas";
import { LearnPanel } from "@/components/space/learn-panel";
import { LessonNode } from "@/components/space/lesson-node";
import { TopicCard } from "@/components/space/topic-card";
import { VideoPanel } from "@/components/space/video-panel";
import { buttonStyles } from "@/components/ui/button";
import { LEVEL_LABELS } from "@/lib/space-api";
import { topicPosition } from "@/lib/topic-layout";

/**
 * Which panel is beside the canvas, and for which card. One piece of state,
 * not two, because learn mode and the video shelf share the same slot, so opening
 * either has to close the other.
 */
type OpenPanel = { topicId: string; mode: "chat" | "videos" };

const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 720;
const DEFAULT_PANEL_WIDTH = 380;

/** The panel's slot beside the canvas, with a drag handle on its left edge. */
function PanelSlot({
  width,
  onResize,
  children,
}: {
  width: number;
  onResize: (width: number) => void;
  children: React.ReactNode;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (value: number) =>
    Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, value));

  return (
    <div
      ref={slot}
      style={{ width }}
      className={`flex min-h-0 max-w-[85vw] shrink-0 ${dragging ? "select-none" : ""}`}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        aria-valuenow={width}
        aria-valuemin={MIN_PANEL_WIDTH}
        aria-valuemax={MAX_PANEL_WIDTH}
        tabIndex={0}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          const right =
            slot.current?.getBoundingClientRect().right ?? window.innerWidth;
          onResize(clamp(right - event.clientX));
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          setDragging(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") onResize(clamp(width + 16));
          else if (event.key === "ArrowRight") onResize(clamp(width - 16));
        }}
        className={`w-1 shrink-0 cursor-col-resize touch-none transition-colors focus-visible:bg-accent/40 focus-visible:outline-none ${
          dragging ? "bg-accent/40" : "hover:bg-accent/40"
        }`}
      />
      {children}
    </div>
  );
}

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
  const [addingTopics, setAddingTopics] = useState(false);
  // Held here, not in the slot, so the width survives closing and reopening.
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);

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
          {space.goal || space.level ? (
            <p className="mt-0.5 truncate text-xs text-muted">
              {[space.goal, space.level && LEVEL_LABELS[space.level]]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="hidden font-mono text-xs text-muted sm:block">
            {space.topics.length} topics
          </p>
          <button
            type="button"
            onClick={() => setAddingTopics(true)}
            className={buttonStyles("secondary", "px-3 py-1.5 text-xs")}
          >
            Add topics
          </button>
        </div>
      </div>

      {/* Mounted only while open, so the form resets on every close. */}
      {addingTopics ? (
        <AddTopicsModal
          spaceId={space.id}
          open
          onClose={() => setAddingTopics(false)}
          existing={space.topics.map((topic) => topic.topic_name)}
        />
      ) : null}

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
          <PanelSlot width={panelWidth} onResize={setPanelWidth}>
            {panel.mode === "chat" ? (
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
            )}
          </PanelSlot>
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
