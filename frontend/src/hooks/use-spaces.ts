"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/lib/axios.config";
import {
  type CreateSpacePayload,
  type SpaceDetail,
  type SpaceSummary,
  type SuggestTopicsPayload,
  spacesApi,
} from "@/lib/space-api";

export const spaceKeys = {
  all: ["spaces"] as const,
  list: ["spaces", "list"] as const,
  detail: (spaceId: string) => ["spaces", "detail", spaceId] as const,
};

/**
 * One space in full: the canvas's own load, with every topic's video shelf
 * and chat state. Separate from the list query on purpose: the list is
 * summaries and must not be invalidated by a chat or a video generation.
 */
export function useSpace(spaceId: string) {
  return useQuery<SpaceDetail, ApiError>({
    queryKey: spaceKeys.detail(spaceId),
    queryFn: () => spacesApi.get(spaceId),
  });
}

/** Every space the signed-in user owns, newest activity first. */
export function useSpaces() {
  return useQuery<SpaceSummary[], ApiError>({
    queryKey: spaceKeys.list,
    queryFn: () => spacesApi.list(),
  });
}

/**
 * Topics the model suggests for a lesson, asked for from the create form.
 * A mutation rather than a query: it costs a model call, so it runs when the
 * student presses the button and never on its own.
 */
export function useSuggestTopics() {
  return useMutation<string[], ApiError, SuggestTopicsPayload>({
    mutationFn: (payload) => spacesApi.suggestTopics(payload),
  });
}

/** More topics for a space that already exists, from the model. */
export function useSuggestMoreTopics(spaceId: string) {
  return useMutation<string[], ApiError, void>({
    mutationFn: () => spacesApi.suggestMoreTopics(spaceId),
  });
}

/**
 * Add topics to an open space. The reply is the space in full, so it replaces
 * the detail cache outright and the canvas draws the new cards without a
 * refetch; the list is invalidated because a card shows the topic count.
 */
export function useAddTopics(spaceId: string) {
  const queryClient = useQueryClient();

  return useMutation<SpaceDetail, ApiError, string[]>({
    mutationFn: (topics) => spacesApi.addTopics(spaceId, topics),
    onSuccess: (space) => {
      queryClient.setQueryData(spaceKeys.detail(spaceId), space);
      queryClient.invalidateQueries({ queryKey: spaceKeys.list });
    },
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
