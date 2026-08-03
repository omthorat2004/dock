"use client";

import { useState } from "react";
import { FormError } from "@/components/auth/form-error";
import { buttonStyles } from "@/components/ui/button";
import { useRemoveApiKey, useSetApiKey } from "@/hooks/use-api-key";
import { useUser } from "@/hooks/use-auth";
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS } from "@/lib/gemini-models";

export function ApiKeyCard() {
  const { user } = useUser();
  const setKey = useSetApiKey();
  const removeKey = useRemoveApiKey();

  const [value, setValue] = useState("");
  const [model, setModel] = useState(user?.model_version ?? DEFAULT_GEMINI_MODEL);
  const [reveal, setReveal] = useState(false);
  // What we have stored this session, so Save can go quiet until something
  // changes. We never echo the stored key back from the server, so after a
  // reload `lastSavedKey` is empty even when a key is configured.
  const [lastSavedKey, setLastSavedKey] = useState("");
  const [lastSavedModel, setLastSavedModel] = useState(
    user?.model_version ?? DEFAULT_GEMINI_MODEL,
  );

  const configured = user?.has_api_key ?? false;
  const trimmed = value.trim();
  // A key is required on every save (the backend takes both together), so the
  // model can only change when a key is present too.
  const dirty =
    trimmed.length > 0 &&
    (trimmed !== lastSavedKey || model !== lastSavedModel);
  const busy = setKey.isPending || removeKey.isPending;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty) return;
    setKey.mutate(
      { apiKey: trimmed, modelVersion: model },
      {
        onSuccess: () => {
          setLastSavedKey(trimmed);
          setLastSavedModel(model);
        },
      },
    );
  }

  function onRemove() {
    removeKey.mutate(undefined, {
      onSuccess: () => {
        setValue("");
        setLastSavedKey("");
        setReveal(false);
      },
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <header className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight">Gemini API key</h2>
        <p className="text-pretty text-sm leading-relaxed text-muted">
          Dock uses your own Google Gemini key to power the model. The free tier
          is enough to start. Pick a model, paste your key, and both stay on
          your account.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
        <FormError message={setKey.error?.message ?? removeKey.error?.message} />

        <div className="space-y-1.5">
          <label htmlFor="model" className="block text-sm font-medium">
            Model
          </label>
          <select
            id="model"
            name="model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {GEMINI_MODELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="api-key" className="block text-sm font-medium">
            API key
          </label>

          <div className="relative">
            <input
              id="api-key"
              name="api-key"
              type={reveal ? "text" : "password"}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={configured ? "A key is saved. Enter a new one to replace it" : "AIza…"}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 pr-11 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
            />

            <button
              type="button"
              onClick={() => setReveal((shown) => !shown)}
              aria-label={reveal ? "Hide API key" : "Show API key"}
              aria-pressed={reveal}
              className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {reveal ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {configured ? (
            <p className="flex items-center gap-1.5 text-xs text-success">
              <CheckIcon />
              A key is saved.
            </p>
          ) : (
            <p className="text-xs text-muted">
              Your key is sent only with your own requests to Gemini.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!dirty || busy}
            aria-busy={setKey.isPending}
            className={buttonStyles("primary")}
          >
            {setKey.isPending ? "Saving…" : configured ? "Replace key" : "Save key"}
          </button>

          {configured ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              aria-busy={removeKey.isPending}
              className={buttonStyles(
                "ghost",
                "text-danger hover:text-danger disabled:opacity-60",
              )}
            >
              {removeKey.isPending ? "Removing…" : "Remove"}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={1.75} aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={1.75} aria-hidden>
      <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.1 4M6.1 6.1A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4-.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M9.6 16.6 5 12l1.4-1.4 3.2 3.2 8-8L19 7.2l-9.4 9.4Z" />
    </svg>
  );
}
