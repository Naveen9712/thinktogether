import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { IconHistory } from './Icons.jsx';

export default function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 pt-safe backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link
            to="/history"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-muted transition hover:text-fg"
          >
            <IconHistory size={16} />
            History
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
