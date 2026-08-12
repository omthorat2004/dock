"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonStyles } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth-store";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/spaces", label: "Spaces" },
  { href: "/api-key", label: "API key" },
];

/**
 * The signed-in header, the app's counterpart to the marketing `SiteHeader`.
 *
 * It renders alongside `ProtectedProvider` rather than inside it, so the chrome
 * is up while the session resolves instead of appearing after it. The gate is
 * what runs `useAuthSync`; this only reads the status it writes, and holds a
 * placeholder for the parts that need a user, the same trick `SiteHeader`
 * uses, so nothing shifts when the answer arrives.
 */
export function AppHeader() {
  const logout = useLogout();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const resolving = status !== "authenticated";

  // The nav collapses in here below `sm`, so the header stays one 4rem row at
  // every width — the space canvas sizes itself against that height.
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (!menu.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Logo href="/" />
          <nav aria-label="Application" className="hidden items-center gap-1 sm:flex">
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
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {resolving ? (
            <div aria-hidden className="skeleton hidden h-4 w-40 lg:block" />
          ) : (
            <span className="hidden max-w-[16rem] truncate text-sm text-muted lg:inline">
              {user?.email}
            </span>
          )}

          <ThemeToggle />

          {resolving ? (
            <div aria-hidden className="skeleton h-[30px] w-8 rounded-lg sm:w-20" />
          ) : (
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              // Labelled either way: below `sm` the icon is the only content,
              // so without this the button reads as nothing at all.
              aria-label={logout.isPending ? "Signing out…" : "Sign out"}
              className={buttonStyles("secondary", "h-8 px-2 text-xs sm:px-3")}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current sm:hidden"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  d="M15 17l5-5-5-5M20 12H9M12 4H6a2 2 0 00-2 2v12a2 2 0 002 2h6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden sm:inline">
                {logout.isPending ? "Signing out…" : "Sign out"}
              </span>
            </button>
          )}

          <div ref={menu} className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              aria-controls="app-menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current"
                strokeWidth={2}
                aria-hidden
              >
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>

            {menuOpen ? (
              <nav
                id="app-menu"
                aria-label="Application"
                className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-border bg-surface p-1 shadow-md"
              >
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-subtle hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
                {user?.email ? (
                  <p className="truncate border-t border-border px-3 pb-1 pt-2 text-xs text-muted">
                    {user.email}
                  </p>
                ) : null}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
