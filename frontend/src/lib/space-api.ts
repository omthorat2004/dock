import { api } from "@/lib/axios.config";

/** How deep the student wants the lesson taken, chosen when the space is made. */
export type RevisionLevel = "beginner" | "intermediate" | "advanced";

export const LEVEL_LABELS: Record<RevisionLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * A space as a card shows it. The list endpoint never sends the topics
 * themselves, only how many there are, so this is the whole shape.
 */
export type SpaceSummary = {
  id: string;
  lesson_name: string;
  goal: string | null;
  level: RevisionLevel | null;
  topic_count: number;
  created_at: string;
  updated_at: string;
};

/** One video on a topic's shelf. Every one of these resolved to a real video. */
export type YoutubeLink = {
  video_id: string;
  title: string;
  url: string;
};

/**
 * A topic's chat state. `session_id` is null until the student first chats;
 * `limit_reached` says the conversation has outgrown the model's input budget,
 * which is what closes the composer without having to send to find out.
 */
export type TopicSession = {
  session_id: string | null;
  limit_reached: boolean;
};

export type Topic = {
  id: string;
  topic_name: string;
  youtube_links: YoutubeLink[];
  /** Computed by the server; the client never counts the shelf itself. */
  video_limit_reached: boolean;
  session: TopicSession;
};

/** One space in full: what opening its canvas loads. */
export type SpaceDetail = {
  id: string;
  lesson_name: string;
  goal: string | null;
  level: RevisionLevel | null;
  topics: Topic[];
  created_at: string;
  updated_at: string;
};

export type CreateSpacePayload = {
  lesson_name: string;
  /** What the student is revising for: "Interview", "Exam", or their own words. */
  goal: string;
  level: RevisionLevel;
  /** Topic names only. Videos and the chat session are server-owned. */
  topics: string[];
};

export type SuggestTopicsPayload = {
  lesson_name: string;
  goal: string;
  level: RevisionLevel;
  /** Already picked, so the model proposes others instead of repeating them. */
  topics: string[];
};

/**
 * The model's topic names out of one reply. The server hands back what the
 * model wrote, so the splitting and the tidying up happen here: one topic per
 * line, minus any numbering or bullet the model added anyway.
 */
export function splitSuggestedTopics(reply: string): string[] {
  const seen = new Set<string>();

  return reply
    .split(/\r?\n/)
    .flatMap((line) => (line.includes(",") ? line.split(",") : [line]))
    .map((line) => line.replace(/^\s*(?:[-*\u2022]|\d+[.)])\s*/, "").trim())
    .filter((topic) => {
      if (!topic || topic.length > 200 || seen.has(topic.toLowerCase())) return false;
      seen.add(topic.toLowerCase());
      return true;
    });
}

/** Every call to the FastAPI spaces routes lives here, one place per endpoint. */
export const spacesApi = {
  async create(payload: CreateSpacePayload): Promise<SpaceSummary> {
    const { data } = await api.post<SpaceSummary>("/spaces", payload);
    return data;
  },

  async suggestTopics(payload: SuggestTopicsPayload): Promise<string[]> {
    const { data } = await api.post<{ topics: string }>(
      "/spaces/topic-suggestions",
      payload,
    );
    return splitSuggestedTopics(data.topics);
  },

  async addTopics(spaceId: string, topics: string[]): Promise<SpaceDetail> {
    const { data } = await api.post<SpaceDetail>(`/spaces/${spaceId}/topics`, {
      topics,
    });
    return data;
  },

  async suggestMoreTopics(spaceId: string): Promise<string[]> {
    // No body: the space already holds the lesson, goal, level and what is on
    // the canvas, so the server reads all of it rather than being told twice.
    const { data } = await api.post<{ topics: string }>(
      `/spaces/${spaceId}/topic-suggestions`,
    );
    return splitSuggestedTopics(data.topics);
  },

  async list(): Promise<SpaceSummary[]> {
    const { data } = await api.get<SpaceSummary[]>("/spaces");
    return data;
  },

  async get(spaceId: string): Promise<SpaceDetail> {
    const { data } = await api.get<SpaceDetail>(`/spaces/${spaceId}`);
    return data;
  },
};
