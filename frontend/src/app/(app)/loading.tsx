/**
 * Route-level loading UI. Next.js renders this automatically while the server
 * component below it streams — no client state, no spinner library.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <span className="sr-only" role="status">
        Loading
      </span>

      <div className="skeleton h-8 w-64" />
      <div className="skeleton mt-3 h-4 w-full max-w-lg" />

      <div className="mt-10 grid gap-4 sm:grid-cols-2" aria-hidden>
        <div className="skeleton h-[68px]" />
        <div className="skeleton h-[68px]" />
      </div>

      <div className="mt-10 space-y-4" aria-hidden>
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-40 w-full" />
      </div>
    </div>
  );
}
