"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProtectedProvider } from "@/components/auth/protected-provider";
import { buttonStyles } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth-store";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/spaces", label: "Spaces" },
  { href: "/api-key", label: "API key" },
];

/** Chrome for every signed-in surface. Auth is enforced here, once. */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedProvider>
      <AppShell>{children}</AppShell>
    </ProtectedProvider>
  );
}

/**
 * The signed-in chrome. Rendered only once `ProtectedProvider` has confirmed a
 * session, so the store's `user` is populated by the time this reads it.
 */
function AppShell({ children }: { children: React.ReactNode }) {
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
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
            <span className="hidden text-sm text-muted sm:inline">
              {user?.email}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className={buttonStyles("secondary", "px-3 py-1.5 text-xs")}
            >
              {logout.isPending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
