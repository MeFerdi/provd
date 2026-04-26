"use client";

import { useEffect } from "react";
import { THEME_STORAGE_KEY } from "@/lib/storage-keys";

export function ThemeScript() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
      document.documentElement.dataset.theme = theme;
    } catch {
      document.documentElement.dataset.theme = "dark";
    }
  }, []);

  return null;
}

