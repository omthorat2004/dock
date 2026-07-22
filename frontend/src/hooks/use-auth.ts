"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi, type LoginPayload, type RegisterPayload, type User } from "@/lib/auth-api";
import type { ApiError } from "@/lib/axios.config";

export const authKeys = {
  me: ["auth", "me"] as const,
};

/**
 * The signed-in user, or an error when there is no session.
 *
 * `retry: false` matters here: a 401 is a legitimate answer ("nobody is signed
 * in"), not a transient failure worth retrying.
 */
export function useMe(enabled = true) {
  return useQuery<User, ApiError>({
    queryKey: authKeys.me,
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<unknown, ApiError, LoginPayload>({
    mutationFn: (payload) => authApi.login(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.me });
      router.replace("/dashboard");
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<unknown, ApiError, RegisterPayload>({
    mutationFn: (payload) => authApi.register(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.me });
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
    // so the local cache must not keep their data around either way.
    onSettled: () => {
      queryClient.clear();
      router.replace("/login");
    },
  });
}
