"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/lib/axios.config";
import {
  type CreateSpacePayload,
  type SpaceSummary,
  spacesApi,
} from "@/lib/space-api";

export const spaceKeys = {
  all: ["spaces"] as const,
  list: ["spaces", "list"] as const,
};

/** Every space the signed-in user owns, newest activity first. */
export function useSpaces() {
  return useQuery<SpaceSummary[], ApiError>({
    queryKey: spaceKeys.list,
    queryFn: () => spacesApi.list(),
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation<SpaceSummary, ApiError, CreateSpacePayload>({
    mutationFn: (payload) => spacesApi.create(payload),
    onSuccess: (space) => {
      // The response is exactly a card's worth of data, so the new space can
      // go straight into the list; the invalidate then reconciles the order
      // with the server rather than the UI guessing it.
      queryClient.setQueryData<SpaceSummary[]>(spaceKeys.list, (current) =>
        current ? [space, ...current] : [space],
      );
      queryClient.invalidateQueries({ queryKey: spaceKeys.list });
    },
  });
}
