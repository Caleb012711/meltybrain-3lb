import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ThemeContext, type Theme } from '../hooks/useTheme';


export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try { localStorage.setItem('eyeliner-theme', next); } catch { /* Theme still works for this visit. */ }
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#131714' : '#f4f5ef');
  }, [theme]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => {
      try {
        const saved = localStorage.getItem('eyeliner-theme');
        if (saved === 'light' || saved === 'dark') return;
      } catch { /* Use the OS setting without storage. */ }
      setTheme(preference.matches ? 'dark' : 'light');
    };
    const followStorage = (event: StorageEvent) => {
      if (event.key !== 'eyeliner-theme') return;
      if (event.newValue === 'light' || event.newValue === 'dark') setTheme(event.newValue);
      else followSystem();
    };
    preference.addEventListener('change', followSystem);
    window.addEventListener('storage', followStorage);
    return () => {
      preference.removeEventListener('change', followSystem);
      window.removeEventListener('storage', followStorage);
    };
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

