"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncStatus = "idle" | "pending" | "success" | "error";

export type AsyncState<T> = {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
  isIdle: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
};

export type UseAsyncResult<T, Args extends unknown[]> = AsyncState<T> & {
  /** Runs the async function and updates state. Never rejects. */
  run: (...args: Args) => Promise<T | null>;
  reset: () => void;
};

type Options = {
  /** Run once on mount with no arguments. Only valid for zero-arg functions. */
  immediate?: boolean;
};

/**
 * Client-side async state: status, data and error in one place, with stale and
 * unmounted results discarded.
 *
 * Use this for client-triggered work — polling, lazy panels, anything the user
 * kicks off after the page has loaded. It is *not* for initial page data: fetch
 * that in a server component, and let `loading.tsx` cover the wait.
 */
export function useAsync<T, Args extends unknown[] = []>(
  fn: (...args: Args) => Promise<T>,
  { immediate = false }: Options = {},
): UseAsyncResult<T, Args> {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const mounted = useRef(true);
  // Only the most recent call may write to state — protects against races when
  // calls resolve out of order.
  const callId = useRef(0);

  // Held in a ref so `run` stays stable even when the caller passes an inline
  // arrow function, which would otherwise re-fire every effect depending on it.
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args: Args): Promise<T | null> => {
    const id = ++callId.current;
    setStatus("pending");
    setError(null);

    try {
      const result = await fnRef.current(...args);
      if (!mounted.current || id !== callId.current) return null;
      setData(result);
      setStatus("success");
      return result;
    } catch (thrown) {
      if (!mounted.current || id !== callId.current) return null;
      setError(
        thrown instanceof Error ? thrown : new Error(String(thrown)),
      );
      setStatus("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    callId.current += 1;
    setStatus("idle");
    setData(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (immediate) void (run as () => Promise<T | null>)();
  }, [immediate, run]);

  return {
    status,
    data,
    error,
    isIdle: status === "idle",
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
    run,
    reset,
  };
}
