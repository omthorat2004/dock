"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { useChatHistory, useSendMessage } from "@/hooks/use-chat";
import { ERROR_CODES, isProviderKeyError } from "@/lib/constants";
import type { Topic } from "@/lib/space-api";

/**
 * Learn mode: the chat for one topic, in a panel beside the canvas.
 *
 * A panel rather than a modal, so the topic stays in view while you read. Only
 * the open topic's conversation is mounted; the cards hold no chat of their
 * own, which is what keeps a big canvas cheap, and it is why the history query
 * lives here rather than on the card.
 */
export function LearnPanel({
  spaceId,
  topic,
  onClose,
}: {
  spaceId: string;
  topic: Topic;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const history = useChatHistory(spaceId, topic.id);
  const send = useSendMessage(spaceId, topic.id);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const messages = history.data?.messages ?? [];

  // Follow the conversation as it grows. `messages.length` rather than the
  // array, so a refetch that changes nothing does not yank the scroll, and the
  // streamed length too, so a reply being written stays in view as it lands
  // rather than only once it is stored.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, send.streamed.length]);

  // The session's own state is the authority; the error from the send that hit
  // the limit is only how we found out about it.
  const limitReached =
    history.data?.limit_reached ??
    topic.session.limit_reached ??
    send.error?.code === ERROR_CODES.tokenLimitReached;
  // Both are 401s about the model key, not the session, so both close the
  // composer and point at /api-key rather than letting the student retype a
  // message that cannot send.
  const needsKey = isProviderKeyError(send.error?.code);
  const keyRejected = send.error?.code === ERROR_CODES.invalidProviderKey;
  const closed = limitReached || needsKey;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || send.isPending || closed) return;
    setDraft("");
    send.mutate(message);
  }

  return (
    <aside
      aria-label={`Learn mode: ${topic.topic_name}`}
      className="flex w-full shrink-0 flex-col border-l border-border bg-surface sm:w-[380px]"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Learn mode
          </p>
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

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {history.isPending ? (
          <div className="space-y-3" aria-hidden>
            <div className="skeleton h-12 w-4/5 rounded-xl" />
            <div className="skeleton ml-auto h-9 w-3/5 rounded-xl" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted">
            This conversation knows one topic of one lesson, at the depth your
            syllabus asks for. Ask it anything about {topic.topic_name}.
          </p>
        ) : null}

        {messages.map((message, index) =>
          message.role === "user" ? (
            // The student's own words, shown exactly as typed. Parsing these
            // would mean their stray asterisks silently changed the message.
            <div key={`${message.created_at}-${index}`} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-xl bg-accent-subtle px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                {message.content}
              </p>
            </div>
          ) : (
            <div
              key={`${message.created_at}-${index}`}
              className="max-w-[85%] rounded-xl border border-border bg-subtle px-3.5 py-2.5 text-sm text-foreground"
            >
              <Markdown>{message.content}</Markdown>
            </div>
          ),
        )}

        {send.isPending ? (
          send.streamed ? (
            // The same bubble the stored message will render in, so the reply
            // does not shift or restyle at the moment the stream ends and the
            // transcript takes over.
            <div
              aria-busy
              className="max-w-[85%] rounded-xl border border-border bg-subtle px-3.5 py-2.5 text-sm text-foreground"
            >
              <Markdown>{send.streamed}</Markdown>
            </div>
          ) : (
            <p className="text-xs text-muted" role="status">
              Dock is thinking…
            </p>
          )
        ) : null}

        <div ref={bottom} />
      </div>

      <div className="border-t border-border px-5 py-4">
        {limitReached ? (
          <p
            role="alert"
            className="rounded-lg border border-border bg-subtle px-3.5 py-2.5 text-xs leading-relaxed text-muted"
          >
            Context limit reached. This conversation has outgrown the model&apos;s
            input budget, so Dock cannot add to it. Open another topic to keep
            revising.
          </p>
        ) : needsKey ? (
          <p className="rounded-lg border border-border bg-subtle px-3.5 py-2.5 text-xs leading-relaxed text-muted">
            {keyRejected ? (
              <>
                Your provider rejected that API key.{" "}
                <Link href="/api-key" className="text-accent hover:underline">
                  Check your key
                </Link>{" "}
                to keep chatting.
              </>
            ) : (
              <>
                Learn mode runs on your own model.{" "}
                <Link href="/api-key" className="text-accent hover:underline">
                  Add your API key
                </Link>{" "}
                to start chatting.
              </>
            )}
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <label htmlFor="learn-composer" className="sr-only">
              Ask about {topic.topic_name}
            </label>
            <div className="flex gap-2">
              <input
                id="learn-composer"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={send.isPending}
                placeholder="Ask about this topic…"
                aria-invalid={send.isError || undefined}
                aria-describedby={send.isError ? "learn-error" : undefined}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={send.isPending || draft.trim().length === 0}
                className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {send.isPending ? "Sending…" : "Send"}
              </button>
            </div>

            {send.isError && !needsKey ? (
              <p id="learn-error" role="alert" className="mt-2 text-xs text-danger">
                {send.error.message}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </aside>
  );
}
