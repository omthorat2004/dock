import { api } from "@/lib/axios.config";

export type MessageResponse = { message: string };

/** User profile + AI-provider configuration calls. One place per endpoint. */
export const userApi = {
  async setApiKey(apiKey: string): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>("/users/api-key", {
      api_key: apiKey,
    });
    return data;
  },

  async removeApiKey(): Promise<MessageResponse> {
    const { data } = await api.delete<MessageResponse>("/users/api-key");
    return data;
  },
};
