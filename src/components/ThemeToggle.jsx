import { useTheme } from '../hooks/useTheme.js';
import { IconMoon, IconSun } from './Icons.jsx';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:text-fg"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
    </button>
  );
}
