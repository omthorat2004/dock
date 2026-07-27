import { api } from "@/lib/axios.config";
import type { YoutubeLink } from "@/lib/space-api";

export type GenerateVideosResponse = {
  /**
   * Just the links this call added. Can be empty even on success: the server
   * checks every suggestion against YouTube and drops the ones that resolve to
   * nothing, so a request can legitimately find no new videos.
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
    );
    return data;
  },
};
