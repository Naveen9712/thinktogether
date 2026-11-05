import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ping } from '../lib/api.js';

const LABELS = {
  php_version_ok: 'PHP 8.2 or newer',
  curl_enabled: 'cURL extension',
  pdo_mysql: 'PDO MySQL extension',
  env_file_found: 'api/.env found',
  gemini_key_set: 'Gemini API key configured',
  database: 'Database connection',
  schema_imported: 'schema.sql imported',
  agents_configured: 'Both AI agents configured',
};

function Row({ ok, label }) {
  return (
    <li className="flex items-center justify-between py-2 text-sm">
      <span className="text-fg">{label}</span>
      <span className={ok ? 'text-ok' : 'text-danger'}>{ok ? 'OK' : 'Missing'}</span>
    </li>
  );
}

/** Diagnostics page: proves React -> PHP -> MySQL works and shows what is missing. */
export default function SetupCheck() {
  const [state, setState] = useState({ loading: true });

  const run = () => {
    setState({ loading: true });
    ping()
      .then((data) => setState({ loading: false, data }))
      .catch((error) => setState({ loading: false, error: error.message }));
  };

  useEffect(run, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-alpha" />
          <span className="h-3 w-3 rounded-full bg-beta" />
        </div>
        <h1 className="text-3xl font-bold text-fg">ThinkTogether</h1>
        <p className="mt-1 text-muted">Setup check</p>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        {state.loading && <p className="text-muted">Contacting the PHP API…</p>}

        {state.error && (
          <div>
            <p className="font-medium text-danger">Could not reach the API</p>
            <p className="mt-1 text-sm text-muted">{state.error}</p>
            <p className="mt-3 text-xs text-muted">
              Check that Apache and MySQL are running in XAMPP and that the project is in
              C:\xampp\htdocs\thinktogether.
            </p>
          </div>
        )}

        {state.data && (
          <>
            <p className={`font-medium ${state.data.healthy ? 'text-ok' : 'text-warn'}`}>
              {state.data.healthy ? 'Everything is connected' : 'API reachable, some setup is missing'}
            </p>
            <p className="mt-1 text-xs text-muted">
              PHP {state.data.php_version} · model {state.data.model}
            </p>
            <ul className="mt-3 divide-y divide-line">
              {Object.entries(state.data.checks).map(([key, value]) => (
                <Row key={key} label={LABELS[key] || key} ok={key === 'agents_configured' ? value === 2 : Boolean(value)} />
              ))}
            </ul>
            {state.data.db_error && <p className="mt-3 text-xs text-danger">{state.data.db_error}</p>}
          </>
        )}

        <button
          onClick={run}
          className="mt-5 rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-fg transition hover:opacity-80"
        >
          Re-run check
        </button>
        <Link to="/" className="ml-4 text-sm text-muted underline-offset-2 hover:text-fg hover:underline">
          Back to home
        </Link>
      </section>
    </main>
  );
}
