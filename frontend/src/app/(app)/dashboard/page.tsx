"use client";

import { ApiStatus } from "@/components/dashboard/api-status";
import { CreateSpaceButton } from "@/components/spaces/create-space-button";
import { SpaceList } from "@/components/spaces/space-list";
import { useUser } from "@/hooks/use-auth";

export default function DashboardPage() {
  // Already fetched and cached by the layout's guard — this is a cache read.
  const { user } = useUser();
  console.log(user)
  const firstName = user?.full_name.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Each space holds a lesson, the syllabus section it covers, and the
          topic cards on its canvas.
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
          <CreateSpaceButton className="px-3 py-1.5 text-xs" />
        </div>

        <div className="mt-4">
          <SpaceList />
        </div>
      </section>
    </div>
  );
}
