import type { Metadata } from "next";
import Link from "next/link";
import { GridBackdrop } from "@/components/grid-backdrop";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Dock exists: revision tools ignore the syllabus, and a flat chat window is the wrong shape for a lesson.",
};

const principles = [
  {
    title: "Scope before answers",
    body: "A tutor that does not know your syllabus will always teach the wrong amount. Everything in Dock starts from the material you actually have to cover.",
  },
  {
    title: "Space beats a scrollback",
    body: "A lesson is structured, not linear. A grid of cards keeps that structure visible instead of burying it in chat history.",
  },
  {
    title: "One surface, no tab hopping",
    body: "Notes, explanation and video for a topic belong in the same place. Every switch you avoid is attention you keep.",
  },
  {
    title: "Your layout is yours",
    body: "How you arrange your topics is part of how you understand them. Dock stores the arrangement, it does not reset it.",
  },
];

const timeline = [
  {
    phase: "Shipped",
    title: "Spaces and topic cards",
    body: "Accounts, then a space per lesson: share the lesson with its syllabus section and its topics come back as cards on the grid.",
  },
  {
    phase: "Shipped",
    title: "Learn mode and videos",
    body: "Per-card chat grounded in your material, on your own model key, plus the video shelf matched to that one topic.",
  },
  {
    phase: "Now",
    title: "Topics that read themselves",
    body: "Topics pulled out of the lesson text instead of typed in by hand, a layout that stays where you put it, and revision progress that means something.",
  },
  {
    phase: "Next",
    title: "Take the space with you",
    body: "Export a space to PDF for the night before, and turn the lesson text into a condensed revision sheet you can read in one sitting.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <GridBackdrop />
        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              About
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              We built the revision tool we kept failing to improvise
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
              Every exam season ends the same way: the syllabus in one tab, the
              lesson in another, a half-watched playlist in a third, and a chat
              window that has to be re-briefed every single time.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              The problem was never a shortage of material
            </h2>
          </div>
          <div className="space-y-5 leading-relaxed text-muted md:col-span-7">
            <p>
              There is more explanation available for any topic than anyone
              could watch. What is missing is a place that knows which of it
              matters for you — which unit a topic sits in, how deep your course
              goes, and what you have already covered.
            </p>
            <p>
              So we made the syllabus the first thing a space learns. Once it
              knows the scope, everything else can be arranged around it:
              cards for the topics, chat scoped per card, videos filtered per
              card, progress tracked per card.
            </p>
            <p className="text-foreground">
              The result is a space you open in week one and still open the
              night before the exam.
            </p>
          </div>
        </div>
      </section>

      <section id="principles" className="scroll-mt-24 border-y border-border bg-subtle">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Principles
          </p>
          <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Four rules we hold the product to
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {principles.map((p, i) => (
              <div key={p.title} className="rounded-xl border border-border bg-surface p-6">
                <span className="font-mono text-xs text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-base font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Where we are
        </p>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Built in the open, and still building
        </h2>

        <ol className="mt-12 space-y-px overflow-hidden rounded-xl border border-border bg-border">
          {timeline.map((t) => (
            <li key={t.title} className="grid gap-2 bg-surface p-6 sm:grid-cols-12 sm:gap-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted sm:col-span-2">
                {t.phase}
              </span>
              <h3 className="text-base font-semibold sm:col-span-3">{t.title}</h3>
              <p className="text-sm leading-relaxed text-muted sm:col-span-7">
                {t.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border bg-subtle">
        <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight">
            Come build Dock with us
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted">
            Early access is open. The people using it now shape what ships next.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={buttonStyles("primary", "w-full sm:w-auto")}
            >
              Create an account
            </Link>
            <Link
              href="/features"
              className={buttonStyles("secondary", "w-full sm:w-auto")}
            >
              Read the features
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
