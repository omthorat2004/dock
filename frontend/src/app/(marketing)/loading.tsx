export default function MarketingLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-24">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div aria-hidden className="mx-auto max-w-3xl space-y-4 text-center">
        <div className="skeleton mx-auto h-12 w-full max-w-2xl" />
        <div className="skeleton mx-auto h-5 w-full max-w-xl" />
        <div className="skeleton mx-auto h-11 w-56" />
      </div>
      <div aria-hidden className="skeleton mt-16 aspect-[16/10] w-full" />
    </div>
  );
}
