"use client";

import { ApiKeyCard } from "@/components/settings/api-key-card";

/**
 * Where a user configures the AI provider key. Lives under `(app)`, so
 * `ProtectedProvider` gates it — no per-page auth check needed.
 */
export default function ApiKeyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">API key</h1>
        <p className="mt-2 text-sm text-muted">
          Connect a model so your spaces can explain topics and answer questions.
        </p>
      </header>

      <div className="mt-8">
        <ApiKeyCard />
      </div>
    </div>
  );
}
