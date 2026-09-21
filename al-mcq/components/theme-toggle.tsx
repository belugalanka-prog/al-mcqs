"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as "light" | "dark") ?? "light";
    setTheme(stored);
    document.documentElement.dataset.theme = stored;
  }, []);

  function set(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <div
      className="flex items-center gap-1 rounded-full p-1"
      style={{ background: "var(--brand-soft)" }}
    >
      <button
        onClick={() => set("light")}
        aria-pressed={theme === "light"}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium"
        style={{
          background: theme === "light" ? "var(--brand)" : "transparent",
          color: theme === "light" ? "#fff" : "var(--muted)",
        }}
      >
        <SunIcon size={14} /> Light
      </button>
      <button
        onClick={() => set("dark")}
        aria-pressed={theme === "dark"}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium"
        style={{
          background: theme === "dark" ? "var(--brand)" : "transparent",
          color: theme === "dark" ? "#fff" : "var(--muted)",
        }}
      >
        <MoonIcon size={14} /> Dark
      </button>
    </div>
  );
}
