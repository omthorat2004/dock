import { api } from "@/lib/axios.config";

/**
 * A space as a card shows it. The list endpoint never sends the topics
 * themselves — only how many there are — so this is the whole shape.
 */
export type SpaceSummary = {
  id: string;
  lesson_name: string;
  topic_count: number;
  created_at: string;
  updated_at: string;
};

export type CreateSpacePayload = {
  lesson_name: string;
  /** Topic names only. Videos and the chat session are server-owned. */
  topics: string[];
};

/** Every call to the FastAPI spaces routes lives here — one place per endpoint. */
export const spacesApi = {
  async create(payload: CreateSpacePayload): Promise<SpaceSummary> {
    const { data } = await api.post<SpaceSummary>("/spaces", payload);
    return data;
  },

  async list(): Promise<SpaceSummary[]> {
    const { data } = await api.get<SpaceSummary[]>("/spaces");
    return data;
  },
};
