/* Notes – pure logic without DOM, tested in tests/lib.test.js (node --test). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Notes = api;
}(typeof self !== 'undefined' ? self : this, () => {
  const KINDS = ['web', 'db', 'minecraft', 'app', 'game', 'mail'];
  /** Storage key of a service: "<kind>:<id>" */
  const keyOf = (kind, id) => `${kind}:${id}`;
  const MAX = 20000;
  /** Hostwerk keeps at most 256 KB per extension (Hostwerk.storage) – everything above is refused. */
  const STORAGE_LIMIT = 256 * 1024;

  /** Save text for a service into the notes map (empty text removes the note). Returns a new map. */
  function setNote(map, kind, id, text, now = Date.now()) {
    const out = { ...(map || {}) };
    const k = keyOf(kind, id);
    const t = String(text || '').slice(0, MAX);
    if (!t.trim()) delete out[k]; else out[k] = { text: t, updatedAt: now };
    return out;
  }

  /** Remove a note by its key (also notes of services that no longer exist). Returns a new map. */
  function removeNote(map, key) {
    const out = { ...(map || {}) };
    delete out[key];
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

  /**
   * All services from GET /overview – the five classic kinds plus game servers and the mail catcher
   * (Hostwerk.services() leaves those two out). Same shape as Hostwerk.services(): { kind, id, name }.
   */
  function servicesFromOverview(o) {
    const x = o || {};
    const pick = (kind, xs) => (Array.isArray(xs) ? xs : []).filter((s) => s && s.id != null).map((s) => ({ kind, id: String(s.id), name: s.name || String(s.id) }));
    return [
      ...pick('web', x.web), ...pick('db', x.db), ...pick('minecraft', x.minecraft), ...pick('app', x.apps),
      ...pick('game', x.games),
      // Der Mail-Fänger ist ein einzelner Dienst ohne eigene ID
      ...(x.mail ? [{ kind: 'mail', id: 'mail', name: 'Mail' }] : []),
    ];
  }

  /** Where a tab is shown → which note: detail pages bring { kind, id }, the mail area tab { kind: 'area:mail' }. */
  function noteTarget(ctx) {
    if (!ctx) return null;
    if (ctx.kind === 'area:mail') return { kind: 'mail', id: 'mail' };
    return ctx.kind && ctx.id ? { kind: ctx.kind, id: String(ctx.id) } : null;
  }

  /** Bytes the notes take in Hostwerk's storage (UTF-8, as Hostwerk counts them) and the share of the limit. */
  function usage(map) {
    const json = JSON.stringify({ notes: map || {} });
    let bytes = 0;
    for (const ch of json) { const c = ch.codePointAt(0); bytes += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
    return { bytes, limit: STORAGE_LIMIT, share: bytes / STORAGE_LIMIT };
  }

  /**
   * Simple, safe formatting for one line: **bold**, `code` and web links (http/https only).
   * Returns segments { t: 'text' | 'b' | 'code' | 'link', v, href } – the page escapes every value, nothing becomes HTML.
   */
  function inline(line) {
    const out = [];
    const re = /\*\*([^*]+)\*\*|`([^`]+)`|\b(https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?])/g;
    let last = 0; let m;
    const s = String(line || '');
    while ((m = re.exec(s))) {
      if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
      if (m[1] !== undefined) out.push({ t: 'b', v: m[1] });
      else if (m[2] !== undefined) out.push({ t: 'code', v: m[2] });
      else out.push({ t: 'link', v: m[3], href: m[3] });
      last = re.lastIndex;
    }
    if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
    return out;
  }

  /** "# Title" / "## Title" → heading level 1–2, else 0. */
  const heading = (line) => { const m = /^(#{1,2})\s+(.+)$/.exec(String(line || '')); return m ? { level: m[1].length, text: m[2] } : null; };

  /** All notes joined with their service, newest first, optionally filtered by a search text. */
  function list(map, services, query = '') {
    const byKey = new Map((services || []).map((s) => [keyOf(s.kind, s.id), s]));
    const q = String(query || '').toLowerCase().trim();
    return Object.entries(map || {})
      .map(([k, v]) => { const [kind, ...rest] = k.split(':'); const id = rest.join(':'); const s = byKey.get(k); return { key: k, kind, id, name: s ? s.name : id, missing: !s, text: v.text, updatedAt: v.updatedAt, ...progress(v.text) }; })
      .filter((x) => !q || x.name.toLowerCase().includes(q) || x.text.toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  /**
   * Notizen für Hostwerks Wissensgraph (PUT /knowledge/notes, SDK 3.1): je Notiz ein Knoten mit Dienst-Bezug – Hostwerk
   * hängt sie an die Projekte, zu denen der Dienst gehört. titleOf(kind, name) baut den Titel (z. B. Webserver „Apache“).
   */
  function graphNotes(map, services, titleOf = (kind, name) => `${kind} „${name}“`) {
    const byKey = new Map((services || []).map((s) => [keyOf(s.kind, s.id), s]));
    return Object.entries(map || {}).filter(([, v]) => v && String(v.text || '').trim()).map(([k, v]) => {
      const [kind, ...rest] = k.split(':'); const id = rest.join(':'); const s = byKey.get(k);
      const name = s ? s.name : id;
      return { id: k, title: titleOf(kind, name), text: String(v.text), service: { kind, id, name } };
    });
  }

  return { KINDS, keyOf, graphNotes, setNote, removeNote, toggleCheck, progress, servicesFromOverview, noteTarget, usage, inline, heading, list, MAX, STORAGE_LIMIT };
}));
