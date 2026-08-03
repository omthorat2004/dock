"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonStyles } from "@/components/ui/button";
import { useAuthSync } from "@/hooks/use-auth";
import { useIsAuthenticated } from "@/lib/auth-store";
import { GITHUB_REPO_URL } from "@/lib/site";

const nav = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  // Resolve the session and mirror it into the store, so a signed-in visitor to
  // the marketing pages gets a Dashboard link instead of the sign-up CTA.
  // `isPending` is the /me lookup still in flight, so hold a placeholder until it
  // settles rather than flashing the wrong CTA and swapping it a moment later.
  const { isPending } = useAuthSync();
  const isAuthenticated = useIsAuthenticated();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Dock on GitHub"
            title="Dock on GitHub"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-subtle hover:text-foreground"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
          <ThemeToggle />
          {isPending ? (
            <div aria-hidden className="skeleton h-9 w-36 rounded-lg" />
          ) : isAuthenticated ? (
            <Link
              href="/dashboard"
              className={buttonStyles("primary", "px-3.5 py-2")}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonStyles("ghost", "px-3 py-2")}>
                Log in
              </Link>
              <Link
                href="/register"
                className={buttonStyles("primary", "px-3.5 py-2")}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
