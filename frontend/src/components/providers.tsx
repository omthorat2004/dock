"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getQueryClient } from "@/lib/query-client";
import { setSessionExpiredHandler } from "@/lib/axios.config";

export function Providers({ children }: { children: React.ReactNode }) {
  // Not useState/useMemo: getQueryClient already returns a per-request client on
  // the server and a singleton in the browser.
  const queryClient = getQueryClient();
  const router = useRouter();

  // When a refresh fails anywhere in the app, the axios interceptor calls this.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear();
      router.replace("/login");
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
