import { api } from "@/lib/axios.config";

export type User = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  /** Whether the user has stored a provider API key. The key itself never leaves the API. */
  has_api_key: boolean;
  /** The model the user has selected, e.g. "gemini-3.6-flash". */
  model_version: string;
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

/**
 * What register/login/refresh return. The tokens are never in the body; they
 * arrive as httpOnly cookies, so all JavaScript sees is the message and user.
 */
export type AuthResponse = {
  message: string;
  user: User;
};

/** Every call to the FastAPI auth routes lives here, one place per endpoint. */
export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    // The response also sets the auth cookies; nothing is stored client-side.
    const { data } = await api.post<AuthResponse>("/auth/register", payload);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", payload);
    return data;
  },

  async logout(): Promise<void> {
    // Revokes the refresh token server-side and clears both cookies.
    await api.post("/auth/logout");
  },

  async getUser(): Promise<User> {

    const { data } = await api.get<User>("/auth/me");

    return data;
  },
};
