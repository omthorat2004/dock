"use client";

import Link from "next/link";
import { useState } from "react";
import { Field } from "@/components/auth/field";
import { FormError } from "@/components/auth/form-error";
import { buttonStyles } from "@/components/ui/button";
import { useRegister } from "@/hooks/use-auth";
import {
  validateEmail,
  validateFullName,
  validatePassword,
  type FieldErrors,
} from "@/lib/validation";

export function RegisterForm() {
  const register = useRegister();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") ?? "");
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    const errors: FieldErrors = {};
    const nameError = validateFullName(fullName);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (nameError) errors.full_name = nameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    register.mutate({ full_name: fullName.trim(), email, password });
  }

  // A duplicate email belongs on the field, not in the form-level banner.
  const emailTaken = register.error?.status === 409;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormError message={emailTaken ? undefined : register.error?.message} />

      <Field
        label="Full name"
        name="full_name"
        autoComplete="name"
        placeholder="Ada Lovelace"
        error={fieldErrors.full_name}
      />

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@university.edu"
        error={fieldErrors.email ?? (emailTaken ? register.error?.message : undefined)}
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        error={fieldErrors.password}
        hint="At least 8 characters, with a letter and a number."
      />

      <button
        type="submit"
        disabled={register.isPending}
        aria-busy={register.isPending}
        className={buttonStyles("primary", "w-full")}
      >
        {register.isPending ? "Creating your space…" : "Create account"}
      </button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
