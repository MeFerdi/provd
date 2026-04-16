"use client";

import { Moon, Sun } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";
import { THEME_STORAGE_KEY } from "@/lib/storage-keys";
import { readStorageItem, writeStorageItem } from "@/lib/storage";

type Theme = "dark" | "light";

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  writeStorageItem(THEME_STORAGE_KEY, theme);
}

function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;

  return readStorageItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = React.useState<Theme>(getInitialTheme);

  React.useEffect(() => {
    setThemeState(getInitialTheme());
  }, []);

  const isLight = theme === "light";

  return (
    <button
      type="button"
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      onClick={() => {
        const next = isLight ? "dark" : "light";
        setTheme(next);
        setThemeState(next);
      }}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-md border border-bg-border bg-bg-surface/60 text-text-primary transition hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
        className
      )}
    >
      {isLight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

