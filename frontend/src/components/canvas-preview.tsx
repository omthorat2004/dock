type Card = {
  title: string;
  unit: string;
  progress: number;
  videos: number;
  active?: boolean;
  className: string;
};

/**
 * A static, non-interactive mock of the space canvas, used to show the shape of
 * the product on marketing pages. The real canvas ships behind auth and reuses
 * the same `.grid-surface` token.
 */
const cards: Card[] = [
  {
    title: "Functional dependencies",
    unit: "Syllabus 2.1",
    progress: 100,
    videos: 4,
    className: "left-[5%] top-[10%] w-60",
  },
  {
    title: "1NF and 2NF",
    unit: "Syllabus 2.2",
    progress: 72,
    videos: 6,
    active: true,
    className: "left-[38%] top-[6%] w-56",
  },
  {
    title: "Third normal form",
    unit: "Syllabus 2.3",
    progress: 30,
    videos: 5,
    className: "right-[5%] top-[20%] w-56",
  },
  {
    title: "BCNF",
    unit: "Syllabus 2.3",
    progress: 0,
    videos: 9,
    className: "left-[14%] bottom-[8%] w-56",
  },
  {
    title: "Lossless decomposition",
    unit: "Syllabus 2.4",
    progress: 0,
    videos: 3,
    className: "right-[16%] bottom-[10%] w-56",
  },
];

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8ZM10.2 15V9l5 3-5 3Z" />
    </svg>
  );
}

function TopicCard({ card }: { card: Card }) {
  const done = card.progress === 100;

  return (
    <article
      className={`absolute rounded-xl border bg-surface p-4 shadow-sm ${
        card.active ? "border-accent" : "border-border"
      } ${card.className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
        {card.unit}
      </p>
      <h3 className="mt-1.5 text-sm font-semibold leading-snug">{card.title}</h3>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-subtle">
        <div
          className={`h-full rounded-full ${done ? "bg-success" : "bg-accent"}`}
          style={{ width: `${card.progress}%` }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
        <span>{done ? "Revised" : `${card.progress}% revised`}</span>
        <span className="flex items-center gap-1">
          <YouTubeIcon />
          {card.videos}
        </span>
      </div>
    </article>
  );
}

export function CanvasPreview() {
  return (
    <div
      role="img"
      aria-label="A Dock space for one lesson on normalisation: its topics laid out as cards on a grid canvas, each showing revision progress and the number of videos available."
      className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm"
    >
      <div aria-hidden className="absolute inset-0 grid-surface" />

      {/* Canvas chrome */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">Lesson 4 · Normalisation</span>
          <span className="text-muted">7 topics</span>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          {["Chat", "Videos", "Notes"].map((tab, i) => (
            <span
              key={tab}
              className={`rounded-md px-2 py-1 text-[11px] ${
                i === 0
                  ? "bg-accent-subtle font-medium text-accent"
                  : "text-muted"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>

      <div aria-hidden className="absolute inset-0 pt-12">
        <div className="relative h-full w-full">
          {cards.map((card) => (
            <TopicCard key={card.title} card={card} />
          ))}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent"
      />
    </div>
  );
}
