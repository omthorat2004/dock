"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-auth";
import type { User } from "@/lib/auth-api";

/**
 * Gate for signed-in surfaces.
 *
 * The session lives in httpOnly cookies, so only the API can say whether it is
 * valid — this asks it once and redirects when the answer is no. It renders a
 * skeleton meanwhile rather than flashing the page to a user who will bounce.
 */
export function AuthGuard({
  children,
}: {
  children: (user: User) => React.ReactNode;
}) {
  const router = useRouter();
  const { data: user, isPending, isError } = useMe();

  useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (isPending || isError || !user) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <span className="sr-only" role="status">
          Loading
        </span>
        <div aria-hidden className="skeleton h-8 w-64" />
        <div aria-hidden className="skeleton mt-3 h-4 w-full max-w-lg" />
        <div aria-hidden className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="skeleton h-[68px]" />
          <div className="skeleton h-[68px]" />
        </div>
      </div>
    );
  }

  return <>{children(user)}</>;
}
