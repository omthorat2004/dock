import { AppHeader } from "@/components/app-header";
import { ProtectedProvider } from "@/components/auth/protected-provider";

/**
 * Chrome for every signed-in surface. Auth is enforced here, once.
 *
 * Only the page is gated: the header sits outside `ProtectedProvider` so the
 * chrome shimmers in place while the session resolves rather than popping in
 * afterwards. It shows no user data until the gate has confirmed a session.
 *
 * The layout itself needs no hooks now that the header owns them, so it stays a
 * server component — only the guard and the header ship as client code.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <AppHeader />
      <ProtectedProvider>
        <main className="flex-1">{children}</main>
      </ProtectedProvider>
    </div>
  );
}
