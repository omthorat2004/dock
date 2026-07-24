/**
 * Full-height placeholder shown while the session is being resolved, or while a
 * provider is about to redirect. Built from the `.skeleton` token like the rest
 * of the app's loading states, so it fades in and out consistently.
 */
export function AuthShimmer() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div aria-hidden className="skeleton h-8 w-64" />
      <div aria-hidden className="skeleton mt-3 h-4 w-full max-w-lg" />
      <div aria-hidden className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="skeleton h-[68px]" />
        <div className="skeleton h-[68px]" />
      </div>
    </div>
  );
}
