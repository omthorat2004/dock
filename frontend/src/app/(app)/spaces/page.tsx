import type { Metadata } from "next";
import { CreateSpaceButton } from "@/components/spaces/create-space-button";
import { SpaceList } from "@/components/spaces/space-list";

export const metadata: Metadata = {
  title: "Spaces",
};

export default function SpacesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Spaces</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            A space holds one lesson, the syllabus section it covers, and the
            topic cards on its canvas.
          </p>
        </div>
        <CreateSpaceButton />
      </div>

      <div className="mt-8">
        <SpaceList />
      </div>
    </div>
  );
}
