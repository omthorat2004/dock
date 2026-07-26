import type { SpaceSummary } from "@/lib/space-api";

/**
 * A space's URL segment: the lesson name, then its id — `photosynthesis-6a66…`.
 *
 * The whole string is the route's `id` param. Only the trailing id is load
 * bearing; the lesson name is there so the URL reads as something, and it can
 * drift from the space's current name without breaking the link.
 */
export function spaceSlug(space: Pick<SpaceSummary, "id" | "lesson_name">): string {
  const name = slugify(space.lesson_name);
  return name ? `${name}-${space.id}` : space.id;
}

/** The id back out of a slug — everything after the last hyphen. */
export function spaceIdFromSlug(slug: string): string {
  return slug.slice(slug.lastIndexOf("-") + 1);
}

export function spaceHref(space: Pick<SpaceSummary, "id" | "lesson_name">): string {
  return `/space/${spaceSlug(space)}`;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    // Drop accents, so "Réaction" and "Reaction" produce the same segment.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
