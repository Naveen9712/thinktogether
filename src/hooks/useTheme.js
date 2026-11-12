import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'tt_theme';
const ThemeContext = createContext(null);

/** Saved choice first; otherwise follow the device setting (light or dark). */
function readInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage blocked: fall through to the device setting.
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitial);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0b0f1a' : '#f4f6fa');
  }, [theme]);

  // Only an explicit choice is saved, so people who never touch the toggle keep following their device.
  const remember = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Persisting the theme is a nicety; ignore blocked storage.
    }
  };
  const setTheme = useCallback((next) => {
    const value = next === 'light' ? 'light' : 'dark';
    remember(value);
    setThemeState(value);
  }, []);
  const toggle = useCallback(
    () =>
      setThemeState((t) => {
        const value = t === 'dark' ? 'light' : 'dark';
        remember(value);
        return value;
      }),
    []
  );
  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export default useTheme;
