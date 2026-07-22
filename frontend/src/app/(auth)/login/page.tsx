import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Dock spaces.",
};

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted">
          Sign in to pick up your canvas where you left it.
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
