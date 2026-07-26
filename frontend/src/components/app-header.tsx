"use client";

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
 * The signed-in header — the app's counterpart to the marketing `SiteHeader`.
 *
 * It renders alongside `ProtectedProvider` rather than inside it, so the chrome
 * is up while the session resolves instead of appearing after it. The gate is
 * what runs `useAuthSync`; this only reads the status it writes, and holds a
 * placeholder for the parts that need a user — the same trick `SiteHeader`
 * uses, so nothing shifts when the answer arrives.
 */
export function AppHeader() {
  const logout = useLogout();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const resolving = status !== "authenticated";

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Logo href="/dashboard" />
          <nav aria-label="Application" className="flex items-center gap-1">
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

        <div className="flex items-center gap-3">
          {resolving ? (
            <div aria-hidden className="skeleton hidden h-4 w-40 sm:block" />
          ) : (
            <span className="hidden text-sm text-muted sm:inline">{user?.email}</span>
          )}

          <ThemeToggle />

          {resolving ? (
            <div aria-hidden className="skeleton h-[30px] w-20 rounded-lg" />
          ) : (
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className={buttonStyles("secondary", "px-3 py-1.5 text-xs")}
            >
              {logout.isPending ? "Signing out…" : "Sign out"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
