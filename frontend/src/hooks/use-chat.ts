"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { spaceKeys } from "@/hooks/use-spaces";
import type { ApiError } from "@/lib/axios.config";
import {
  type ChatHistory,
  type ChatMessage,
  type ChatReply,
  chatApi,
} from "@/lib/chat-api";
import { ERROR_CODES } from "@/lib/constants";

export const chatKeys = {
  all: ["chat"] as const,
  topic: (spaceId: string, topicId: string) =>
    ["chat", spaceId, topicId] as const,
};

/**
 * One topic's conversation.
 *
 * Only fetched while the panel is open — a canvas of twenty topics must not
 * pull twenty transcripts, which is the same reason only the open card mounts
 * its chat at all.
 */
export function useChatHistory(
  spaceId: string,
  topicId: string | null,
) {
  return useQuery<ChatHistory, ApiError>({
    queryKey: chatKeys.topic(spaceId, topicId ?? ""),
    queryFn: () => chatApi.history(spaceId, topicId as string),
    enabled: topicId !== null,
  });
}

export function useSendMessage(spaceId: string, topicId: string) {
  const queryClient = useQueryClient();
  const key = chatKeys.topic(spaceId, topicId);

  return useMutation<ChatReply, ApiError, string, { previous?: ChatHistory }>({
    mutationFn: (message) => chatApi.send(spaceId, topicId, message),

    // Show the student's own message straight away. Waiting for the round trip
    // to echo back what they just typed makes the panel feel broken.
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ChatHistory>(key);

      const pending: ChatMessage = {
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<ChatHistory>(key, (current) => ({
        session_id: current?.session_id ?? null,
        limit_reached: current?.limit_reached ?? false,
        messages: [...(current?.messages ?? []), pending],
      }));

      return { previous };
    },

    onSuccess: (reply) => {
      queryClient.setQueryData<ChatHistory>(key, (current) => ({
        session_id: reply.session_id,
        limit_reached: current?.limit_reached ?? false,
        messages: [...(current?.messages ?? []), reply.reply],
      }));
      // The first message mints the session, so the space's own copy of the
      // topic is now stale.
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(spaceId) });
    },

    onError: (error, _message, context) => {
      // Put the transcript back — the message was never stored, so leaving it
      // on screen would claim it was.
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }

      // The session is now closed server-side. Refetch both so the panel and
      // the card agree, rather than each guessing from the error.
      if (error.code === ERROR_CODES.tokenLimitReached) {
        queryClient.invalidateQueries({ queryKey: key });
        queryClient.invalidateQueries({ queryKey: spaceKeys.detail(spaceId) });
      }
    },
  });
}
