import Link from "next/link";
import { Logo } from "@/components/logo";

const proof = [
  "Syllabus and lesson notes stay in the space",
  "Topics laid out as cards on a grid canvas",
  "Chat and videos scoped to one topic at a time",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:grid lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-1 flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="rounded-md text-sm text-muted transition-colors hover:text-foreground"
          >
            ← Back home
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </main>

        <p className="text-center text-xs text-muted">
          © {new Date().getFullYear()} Dock
        </p>
      </div>

      {/* Context column */}
      <aside className="relative hidden overflow-hidden border-l border-border bg-subtle lg:block">
        <div aria-hidden className="absolute inset-0 grid-surface" />

        <div className="relative flex h-full flex-col justify-center px-14">
          <blockquote className="max-w-md text-balance text-2xl font-semibold leading-snug tracking-tight">
            “The syllabus was the one thing every tool ignored. So we made it the
            first thing a space learns.”
          </blockquote>

          <ul className="mt-10 space-y-3">
            {proof.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-muted">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 fill-current text-accent"
                  aria-hidden
                >
                  <path d="M9.6 16.6 5 12l1.4-1.4 3.2 3.2 8-8L19 7.2l-9.4 9.4Z" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
