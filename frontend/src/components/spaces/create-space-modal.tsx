"use client";

import { useState } from "react";
import { FormError } from "@/components/auth/form-error";
import { SyllabusChip } from "@/components/spaces/syllabus-chip";
import { buttonStyles } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export type NewSpace = {
  /** The lesson the space is built around. */
  lesson: string;
  /** The syllabus topics that lesson covers. */
  syllabus: string[];
};

type CreateSpaceModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (space: NewSpace) => void;
  /** True while the create request is in flight. */
  submitting?: boolean;
  /** A failed create, shown above the actions. */
  error?: string;
};

/**
 * Collects a lesson and the syllabus topics it covers.
 *
 * The modal owns no persistence and never closes itself: the caller mutates,
 * then closes on success. Mounting it only while open is what resets the form.
 */
export function CreateSpaceModal({
  open,
  onClose,
  onCreate,
  submitting = false,
  error,
}: CreateSpaceModalProps) {
  const [lesson, setLesson] = useState("");
  const [topic, setTopic] = useState("");
  const [syllabus, setSyllabus] = useState<string[]>([]);

  // Case-insensitive, so the same topic can't stack up under two spellings.
  function alreadyAdded(value: string) {
    return syllabus.some((item) => item.toLowerCase() === value.toLowerCase());
  }

  function addTopic() {
    const next = topic.trim();
    if (!next) return;
    if (!alreadyAdded(next)) setSyllabus((prev) => [...prev, next]);
    setTopic("");
  }

  function onTopicKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Enter or comma commits the topic instead of submitting the whole form.
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTopic();
    }
  }

  function removeTopic(index: number) {
    setSyllabus((prev) => prev.filter((_, i) => i !== index));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const name = lesson.trim();
    // A topic typed but never committed with Enter was still meant to count.
    const pending = topic.trim();
    const topics =
      pending && !alreadyAdded(pending) ? [...syllabus, pending] : syllabus;

    if (!name || topics.length === 0) return;
    onCreate({ lesson: name, syllabus: topics });
  }

  // The API requires a name and at least one topic; mirror that here so the
  // button is honest about it rather than failing on submit.
  const canSubmit =
    lesson.trim().length > 0 && (syllabus.length > 0 || topic.trim().length > 0);

  return (
    <Modal open={open} onClose={onClose} title="Create a space">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="lesson" className="block text-sm font-medium">
            Lesson
          </label>
          <input
            id="lesson"
            name="lesson"
            value={lesson}
            onChange={(event) => setLesson(event.target.value)}
            placeholder="e.g. Photosynthesis"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="syllabus-topic" className="block text-sm font-medium">
            Syllabus
          </label>
          <div className="flex gap-2">
            <input
              id="syllabus-topic"
              name="syllabus-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={onTopicKeyDown}
              placeholder="Add a topic and press Enter"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="button"
              onClick={addTopic}
              disabled={!topic.trim()}
              className={buttonStyles("secondary")}
            >
              Add
            </button>
          </div>
          <p className="text-xs text-muted">
            Add each syllabus topic this lesson covers. At least one is needed.
          </p>

          {syllabus.length > 0 ? (
            <ul className="flex flex-wrap gap-2 pt-1">
              {syllabus.map((item, index) => (
                <li key={item}>
                  <SyllabusChip label={item} onRemove={() => removeTopic(index)} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <FormError message={error} />

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={buttonStyles("secondary")}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={buttonStyles("primary")}
          >
            {submitting ? "Creating…" : "Create space"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
