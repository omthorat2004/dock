import { api } from "@/lib/axios.config";
import type { YoutubeLink } from "@/lib/space-api";

/**
 * One generate is several round trips on the server — the model runs YouTube
 * searches through a tool before it picks — so it gets a longer leash than the
 * instance default, which is sized for ordinary CRUD.
 */
const GENERATE_TIMEOUT_MS = 60_000;

export type GenerateVideosResponse = {
  /**
   * Just the links this call added. Can be empty even on success: the searches
   * may only turn up videos the topic already holds.
   */
  added: YoutubeLink[];
  /** The whole shelf after this call — what the card renders. */
  links: YoutubeLink[];
  limit_reached: boolean;
  remaining: number;
};

/** The video shelf's one call. */
export const videosApi = {
  async generate(
    spaceId: string,
    topicId: string,
  ): Promise<GenerateVideosResponse> {
    const { data } = await api.post<GenerateVideosResponse>(
      `/spaces/${spaceId}/topics/${topicId}/videos`,
      null,
      { timeout: GENERATE_TIMEOUT_MS },
    );
    return data;
  },
};
