import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex flex-1 items-center justify-center px-6 py-24">
      <div aria-hidden className="absolute inset-0 -z-10 grid-surface grid-fade" />

      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          404
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          That page is not on the canvas
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The link may be old, or the page may never have existed.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={buttonStyles("primary")}>
            Go home
          </Link>
          <Link href="/features" className={buttonStyles("secondary")}>
            See the features
          </Link>
        </div>
      </div>
    </div>
  );
}
