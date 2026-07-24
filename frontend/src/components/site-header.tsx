"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonStyles } from "@/components/ui/button";
import { useAuthSync } from "@/hooks/use-auth";
import { useIsAuthenticated } from "@/lib/auth-store";

const nav = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  // Resolve the session and mirror it into the store, so a signed-in visitor to
  // the marketing pages gets a Dashboard link instead of the sign-up CTA.
  // `isPending` is the /me lookup still in flight — hold a placeholder until it
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
