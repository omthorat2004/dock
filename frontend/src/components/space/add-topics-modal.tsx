"use client";

import { useState } from "react";
import { FormError } from "@/components/auth/form-error";
import { SuggestedTopicChip } from "@/components/spaces/suggested-topic-chip";
import { SyllabusChip } from "@/components/spaces/syllabus-chip";
import { buttonStyles } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAddTopics, useSuggestMoreTopics } from "@/hooks/use-spaces";

type AddTopicsModalProps = {
  spaceId: string;
  open: boolean;
  onClose: () => void;
  /** Topics the space already holds, so neither list offers them twice. */
  existing: string[];
};

/**
 * More cards for a space that is already open.
 *
 * The create form's second step without its questions: the space knows its own
 * lesson, goal and level, so the suggest button needs no arguments and the
 * student only chooses topics. Staged locally and saved in one request, so
 * nothing lands on the canvas until they press update.
 */
export function AddTopicsModal({
  spaceId,
  open,
  onClose,
  existing,
}: AddTopicsModalProps) {
  const [topic, setTopic] = useState("");
  const [staged, setStaged] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasSuggested, setHasSuggested] = useState(false);

  const suggest = useSuggestMoreTopics(spaceId);
  const addTopics = useAddTopics(spaceId);

  const onCanvas = new Set(existing.map((name) => name.toLowerCase()));

  function alreadyHave(value: string) {
    const name = value.toLowerCase();
    return onCanvas.has(name) || staged.some((item) => item.toLowerCase() === name);
  }

  function stage(name: string) {
    if (!alreadyHave(name)) setStaged((prev) => [...prev, name]);
  }

  function addTyped() {
    const next = topic.trim();
    if (!next) return;
    stage(next);
    setTopic("");
  }

  function onTopicKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTyped();
    }
  }

  function askForSuggestions() {
    if (suggest.isPending) return;
    suggest.mutate(undefined, {
      onSuccess: (fresh) => {
        setHasSuggested(true);
        setSuggestions((prev) => {
          const seen = new Set(prev.map((item) => item.toLowerCase()));
          return [
            ...prev,
            ...fresh.filter((item) => !seen.has(item.toLowerCase())),
          ];
        });
      },
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addTopics.isPending) return;

    // A name typed but never committed with Enter was still meant to count.
    const pending = topic.trim();
    const topics =
      pending && !alreadyHave(pending) ? [...staged, pending] : staged;

    if (topics.length === 0) return;
    addTopics.mutate(topics, { onSuccess: onClose });
  }

  const canSubmit = staged.length > 0 || topic.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Add topics">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="new-topic" className="block text-sm font-medium">
            Topic
          </label>
          <div className="flex gap-2">
            <input
              id="new-topic"
              name="new-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={onTopicKeyDown}
              placeholder="Add a topic and press Enter"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="button"
              onClick={addTyped}
              disabled={!topic.trim()}
              className={buttonStyles("secondary")}
            >
              Add
            </button>
          </div>

          {staged.length > 0 ? (
            <ul className="flex flex-wrap gap-2 pt-1">
              {staged.map((item, index) => (
                <li key={item}>
                  <SyllabusChip
                    label={item}
                    onRemove={() =>
                      setStaged((prev) => prev.filter((_, i) => i !== index))
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">
              {existing.length} already on the canvas. Nothing is added until you
              press update.
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-subtle p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {hasSuggested ? "More ideas?" : "Not sure what is missing?"}
            </p>
            <button
              type="button"
              onClick={askForSuggestions}
              disabled={suggest.isPending}
              className={buttonStyles("secondary", "py-2 text-xs")}
            >
              {suggest.isPending
                ? "Asking…"
                : hasSuggested
                  ? "Suggest 5 more"
                  : "Suggest topics with AI"}
            </button>
          </div>
          <p className="text-xs text-muted">
            Uses your own model key, and skips what this space already covers.
          </p>

          <FormError message={suggest.error?.message} />

          {suggestions.length > 0 ? (
            <ul className="flex flex-wrap gap-2 pt-0.5">
              {suggestions.map((item) => (
                <li key={item}>
                  <SuggestedTopicChip
                    label={item}
                    added={alreadyHave(item)}
                    onAdd={() => stage(item)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <FormError message={addTopics.error?.message} />

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={addTopics.isPending}
            className={buttonStyles("secondary")}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || addTopics.isPending}
            className={buttonStyles("primary")}
          >
            {addTopics.isPending ? "Updating…" : "Update space"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
