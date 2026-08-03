import { create } from "zustand";
import type { User } from "@/lib/auth-api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * Client-side auth state.
 *
 * The server remains the source of truth (`/auth/me` via TanStack Query), and
 * `useAuthSync` mirrors that query's result into this store. Components read the
 * store so the auth/protected providers and the app chrome all agree on one
 * status without each re-deriving it from the query.
 */
type AuthState = {
  user: User | null;
  status: AuthStatus;
  /** Convenience mirror of `status === "authenticated"`. */
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setUnauthenticated: () => void;
  setLoading: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  isAuthenticated: false,
  setUser: (user) =>
    set({ user, status: "authenticated", isAuthenticated: true }),
  setUnauthenticated: () =>
    set({ user: null, status: "unauthenticated", isAuthenticated: false }),
  setLoading: () => set({ status: "loading" }),
}));

/**
 * Subscribe to just the authenticated flag.
 *
 * Reads whatever `useAuthSync` last wrote, so a component using this must be
 * inside a subtree that runs the sync (the auth/protected providers, or the
 * marketing header); otherwise the store stays at its unauthenticated default.
 */
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
