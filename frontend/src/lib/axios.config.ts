import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const REFRESH_PATH = "/auth/refresh";

/** Endpoints that must never trigger a refresh — they *are* the auth flow. */
const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/logout", REFRESH_PATH];

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type ApiErrorBody = { code?: string; detail?: string };

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * The global axios instance. Everything that talks to FastAPI goes through it.
 *
 * There is no token handling here on purpose: the backend issues httpOnly
 * cookies, which the browser attaches itself. `withCredentials` is what makes
 * that happen cross-origin, and it is why the API's CORS config names this
 * origin explicitly rather than using `*`.
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

// While one refresh is in flight, every other 401 waits on the same promise.
// Without this, parallel requests would each rotate the token and invalidate
// each other — the backend revokes a refresh token the moment it is used.
let refreshInFlight: Promise<void> | null = null;

/** Called when refreshing fails, so the app can send the user to /login. */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

function refreshSession(): Promise<void> {
  refreshInFlight ??= axios
    .post(`${API_BASE_URL}${REFRESH_PATH}`, null, { withCredentials: true })
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  if (!error.response) {
    return new ApiError(
      0,
      "network_error",
      "Could not reach the server. Check your connection and try again.",
    );
  }

  const { status, data } = error.response;
  return new ApiError(
    status,
    data?.code ?? "request_failed",
    data?.detail ?? "Something went wrong. Please try again.",
  );
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isAuthCall = AUTH_PATHS.some((path) => config?.url?.includes(path));

    // Refresh only when: the call needs auth and got a 401, it is not itself an
    // auth call, and it has not already been retried once.
    const shouldRefresh =
      status === 401 && config !== undefined && !isAuthCall && !config._retry;

    if (shouldRefresh) {
      config._retry = true;
      try {
        await refreshSession();
        return await api.request(config);
      } catch {
        // The refresh itself failed — the session is genuinely over.
        onSessionExpired?.();
      }
    }

    return Promise.reject(toApiError(error));
  },
);
