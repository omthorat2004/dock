"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios.config";

type Health = { status: string; environment: string };

/**
 * Live backend status. This is genuine client state — it changes without a
 * navigation — so it belongs in TanStack Query rather than a server component.
 */
export function ApiStatus() {
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.get<Health>("/health")).data,
    refetchInterval: 60_000,
  });

  const dotClass = isPending
    ? "bg-muted"
    : isError
      ? "bg-danger"
      : "bg-success";

  const label = isPending
    ? "Checking the API…"
    : isError
      ? "API unreachable"
      : `API healthy · ${data?.environment}`;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2.5 text-sm">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
        <span className={isError ? "text-danger" : "text-muted"}>{label}</span>
      </div>
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-60"
      >
        {isFetching ? "Checking…" : "Refresh"}
      </button>
    </div>
  );
}
