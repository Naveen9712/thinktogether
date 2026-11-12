// Pure helpers for the live message list (unit-tested in messages.test.js).

/** Id of the newest message that is no longer streaming; used as the `after` cursor when polling. */
export function lastStableId(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].generation_status !== 'generating') return messages[i].id;
  }
  return 0;
}

/**
 * Merges incoming messages into the current list by id, keeps them ordered, and never lets a stale
 * "generating" copy replace a finished one. Returns the SAME array when nothing changed (cheap re-renders).
 */
export function mergeMessages(current, incoming) {
  if (!incoming || incoming.length === 0) return current;
  const map = new Map(current.map((m) => [m.id, m]));
  let changed = false;
  incoming.forEach((m) => {
    const old = map.get(m.id);
    if (old) {
      if (old.generation_status !== 'generating' && m.generation_status === 'generating') return;
      if (old.message === m.message && old.generation_status === m.generation_status) return;
    }
    map.set(m.id, m);
    changed = true;
  });
  if (!changed) return current;
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
}
