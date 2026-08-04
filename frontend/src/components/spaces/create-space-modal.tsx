"use client";

import { useRef, useState } from "react";
import { FormError } from "@/components/auth/form-error";
import { SyllabusChip } from "@/components/spaces/syllabus-chip";
import { buttonStyles } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LEVEL_LABELS, type RevisionLevel } from "@/lib/space-api";

export type NewSpace = {
  /** The lesson the space is built around. */
  lesson: string;
  /** What the student is revising for. */
  goal: string;
  /** How deep they want it taken. */
  level: RevisionLevel;
  /** The syllabus topics that lesson covers. */
  syllabus: string[];
};

const GOALS = ["Interview", "Exam"] as const;

const LEVELS: { value: RevisionLevel; hint: string }[] = [
  { value: "beginner", hint: "New to this" },
  { value: "intermediate", hint: "Seen it before" },
  { value: "advanced", hint: "Going deep" },
];

function optionStyles(selected: boolean) {
  return [
    "rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
    selected
      ? "border-accent bg-accent-subtle text-foreground"
      : "border-border bg-surface text-muted hover:bg-subtle hover:text-foreground",
  ].join(" ");
}

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
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<RevisionLevel | null>(null);
  const [topic, setTopic] = useState("");
  const [syllabus, setSyllabus] = useState<string[]>([]);
  const goalInput = useRef<HTMLInputElement>(null);

  const presetGoal = GOALS.find(
    (option) => option.toLowerCase() === goal.trim().toLowerCase(),
  );

  function chooseOther() {
    setGoal("");
    goalInput.current?.focus();
  }

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
    const purpose = goal.trim();
    // A topic typed but never committed with Enter was still meant to count.
    const pending = topic.trim();
    const topics =
      pending && !alreadyAdded(pending) ? [...syllabus, pending] : syllabus;

    if (!name || !purpose || !level || topics.length === 0) return;
    onCreate({ lesson: name, goal: purpose, level, syllabus: topics });
  }

  // The API requires all four; mirror that here so the button is honest about
  // it rather than failing on submit.
  const canSubmit =
    lesson.trim().length > 0 &&
    goal.trim().length > 0 &&
    level !== null &&
    (syllabus.length > 0 || topic.trim().length > 0);

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
          <span id="goal-label" className="block text-sm font-medium">
            What are you revising this for?
          </span>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby="goal-label"
          >
            {GOALS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGoal(option)}
                aria-pressed={presetGoal === option}
                className={optionStyles(presetGoal === option)}
              >
                {option}
              </button>
            ))}
            <button
              type="button"
              onClick={chooseOther}
              aria-pressed={goal.trim().length > 0 && !presetGoal}
              className={optionStyles(goal.trim().length > 0 && !presetGoal)}
            >
              Other
            </button>
          </div>
          <input
            ref={goalInput}
            id="goal"
            name="goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            maxLength={120}
            aria-labelledby="goal-label"
            placeholder="Or type your own, e.g. Campus placement"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="space-y-1.5">
          <span id="level-label" className="block text-sm font-medium">
            Where are you with it?
          </span>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby="level-label"
          >
            {LEVELS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLevel(option.value)}
                aria-pressed={level === option.value}
                className={optionStyles(level === option.value)}
              >
                {LEVEL_LABELS[option.value]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            {LEVELS.find((option) => option.value === level)?.hint ??
              "Sets how deep the tutor goes on every card."}
          </p>
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
