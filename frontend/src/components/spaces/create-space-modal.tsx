"use client";

import { useState } from "react";
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
  onCreate?: (space: NewSpace) => void;
};

export function CreateSpaceModal({ open, onClose, onCreate }: CreateSpaceModalProps) {
  const [lesson, setLesson] = useState("");
  const [topic, setTopic] = useState("");
  const [syllabus, setSyllabus] = useState<string[]>([]);

  function addTopic() {
    const next = topic.trim();
    if (!next) return;
    // Ignore duplicates, case-insensitively, so the same topic can't stack up.
    const exists = syllabus.some((item) => item.toLowerCase() === next.toLowerCase());
    if (!exists) setSyllabus((prev) => [...prev, next]);
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

  function reset() {
    setLesson("");
    setTopic("");
    setSyllabus([]);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = lesson.trim();
    if (!name) return;
    onCreate?.({ lesson: name, syllabus });
    reset();
    onClose();
  }

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
            Add each syllabus topic this lesson covers.
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

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className={buttonStyles("secondary")}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!lesson.trim()}
            className={buttonStyles("primary")}
          >
            Create space
          </button>
        </div>
      </form>
    </Modal>
  );
}
