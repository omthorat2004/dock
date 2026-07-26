"use client";

import { SpaceCard } from "@/components/spaces/space-card";
import { useSpaces } from "@/hooks/use-spaces";

/**
 * The signed-in user's spaces. Client-side because the browser calls FastAPI
 * directly — there is no server-rendered copy of this list to hydrate.
 */
export function SpaceList() {
  const { data: spaces, isPending, isError, error } = useSpaces();

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="skeleton h-36 rounded-xl" />
        ))}
        <span className="sr-only">Loading your spaces…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger"
      >
        {error.message}
      </p>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-subtle p-10 text-center">
        <p className="text-sm font-medium">No spaces yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Create a space — share a lesson and the syllabus section it covers —
          to start revising.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {spaces.map((space) => (
        <li key={space.id}>
          <SpaceCard space={space} />
        </li>
      ))}
    </ul>
  );
}
