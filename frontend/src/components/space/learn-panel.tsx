"use client";

import { useEffect } from "react";
import type { DemoTopic } from "@/lib/demo-space";

/**
 * Learn mode: the chat for one topic, in a panel beside the canvas.
 *
 * A panel rather than a modal, so the topic stays in view while you read. Only
 * the open topic's conversation is mounted — the cards hold no chat of their
 * own, which is what keeps a big canvas cheap.
 */
export function LearnPanel({
  topic,
  onClose,
}: {
  topic: DemoTopic;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <aside
      aria-label={`Learn mode: ${topic.topic_name}`}
      className="flex w-full shrink-0 flex-col border-l border-border bg-surface sm:w-[380px]"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-muted">{topic.syllabus_ref}</p>
          <h2 className="mt-1 truncate text-sm font-semibold tracking-tight">
            {topic.topic_name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close learn mode"
          className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={2} aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <p className="text-xs leading-relaxed text-muted">
          This conversation knows one topic of one lesson, at the depth your
          syllabus asks for.
        </p>

        {topic.messages.map((message, index) => (
          <div
            key={index}
            className={message.from === "student" ? "flex justify-end" : ""}
          >
            <p
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                message.from === "student"
                  ? "bg-accent-subtle text-foreground"
                  : "border border-border bg-subtle text-foreground"
              }`}
            >
              {message.text}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-border px-5 py-4">
        <label htmlFor="learn-composer" className="sr-only">
          Ask about {topic.topic_name}
        </label>
        <input
          id="learn-composer"
          disabled
          placeholder="Ask about this topic…"
          className="w-full rounded-lg border border-border bg-subtle px-3.5 py-2.5 text-sm placeholder:text-muted/60 disabled:cursor-not-allowed"
        />
        <p className="mt-2 text-[11px] text-muted">
          Preview only — learn mode runs on your own provider key once it is wired up.
        </p>
      </div>
    </aside>
  );
}
