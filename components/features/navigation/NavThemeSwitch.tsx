'use client';

import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';

export default function NavThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cycle through the themes: light → dark → system → light …
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      // This covers both when theme === "system" and any unexpected value.
      setTheme('light');
    }
  };

  const getLabel = (currentTheme?: string) => {
    if (currentTheme === 'light') return 'Light Theme';
    if (currentTheme === 'dark') return 'Dark Theme';
    if (currentTheme === 'system') return 'System Theme';
    return 'Change theme';
  };

  // Use a stable value during SSR to avoid hydration mismatch
  const currentTheme = mounted ? theme : undefined;

  return (
    <button
      onClick={toggleTheme}
      className="flex w-full flex-row items-center gap-4 px-4 py-2 hover:bg-foreground/20"
      aria-label="Toggle theme"
    >
      <div className="flex items-center gap-2">
        {mounted && (
          <img
            src={`/assets/icons/${currentTheme}-mode.svg`}
            alt={`${currentTheme} mode icon`}
            className="invert-on-dark"
          />
        )}
        <p>{getLabel(currentTheme)}</p>
      </div>
    </button>
  );
}
