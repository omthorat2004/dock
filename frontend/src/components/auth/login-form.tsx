"use client";

import Link from "next/link";
import { useState } from "react";
import { Field } from "@/components/auth/field";
import { FormError } from "@/components/auth/form-error";
import { buttonStyles } from "@/components/ui/button";
import { useLogin } from "@/hooks/use-auth";
import { validateEmail, type FieldErrors } from "@/lib/validation";

export function LoginForm() {
  const login = useLogin();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    const errors: FieldErrors = {};
    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;
    if (!password) errors.password = "Password is required.";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    login.mutate({ email, password });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormError
        message={
          login.error?.status === 401
            ? "That email and password do not match."
            : login.error?.message
        }
      />

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@university.edu"
        error={fieldErrors.email}
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={fieldErrors.password}
      />

      <button
        type="submit"
        disabled={login.isPending}
        aria-busy={login.isPending}
        className={buttonStyles("primary", "w-full")}
      >
        {login.isPending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Create a space
        </Link>
      </p>
    </form>
  );
}
