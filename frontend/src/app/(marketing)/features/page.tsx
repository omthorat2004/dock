import type { Metadata } from "next";
import Link from "next/link";
import { GridBackdrop } from "@/components/grid-backdrop";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Syllabus-aware spaces, a grid of topic cards, scoped chat tutoring, and a curated video shelf for every topic.",
};

const sections = [
  {
    id: "spaces",
    eyebrow: "Spaces",
    title: "A space per lesson that remembers the scope",
    body: "A space is the container for one lesson. You share the lesson and the part of the syllabus it covers, and the space keeps that context for every session after: the topic names, and the depth you are expected to reach.",
    points: [
      "Share the lesson you are revising",
      "Add the syllabus section that lesson covers",
      "That scope is reused by every card in the space",
      "One space per lesson keeps lessons from bleeding into each other",
    ],
  },
  {
    id: "canvas",
    eyebrow: "Topic cards",
    title: "The lesson's topics as cards on a grid",
    body: "Instead of a sidebar list, a space opens as a grid of cards. Every topic in the lesson is a card you can move and cluster. Zoom from the whole lesson down to a single topic. The layout is yours and it persists.",
    points: [
      "Cards laid out on a snapping grid background",
      "Drag to cluster by difficulty or by what is left",
      "Progress ring on every card shows what is actually revised",
      "Zoom out for the whole lesson, zoom in to work",
    ],
  },
  {
    id: "chat",
    eyebrow: "Learn mode",
    title: "Click a card, open a tutor that knows the topic",
    body: "Opening a card starts a chat scoped to that topic alone. It already has the syllabus wording and your notes, so it explains at the depth your course expects instead of the depth the internet defaults to.",
    points: [
      "Conversation scoped to one topic per card",
      "Answers grounded in the lesson you shared",
      "Ask for a summary, a worked example or a quick quiz",
      "History stays on the card, so you can come back mid-topic",
    ],
  },
  {
    id: "videos",
    eyebrow: "Video shelf",
    title: "The YouTube explainers for that exact topic",
    body: "Every card has a video tab with lectures and explainers matched to the topic. You watch inside the card and mark what helped, so the shelf gets sharper the more the space is used.",
    points: [
      "Videos matched per topic, not per lesson",
      "Watch inline without leaving the card",
      "Mark a video as helpful to pin it to the card",
      "Falls back to a search you can refine yourself",
    ],
  },
  {
    id: "progress",
    eyebrow: "Progress",
    title: "See what you have not touched yet",
    body: "The same grid of cards doubles as a progress view. Untouched topics stay dim, revised ones light up. Before an exam you can see the gaps in one glance instead of guessing.",
    points: [
      "Per-topic revision state on the card",
      "Lesson-level completion across every topic",
      "Highlight everything untouched in one click",
      "Sort your topics by what is weakest",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <GridBackdrop />
        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Features
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Everything a revision session needs, on one surface
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
              Dock is not a chatbot with a memory bolted on. It is a workspace shaped
              like your lesson, where every topic is a place you can return to.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-6">
        {sections.map((section, i) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 border-b border-border py-16 last:border-0 sm:py-20"
          >
            <div className="grid gap-10 md:grid-cols-12 md:gap-16">
              <div className="md:col-span-5">
                <p className="font-mono text-xs text-muted">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted">
                  {section.eyebrow}
                </p>
                <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                  {section.title}
                </h2>
              </div>

              <div className="md:col-span-7">
                <p className="text-pretty leading-relaxed text-muted">
                  {section.body}
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {section.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="mt-0.5 h-4 w-4 shrink-0 fill-current text-accent"
                        aria-hidden
                      >
                        <path d="M9.6 16.6 5 12l1.4-1.4 3.2 3.2 8-8L19 7.2l-9.4 9.4Z" />
                      </svg>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="border-t border-border bg-subtle">
        <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight">
            Try it on the lesson you are behind on
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted">
            Creating a space takes a minute. Bring one lesson and watch the cards
            fill in.
          </p>
          <Link
            href="/register"
            className={buttonStyles("primary", "mt-8")}
          >
            Create a space
          </Link>
        </div>
      </section>
    </>
  );
}
