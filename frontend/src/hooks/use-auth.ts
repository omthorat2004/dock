"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  authApi,
  type AuthResponse,
  type LoginPayload,
  type RegisterPayload,
  type User,
} from "@/lib/auth-api";
import type { ApiError } from "@/lib/axios.config";
import { useAuthStore } from "@/lib/auth-store";

export const authKeys = {
  user: ["auth", "user"] as const,
};

/**
 * Fetches the signed-in user and reports whether there is a live session.
 *
 * `retry: false` matters here: a 401 is a legitimate answer ("nobody is signed
 * in"), not a transient failure worth retrying. The axios interceptor has
 * already tried to refresh before this settles, so an error means even the
 * refresh token is gone or expired — hence `isAuthenticated` is false.
 */
export function useUser(enabled = true) {
  const query = useQuery<User, ApiError>({
    queryKey: authKeys.user,
    queryFn: () => authApi.getUser(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  return {
    ...query,
    user: query.data,
    isAuthenticated: query.isSuccess,
  };
}

/**
 * Runs the user query and mirrors its result into the zustand auth store.
 *
 * Mount this once per guarded area (the auth and protected providers do). The
 * query is the source of truth; the store is the shared, synchronous read the
 * providers and chrome key off. `set` here is zustand, not React state, so this
 * effect is a store write — not the setState-in-render the compiler rejects.
 */
export function useAuthSync() {
  const query = useUser();
  const setUser = useAuthStore((s) => s.setUser);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const setLoading = useAuthStore((s) => s.setLoading);

  const { data, isSuccess, isError } = query;

  useEffect(() => {
    if (isSuccess && data) setUser(data);
    else if (isError) setUnauthenticated();
    else setLoading();
  }, [isSuccess, isError, data, setUser, setUnauthenticated, setLoading]);

  return query;
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<AuthResponse, ApiError, LoginPayload>({
    mutationFn: (payload) => authApi.login(payload),
    // The response carries the user, so seed the cache directly instead of
    // forcing a follow-up /auth/me round-trip.
    onSuccess: ({ user }) => {
      queryClient.setQueryData(authKeys.user, user);
      router.replace("/dashboard");
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<AuthResponse, ApiError, RegisterPayload>({
    mutationFn: (payload) => authApi.register(payload),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(authKeys.user, user);
      router.replace("/dashboard");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, ApiError>({
    mutationFn: () => authApi.logout(),
    // Runs whether or not the revoke call succeeded: the user asked to leave,
    // so neither the query cache nor the auth store may keep their data around.
    onSettled: () => {
      queryClient.clear();
      useAuthStore.getState().setUnauthenticated();
      router.replace("/login");
    },
  });
}
