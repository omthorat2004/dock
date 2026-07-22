import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonStyles } from "@/components/ui/button";

const nav = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
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
          <Link href="/login" className={buttonStyles("ghost", "px-3 py-2")}>
            Log in
          </Link>
          <Link href="/register" className={buttonStyles("primary", "px-3.5 py-2")}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
