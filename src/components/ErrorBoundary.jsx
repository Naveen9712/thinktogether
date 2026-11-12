import { Component } from 'react';

/** Last line of defence: a render error shows a friendly screen instead of a blank page. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('[ThinkTogether] UI error', error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-fg">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The page hit an unexpected problem. Your discussion is safe on the server. Please reload the page.
        </p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-alpha px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
            Reload
          </button>
          <a href="/" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg hover:bg-surface-2">
            Go home
          </a>
        </div>
      </main>
    );
  }
}
