"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonStyles } from "@/components/ui/button";

/**
 * Global error boundary. Next.js renders this for any uncaught error in a route
 * below it — the user gets a real page instead of a blank screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Swap for a real reporter (Sentry et al.) when one exists.
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex flex-1 items-center justify-center px-6 py-24">
      <div aria-hidden className="absolute inset-0 -z-10 grid-surface grid-fade" />

      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Error
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The page could not be loaded. Trying again usually works; if it does
          not, the API may be down.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className={buttonStyles("primary")}
          >
            Try again
          </button>
          <Link href="/" className={buttonStyles("secondary")}>
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
