import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'tt_theme';
const ThemeContext = createContext(null);

function readInitial() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitial);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0b0f1a' : '#f4f6fa');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Persisting the theme is a nicety; ignore blocked storage.
    }
  }, [theme]);

  const setTheme = useCallback((next) => setThemeState(next === 'light' ? 'light' : 'dark'), []);
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export default useTheme;
