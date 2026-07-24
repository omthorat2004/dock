"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/hooks/use-auth";
import type { ApiError } from "@/lib/axios.config";
import { type ApiKeyConfig, userApi } from "@/lib/user-api";

/**
 * Store, then remove, the caller's provider API key.
 *
 * Both invalidate the user query so `has_api_key` (and the "configured" UI that
 * keys off it) refresh from the server rather than being guessed locally.
 */
export function useSetApiKey() {
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, ApiKeyConfig>({
    mutationFn: (config) => userApi.setApiKey(config),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authKeys.user }),
  });
}

export function useRemoveApiKey() {
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError>({
    mutationFn: () => userApi.removeApiKey(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authKeys.user }),
  });
}
