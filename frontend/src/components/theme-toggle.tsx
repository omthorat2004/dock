"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/components/theme-script";

type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  listeners.add(onChange);
  media.addEventListener("change", onChange);
  // Keep other tabs in sync.
  
const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY) return;         // ignore unrelated keys
    const next = e.newValue;
    if (next === "light" || next === "dark") {
      document.documentElement.dataset.theme = next; 
    } else if (next === null) {
      delete document.documentElement.dataset.theme; 
    }
    onChange();                                   
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The DOM is the source of truth — `data-theme` if set, else the OS. */
function getSnapshot(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}


const getServerSnapshot = (): Theme | null => null;

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_STORAGE_KEY, next);
    emit();
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-subtle hover:text-foreground"
    >
      {/* Nothing until the theme is known, so SSR and the client agree. */}
      {theme === null ? (
        <span className="h-4 w-4" />
      ) : isDark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
          <path d="M12 4a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1Zm0 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM4 11h1a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2Zm15 0h1a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2ZM6.3 5a1 1 0 0 1 1.4 0l.7.7a1 1 0 0 1-1.4 1.4l-.7-.7a1 1 0 0 1 0-1.4Zm10 10a1 1 0 0 1 1.4 0l.7.7a1 1 0 0 1-1.4 1.4l-.7-.7a1 1 0 0 1 0-1.4Zm1.4-10a1 1 0 0 1 0 1.4l-.7.7a1 1 0 1 1-1.4-1.4l.7-.7a1 1 0 0 1 1.4 0Zm-10 10a1 1 0 0 1 0 1.4l-.7.7a1 1 0 0 1-1.4-1.4l.7-.7a1 1 0 0 1 1.4 0Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
          <path d="M21 13.2A9 9 0 1 1 10.8 3a7 7 0 0 0 10.2 10.2Z" />
        </svg>
      )}
    </button>
  );
}
