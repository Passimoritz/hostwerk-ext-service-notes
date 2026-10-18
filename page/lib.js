/* Notes – pure logic without DOM, tested in tests/lib.test.js (node --test). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Notes = api;
}(typeof self !== 'undefined' ? self : this, () => {
  const KINDS = ['web', 'db', 'minecraft', 'app', 'game', 'mail'];
  /** Storage key of a service: "<kind>:<id>" */
  const keyOf = (kind, id) => `${kind}:${id}`;
  const MAX = 20000;

  /** Save text for a service into the notes map (empty text removes the note). Returns a new map. */
  function setNote(map, kind, id, text, now = Date.now()) {
    const out = { ...(map || {}) };
    const k = keyOf(kind, id);
    const t = String(text || '').slice(0, MAX);
    if (!t.trim()) delete out[k]; else out[k] = { text: t, updatedAt: now };
    return out;
  }

  /** Checklist lines "- [ ] …" / "- [x] …": toggle line n (0-based among checklist lines). */
  function toggleCheck(text, n) {
    let i = -1;
    return String(text || '').split('\n').map((line) => {
      const m = line.match(/^(\s*[-*] \[)( |x|X)(\].*)$/);
      if (!m) return line;
      i++;
      return i === n ? `${m[1]}${m[2] === ' ' ? 'x' : ' '}${m[3]}` : line;
    }).join('\n');
  }

  /** Open and done checklist items. */
  function progress(text) {
    let open = 0; let done = 0;
    for (const line of String(text || '').split('\n')) { const m = line.match(/^\s*[-*] \[( |x|X)\]/); if (m) { if (m[1] === ' ') open++; else done++; } }
    return { open, done };
  }

  /** All notes joined with their service, newest first, optionally filtered by a search text. */
  function list(map, services, query = '') {
    const byKey = new Map((services || []).map((s) => [keyOf(s.kind, s.id), s]));
    const q = String(query || '').toLowerCase().trim();
    return Object.entries(map || {})
      .map(([k, v]) => { const [kind, ...rest] = k.split(':'); const id = rest.join(':'); const s = byKey.get(k); return { key: k, kind, id, name: s ? s.name : id, missing: !s, text: v.text, updatedAt: v.updatedAt, ...progress(v.text) }; })
      .filter((x) => !q || x.name.toLowerCase().includes(q) || x.text.toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  return { KINDS, keyOf, setNote, toggleCheck, progress, list, MAX };
}));
