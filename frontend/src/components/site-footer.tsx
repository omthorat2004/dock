import Link from "next/link";
import { Logo } from "@/components/logo";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/features#canvas", label: "The canvas" },
      { href: "/features#videos", label: "Video library" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/about#principles", label: "Principles" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Register" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-[24ch] text-sm text-muted">
            A canvas for revising what you actually have to learn.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
              {col.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Dock. All rights reserved.</p>
          <p>Built with Next.js and FastAPI.</p>
        </div>
      </div>
    </footer>
  );
}
