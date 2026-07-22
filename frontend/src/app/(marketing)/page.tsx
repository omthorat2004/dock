import Link from "next/link";
import { GridBackdrop } from "@/components/grid-backdrop";
import { CanvasPreview } from "@/components/canvas-preview";
import { buttonStyles } from "@/components/ui/button";

const steps = [
  {
    step: "01",
    title: "Create a space",
    body: "One space per lesson. Name it, and that is your canvas.",
  },
  {
    step: "02",
    title: "Share the lesson and syllabus",
    body: "Share the lesson and the syllabus section it covers. The space reads both and keeps them.",
  },
  {
    step: "03",
    title: "Get your topic cards",
    body: "Every topic in the lesson becomes a card on the grid, so the whole lesson is visible at once.",
  },
  {
    step: "04",
    title: "Open a card and revise",
    body: "Click any card for a tutor that already knows the scope, or jump to the videos for that exact topic.",
  },
];

const highlights = [
  {
    title: "It knows your syllabus",
    body: "Answers stay inside the scope you shared, at the depth your course expects — not the depth the internet defaults to.",
    icon: <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-13Zm2.5 12.5H18v-2H6.5a.5.5 0 0 0 0 1v1Z" />,
  },
  {
    title: "The whole lesson, one screen",
    body: "A grid canvas beats a folder tree. Arrange the lesson's topics and see at a glance what you have not touched yet.",
    icon: <path d="M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z" />,
  },
  {
    title: "Chat that stays on topic",
    body: "Open a card and the conversation is scoped to that topic alone, with your own notes as the source of truth.",
    icon: <path d="M2 5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H9l-5 4v-4a2 2 0 0 1-2-2V5Z" />,
  },
  {
    title: "Videos, already filtered",
    body: "Each card carries the explainers for that topic, so you stop losing twenty minutes to the search bar.",
    icon: <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8ZM10.2 15V9l5 3-5 3Z" />,
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <GridBackdrop />
        <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted transition-colors hover:text-foreground"
            >
              Syllabus-aware revision spaces
              <span aria-hidden>→</span>
            </Link>

            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Revise on a canvas that remembers your syllabus
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
              Create a space for the lesson you are revising and share the
              syllabus it covers. Dock turns it into topic cards on a grid — click
              one to learn it in chat, or watch the videos picked for it.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className={buttonStyles("primary", "w-full sm:w-auto")}
              >
                Create your first space
              </Link>
              <Link
                href="/features"
                className={buttonStyles("secondary", "w-full sm:w-auto")}
              >
                See how it works
              </Link>
            </div>

            <p className="mt-4 text-xs text-muted">
              Free while in early access. No card required.
            </p>
          </div>

          <div className="mt-16">
            <CanvasPreview />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-border bg-subtle">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 md:grid-cols-2 md:items-center md:gap-16">
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Revision breaks down because your material is scattered
          </h2>
          <div className="space-y-4 leading-relaxed text-muted">
            <p>
              The syllabus lives in one place, the lesson in another, and the
              good lecture is somewhere in a playlist of forty. A general
              chatbot helps for one question, then forgets what your course
              covers.
            </p>
            <p className="text-foreground">
              A Dock space holds all of it in one place and stays scoped to it,
              so every session picks up where the last one stopped.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            How it works
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From one lesson to a working canvas
          </h2>
        </div>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.step} className="bg-surface p-6">
              <span className="font-mono text-xs text-muted">{s.step}</span>
              <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Highlights */}
      <section className="border-t border-border bg-subtle">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Why a space, not a chat
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for the way a lesson is actually structured
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {highlights.map((h) => (
              <div
                key={h.title}
                className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-muted/40"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-subtle text-accent">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                    {h.icon}
                  </svg>
                </span>
                <h3 className="mt-4 text-base font-semibold">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{h.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link
              href="/features"
              className="text-sm font-medium text-accent hover:underline"
            >
              See every feature →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border">
        <GridBackdrop />
        <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Put your next exam on a canvas
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted">
            Create a space, add the syllabus, and start with the topic you have
            been avoiding.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={buttonStyles("primary", "w-full sm:w-auto")}
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className={buttonStyles("secondary", "w-full sm:w-auto")}
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
