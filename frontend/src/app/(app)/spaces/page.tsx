import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Spaces",
};

export default function SpacesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Spaces</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        A space holds one lesson, the syllabus section it covers, and the topic
        cards on its canvas. Creating one is the next thing being built.
      </p>

      <div className="mt-8 rounded-xl border border-dashed border-border bg-subtle p-10 text-center">
        <p className="text-sm font-medium">No spaces yet</p>
        <Link
          href="/dashboard"
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
