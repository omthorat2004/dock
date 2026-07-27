import { api } from "@/lib/axios.config";

/**
 * Who said it, in the model's own vocabulary — which is how the backend stores
 * a transcript, so it can be replayed into a prompt with nothing to translate.
 * Turning these into "You" and "Dock" is the panel's job.
 */
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  created_at: string;
};

export type ChatHistory = {
  /** Null for a topic nobody has chatted to yet — most cards on a canvas. */
  session_id: string | null;
  limit_reached: boolean;
  messages: ChatMessage[];
};

export type ChatReply = {
  session_id: string;
  reply: ChatMessage;
  limit_reached: boolean;
};

/** Learn mode's calls. One place per endpoint. */
export const chatApi = {
  async history(spaceId: string, topicId: string): Promise<ChatHistory> {
    const { data } = await api.get<ChatHistory>(
      `/spaces/${spaceId}/topics/${topicId}/chat`,
    );
    return data;
  },

  async send(
    spaceId: string,
    topicId: string,
    message: string,
  ): Promise<ChatReply> {
    const { data } = await api.post<ChatReply>(
      `/spaces/${spaceId}/topics/${topicId}/chat`,
      { message },
    );
    return data;
  },
};
