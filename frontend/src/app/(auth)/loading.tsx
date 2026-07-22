export default function AuthLoading() {
  return (
    <div className="space-y-8">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div aria-hidden className="space-y-2">
        <div className="skeleton h-7 w-48" />
        <div className="skeleton h-4 w-64" />
      </div>
      <div aria-hidden className="space-y-5">
        <div className="skeleton h-[70px]" />
        <div className="skeleton h-[70px]" />
        <div className="skeleton h-[42px]" />
      </div>
    </div>
  );
}
