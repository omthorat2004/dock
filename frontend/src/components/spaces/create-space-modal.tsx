"use client";

import { useRef, useState } from "react";
import { FormError } from "@/components/auth/form-error";
import { SuggestedTopicChip } from "@/components/spaces/suggested-topic-chip";
import { SyllabusChip } from "@/components/spaces/syllabus-chip";
import { buttonStyles } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useSuggestTopics } from "@/hooks/use-spaces";
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

const INPUT =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20";

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
 * Collects a lesson, what it is being revised for, and the topics it covers.
 *
 * Two steps rather than one long form: the lesson, goal and level are what the
 * topic step needs to be useful, so asking them first keeps the modal short
 * and means the suggest button always has something to work from.
 *
 * The modal owns no persistence and never closes itself: the caller mutates,
 * then closes on success. Mounting it only while open is what resets the form.
 * Topic suggestions are the exception: they belong to this form, are never
 * stored, and die with it, so the mutation for them lives here.
 */
export function CreateSpaceModal({
  open,
  onClose,
  onCreate,
  submitting = false,
  error,
}: CreateSpaceModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [lesson, setLesson] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<RevisionLevel | null>(null);
  const [topic, setTopic] = useState("");
  const [syllabus, setSyllabus] = useState<string[]>([]);
  const goalInput = useRef<HTMLInputElement>(null);

  const suggest = useSuggestTopics();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasSuggested, setHasSuggested] = useState(false);

  const presetGoal = GOALS.find(
    (option) => option.toLowerCase() === goal.trim().toLowerCase(),
  );

  // All three are required, and they are also what step two is built on.
  const canContinue =
    lesson.trim().length > 0 && goal.trim().length > 0 && level !== null;

  const canSubmit =
    canContinue && (syllabus.length > 0 || topic.trim().length > 0);

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

  function suggestTopics() {
    if (suggest.isPending || !level) return;
    const name = lesson.trim();
    const purpose = goal.trim();
    if (!name || !purpose) return;

    suggest.mutate(
      // What is already picked travels with the ask, so a second press
      // returns five *more* rather than five of the same.
      { lesson_name: name, goal: purpose, level, topics: syllabus },
      {
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
      },
    );
  }

  function addSuggestion(name: string) {
    if (!alreadyAdded(name)) setSyllabus((prev) => [...prev, name]);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (step === 1) {
      if (canContinue) setStep(2);
      return;
    }

    const name = lesson.trim();
    const purpose = goal.trim();
    // A topic typed but never committed with Enter was still meant to count.
    const pending = topic.trim();
    const topics =
      pending && !alreadyAdded(pending) ? [...syllabus, pending] : syllabus;

    if (!name || !purpose || !level || topics.length === 0) return;
    onCreate({ lesson: name, goal: purpose, level, syllabus: topics });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 1 ? "Create a space" : "What does it cover?"}
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Step {step} of 2
        </p>

        {step === 1 ? (
          <>
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
                className={INPUT}
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
                className={INPUT}
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

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className={buttonStyles("secondary")}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canContinue}
                className={buttonStyles("primary")}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="truncate text-sm text-muted">
              {lesson.trim()} · {goal.trim()}
              {level ? ` · ${LEVEL_LABELS[level]}` : ""}
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="syllabus-topic"
                className="block text-sm font-medium"
              >
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
                  className={`${INPUT} min-w-0 flex-1`}
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

              {syllabus.length > 0 ? (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {syllabus.map((item, index) => (
                    <li key={item}>
                      <SyllabusChip
                        label={item}
                        onRemove={() => removeTopic(index)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">
                  Type your own, or let the model propose some. At least one is
                  needed.
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-subtle p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {hasSuggested ? "More ideas?" : "Not sure what to list?"}
                </p>
                <button
                  type="button"
                  onClick={suggestTopics}
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
                {hasSuggested
                  ? "Tap a suggestion to add it. Asking again skips what you have already picked."
                  : "Uses your own model key to propose 5 topics for this lesson."}
              </p>

              <FormError message={suggest.error?.message} />

              {suggestions.length > 0 ? (
                <ul className="flex flex-wrap gap-2 pt-0.5">
                  {suggestions.map((item) => (
                    <li key={item}>
                      <SuggestedTopicChip
                        label={item}
                        added={alreadyAdded(item)}
                        onAdd={() => addSuggestion(item)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <FormError message={error} />

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className={buttonStyles("secondary")}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className={buttonStyles("primary")}
              >
                {submitting ? "Creating…" : "Create space"}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
