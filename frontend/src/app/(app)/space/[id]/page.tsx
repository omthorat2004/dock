import type { Metadata } from "next";
import { SpaceDetail } from "@/components/space/space-detail";
import { DEMO_SPACE } from "@/lib/demo-space";

export const metadata: Metadata = {
  title: "Space",
};

/**
 * A space's canvas.
 *
 * The `id` segment is `lesson-name-<id>`; `spaceIdFromSlug` pulls the id back
 * out of it. Nothing is fetched yet — the canvas renders `DEMO_SPACE` so the
 * UI can be built and looked at ahead of the API. Swapping in the real space
 * is this component's job alone; nothing below it changes.
 */
export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Awaited because request APIs and params are async-only in Next 16.
  await params;

  return <SpaceDetail space={DEMO_SPACE} />;
}
