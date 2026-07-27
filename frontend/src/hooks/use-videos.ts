"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { spaceKeys } from "@/hooks/use-spaces";
import type { ApiError } from "@/lib/axios.config";
import type { SpaceDetail } from "@/lib/space-api";
import { type GenerateVideosResponse, videosApi } from "@/lib/video-api";

/**
 * Fill the next few videos into one topic's shelf.
 *
 * The response carries the shelf as it now stands, so it is written straight
 * into the space already in the cache rather than refetching the whole space
 * — every other topic on the canvas is unchanged, and a refetch would discard
 * and rebuild all of them to learn about one.
 */
export function useGenerateVideos(spaceId: string, topicId: string) {
  const queryClient = useQueryClient();

  return useMutation<GenerateVideosResponse, ApiError>({
    mutationFn: () => videosApi.generate(spaceId, topicId),
    onSuccess: (result) => {
      queryClient.setQueryData<SpaceDetail>(
        spaceKeys.detail(spaceId),
        (space) =>
          space
            ? {
                ...space,
                topics: space.topics.map((topic) =>
                  topic.id === topicId
                    ? {
                        ...topic,
                        youtube_links: result.links,
                        video_limit_reached: result.limit_reached,
                      }
                    : topic,
                ),
              }
            : space,
      );
    },
  });
}
