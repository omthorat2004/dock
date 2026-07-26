"use client";

import { useState } from "react";
import Link from "next/link";
import { CanvasNode, SpaceCanvas } from "@/components/space/space-canvas";
import { LearnPanel } from "@/components/space/learn-panel";
import { LessonNode } from "@/components/space/lesson-node";
import { TopicCard } from "@/components/space/topic-card";
import type { DemoSpace } from "@/lib/demo-space";

/**
 * A space, opened: the lesson in the middle of its canvas with its topic cards
 * laid out around it, and learn mode in a panel beside them.
 *
 * The cards are built here and handed to `SpaceCanvas` as children, so panning
 * and zooming re-render the canvas alone — React reuses these elements and
 * never walks the cards again.
 */
export function SpaceDetail({ space }: { space: DemoSpace }) {
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);
  const openTopic = space.topics.find((topic) => topic.id === openTopicId) ?? null;

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
          {space.syllabus_section}
        </p>
      </div>

      <div className="flex min-h-0 flex-1">
        <SpaceCanvas className="flex-1">
          <CanvasNode x={0} y={0}>
            <LessonNode
              lessonName={space.lesson_name}
              syllabusSection={space.syllabus_section}
              topicCount={space.topics.length}
            />
          </CanvasNode>

          {space.topics.map((topic) => (
            <CanvasNode key={topic.id} x={topic.x} y={topic.y}>
              <TopicCard
                topic={topic}
                active={topic.id === openTopicId}
                onOpenChat={() => setOpenTopicId(topic.id)}
              />
            </CanvasNode>
          ))}
        </SpaceCanvas>

        {openTopic ? (
          <LearnPanel topic={openTopic} onClose={() => setOpenTopicId(null)} />
        ) : null}
      </div>
    </div>
  );
}
