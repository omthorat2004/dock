/**
 * Where each topic card sits on the canvas, relative to the lesson at (0, 0).
 *
 * Derived, not stored. A persisted per-space layout is the next step for the
 * canvas; until it exists, a deterministic ring keeps the arrangement stable
 * across loads (the same space always draws the same way) without inventing
 * coordinates on the server that the student cannot yet move.
 */

/** Cards per ring. Past this the ring reads as a crowd rather than a circle. */
const PER_RING = 8;
const FIRST_RADIUS = 400;
const RING_GAP = 320;

/**
 * Rings are flattened into ellipses because a canvas viewport is wider than it
 * is tall; a true circle wastes the horizontal space and overflows vertically.
 */
const VERTICAL_SQUASH = 0.62;

export type Point = { x: number; y: number };

export function topicPosition(index: number, total: number): Point {
  const ring = Math.floor(index / PER_RING);
  const positionInRing = index % PER_RING;
  const countInRing = Math.min(PER_RING, total - ring * PER_RING);

  // Start at twelve o'clock and go clockwise, so a two-topic space reads top
  // and bottom rather than as an arbitrary diagonal.
  const angle = (positionInRing / countInRing) * Math.PI * 2 - Math.PI / 2;
  const radius = FIRST_RADIUS + ring * RING_GAP;

  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius * VERTICAL_SQUASH),
  };
}
