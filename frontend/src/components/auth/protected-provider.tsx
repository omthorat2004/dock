"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSync } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth-store";
import { AuthShimmer } from "@/components/auth/auth-shimmer";

/**
 * Gate for signed-in surfaces (`/dashboard`, `/api-key`, `/space/:id`).
 *
 * The session lives in httpOnly cookies, so only the API can confirm it. This
 * resolves it once, sends anyone unauthenticated to `/login`, and shows a
 * shimmer until the answer is in, never flashing the page to a user who will
 * bounce.
 */
export function ProtectedProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  useAuthSync();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === "unauthenticated"){

       router.replace("/login");
    }
    
  }, [status, router]);

  // Anything but a confirmed session shows the shimmer: `loading` while the
  // query is in flight, and `unauthenticated` while the redirect above runs.
  if (status !== "authenticated") return <AuthShimmer />;

  return <>{children}</>;
}
