import { api } from "@/lib/axios.config";

export type User = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

/** Returned for reference only — the usable copy is in the httpOnly cookies. */
export type TokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
};

/** Every call to the FastAPI auth routes lives here — one place per endpoint. */
export const authApi = {
  async register(payload: RegisterPayload): Promise<TokenPair> {
    // The response also sets the auth cookies; nothing is stored client-side.
    const { data } = await api.post<TokenPair>("/auth/register", payload);
    return data;
  },

  async login(payload: LoginPayload): Promise<TokenPair> {
    const { data } = await api.post<TokenPair>("/auth/login", payload);
    return data;
  },

  async logout(): Promise<void> {
    // Revokes the refresh token server-side and clears both cookies.
    await api.post("/auth/logout");
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },
};
