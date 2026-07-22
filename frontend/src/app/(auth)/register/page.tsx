import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a Dock account and start your first revision space.",
};

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted">
          Free while in early access. Your first space takes a minute.
        </p>
      </div>

      <RegisterForm />

      <p className="text-center text-xs leading-relaxed text-muted">
        By creating an account you agree to our terms and privacy policy.
      </p>
    </div>
  );
}
