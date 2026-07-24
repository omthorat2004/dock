"use client";

import { useState } from "react";
import { ApiStatus } from "@/components/dashboard/api-status";
import { CreateSpaceModal } from "@/components/spaces/create-space-modal";
import { buttonStyles } from "@/components/ui/button";
import { useUser } from "@/hooks/use-auth";

/**
 * Test dashboard. Deliberately a shell: it proves auth, the axios instance and
 * the query client work end to end, and it is where the real space list lands
 * once spaces ship.
 */
export default function DashboardPage() {
  // Already fetched and cached by the layout's guard — this is a cache read.
  const { user } = useUser();
  const firstName = user?.full_name.split(" ")[0] ?? "there";

  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Nothing to revise yet. Spaces are the next thing being built — each one
          holds a lesson, its syllabus section and the topic cards on its canvas.
        </p>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="System">
        <ApiStatus />
      </section>

      <section className="mt-10" aria-label="Your spaces">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
            Your spaces
          </h2>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={buttonStyles("primary", "px-3 py-1.5 text-xs")}
          >
            Create a space
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-border bg-subtle p-10 text-center">
          <p className="text-sm font-medium">No spaces yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Create a space — share a lesson and the syllabus section it covers —
            to start revising.
          </p>
        </div>
      </section>

      {/* TODO: pass onCreate to POST to the spaces API once it exists. The modal
          collects the lesson and its syllabus topics; nothing persists yet. */}
      <CreateSpaceModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
