import Avatar from './Avatar.jsx';
import { personalityOf, seatStyle, stanceLabel } from '../lib/participants.js';

/** Small "AI Alpha · Analytical" chips for history cards and admin pages. */
export default function ParticipantChips({ participants }) {
  if (!participants || participants.length === 0) return null;
  const ordered = [...participants.filter((p) => p.role !== 'moderator'), ...participants.filter((p) => p.role === 'moderator')];
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="AI participants">
      {ordered.map((p) => {
        const st = seatStyle(p.key);
        const pers = personalityOf(p);
        return (
          <li key={p.key} className={`flex items-center gap-1.5 rounded-full border ${st.border} py-0.5 pl-0.5 pr-2 text-[11px]`}>
            <Avatar meta={{ key: p.key, style: st, icon: pers.icon || (p.role === 'moderator' ? 'moderator' : 'custom') }} size={18} />
            <span className={`font-semibold ${st.text}`}>{p.name.replace(/^AI /, '')}</span>
            <span className="text-muted">
              {p.role === 'moderator' ? 'Moderator' : pers.name}
              {p.stance ? ` · ${stanceLabel(p.stance)}` : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
