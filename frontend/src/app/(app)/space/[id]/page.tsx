import type { Metadata } from "next";
import { SpaceDetail } from "@/components/space/space-detail";
import { spaceIdFromSlug } from "@/lib/space-url";

export const metadata: Metadata = {
  title: "Space",
};

/**
 * A space's canvas.
 *
 * The `id` segment is `lesson-name-<id>`; `spaceIdFromSlug` pulls the id back
 * out of it. The space itself is fetched in `SpaceDetail` — the browser calls
 * FastAPI directly, so there is nothing to load here.
 */
export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Awaited because request APIs and params are async-only in Next 16.
  const { id } = await params;

  return <SpaceDetail spaceId={spaceIdFromSlug(id)} />;
}
