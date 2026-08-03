/**
 * The lesson at the centre of its canvas: what the whole space is about.
 *
 * Sits at (0, 0) so it is the thing you land on, and the topic cards read as
 * belonging to it. Deliberately the one accent-tinted surface on the canvas;
 * everything around it stays neutral.
 */
export function LessonNode({
  lessonName,
  topicCount,
}: {
  lessonName: string;
  topicCount: number;
}) {
  return (
    <div
      data-canvas-card
      className="w-[340px] rounded-xl border border-accent/30 bg-accent-subtle px-7 py-6 text-center shadow-sm"
    >
      <p className="font-mono text-xs uppercase tracking-widest text-muted">Lesson</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
        {lessonName}
      </h2>
      <p className="mt-4 border-t border-accent/20 pt-3 text-xs text-muted">
        {topicCount} topics to revise
      </p>
    </div>
  );
}
