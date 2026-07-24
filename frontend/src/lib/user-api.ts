import { api } from "@/lib/axios.config";

export type MessageResponse = { message: string };

export type ApiKeyConfig = {
  apiKey: string;
  modelVersion: string;
};

/** User profile + AI-provider configuration calls. One place per endpoint. */
export const userApi = {
  async setApiKey({ apiKey, modelVersion }: ApiKeyConfig): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>("/users/api-key", {
      api_key: apiKey,
      model_version: modelVersion,
    });
    return data;
  },

  async removeApiKey(): Promise<MessageResponse> {
    const { data } = await api.delete<MessageResponse>("/users/api-key");
    return data;
  },
};
