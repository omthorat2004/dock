"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { setSessionExpiredHandler } from "@/lib/axios.config";
import { useAuthStore } from "@/lib/auth-store";

export function Providers({ children }: { children: React.ReactNode }) {
  // Not useState/useMemo: getQueryClient already returns a per-request client on
  // the server and a singleton in the browser.
  const queryClient = getQueryClient();

  // When a refresh fails anywhere in the app, the axios interceptor calls
  // this, on a microtask, so the request that failed has already settled.
  //
  // It records the fact and drops the cached data, but it does **not** route.
  // A failed refresh means "nobody is signed in", which on a marketing page is
  // an ordinary visitor rather than an expired session, and this provider
  // wraps every route: redirecting here sent logged-out readers of `/` and
  // `/features` to the login page. Sending someone to `/login` is
  // `ProtectedProvider`'s job, and it reads this same store, so an expiry on a
  // guarded page still bounces.
  //
  // Only *inactive* queries go. A query with a live observer that is removed
  // is immediately re-created and refetched, straight into the same 401 that
  // got us here; scoping the removal is what keeps that from looping. What is
  // still on screen belongs to a page that is about to unmount anyway, and
  // signing in again empties the rest before it can be read.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      useAuthStore.getState().setUnauthenticated();
      queryClient.removeQueries({ type: "inactive" });
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
