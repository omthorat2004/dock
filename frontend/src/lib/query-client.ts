import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, an immediate refetch on the client throws away everything
        // the server just rendered. A short stale window avoids that.
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
          // Never retry auth or client errors — they will not fix themselves.
          const status = (error as { status?: number }).status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * One client per request on the server; one shared client in the browser.
 * Creating a client at module scope would leak one user's cache into another's
 * request on the server.
 */
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
