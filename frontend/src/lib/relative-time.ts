const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

type Division = {
  /** Use this division while the elapsed time is under `limit` seconds. */
  limit: number;
  /** How many seconds one of the unit is worth. */
  seconds: number;
  unit: Intl.RelativeTimeFormatUnit;
};

const DIVISIONS: Division[] = [
  { limit: MINUTE, seconds: 1, unit: "second" },
  { limit: HOUR, seconds: MINUTE, unit: "minute" },
  { limit: DAY, seconds: HOUR, unit: "hour" },
  { limit: WEEK, seconds: DAY, unit: "day" },
  { limit: MONTH, seconds: WEEK, unit: "week" },
  { limit: YEAR, seconds: MONTH, unit: "month" },
];

// `numeric: "always"` keeps it at "1 day ago" rather than "yesterday", so a
// column of timestamps reads consistently.
const relative = new Intl.RelativeTimeFormat("en", { numeric: "always" });
const absolute = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * How long ago a timestamp was, in words: "9 seconds ago", "23 minutes ago",
 * "3 days ago", "1 week ago", "2 months ago", "1 year ago".
 *
 * `Intl` does the wording and the plurals; the divisions above only decide
 * which unit to ask for. Pass `now` to make the result testable.
 */
export function formatRelativeTime(
  value: string | number | Date,
  now: number = Date.now(),
): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";

  // Clock skew between the API and the browser can put a just-created
  // timestamp a second or two in the future. Read that as now, not as
  // "in 2 seconds".
  const elapsed = Math.max(0, Math.round((now - time) / 1000));
  if (elapsed < 10) return "just now";

  for (const division of DIVISIONS) {
    if (elapsed < division.limit) {
      const count = Math.floor(elapsed / division.seconds);
      return relative.format(-count, division.unit);
    }
  }

  return relative.format(-Math.floor(elapsed / YEAR), "year");
}

/** A fixed date for things that are not about recency: "26 Jul 2026". */
export function formatDate(value: string | number | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return absolute.format(date);
}
