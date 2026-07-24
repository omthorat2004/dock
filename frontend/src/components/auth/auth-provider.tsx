"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSync } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth-store";
import { AuthShimmer } from "@/components/auth/auth-shimmer";

/**
 * Gate for the auth surfaces (`/login`, `/register`).
 *
 * The mirror image of `ProtectedProvider`: a user who already has a session has
 * no business on the login form, so send them to `/dashboard`. The form only
 * renders once the session is confirmed absent.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useAuthSync();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  // Show the shimmer while resolving, and while redirecting an already
  // signed-in user away. Only render the form once we know nobody is signed in.
  if (status !== "unauthenticated") return <AuthShimmer />;

  return <>{children}</>;
}
