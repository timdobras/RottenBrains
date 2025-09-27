"use client";

import { useTheme } from "next-themes";
import React from "react";

export default function NavThemeSwitch() {
  const { theme, setTheme } = useTheme();

  // Cycle through the themes: light → dark → system → light …
  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      // This covers both when theme === "system" and any unexpected value.
      setTheme("light");
    }
  };

  const getLabel = (currentTheme?: string) => {
    if (currentTheme === "light") return "Light Theme";
    if (currentTheme === "dark") return "Dark Theme";
    if (currentTheme === "system") return "System Theme";
    return "Change theme";
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex w-full flex-row items-center gap-4 px-4 py-2 hover:bg-foreground/20"
      aria-label="Toggle theme"
    >
      <div className="flex items-center gap-2">
        <img
          src={`/assets/icons/${theme}-mode.svg`}
          alt={`${theme} mode icon`}
          className="invert-on-dark"
        />
        <p>{getLabel(theme)}</p>
      </div>
    </button>
  );
}
