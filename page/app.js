// Dienst-Notizen – Seite (alle Notizen, Suche) und Reiter auf jeder Detailseite (Notiz zu diesem Dienst).
// Gespeichert in Hostwerk.storage (bleibt bei Hostwerk, max. 256 KB). Checklisten „- [ ] …“ lassen sich abhaken,
// **fett**, `Code` und Links werden sicher dargestellt (jeder Text wird maskiert, nichts wird zu HTML).
const { html, t } = Hostwerk;
const N = Notes;
let notes = {};
let services = [];
let servicesOk = true; // ohne Dienstliste nichts als „Dienst fehlt“ markieren
let query = '';
let picking = false; // „Notiz …“ aus der Schnellsuche oder dem „Neu“-Menü: erst einen Dienst wählen
let armedDelete = null; // Löschen in zwei Schritten (Dialoge gibt es im abgeschotteten Rahmen nicht)
let filter = 'all'; // Liste: alle · offene Punkte · Dienst nicht mehr da
let lastAction = null; // Aktion, mit der die Seite geöffnet wurde (für die offene Notiz nach dem Sprachwechsel)
const $ = (id) => document.getElementById(id);
const KIND_ROUTE = { web: '/web/', db: '/dbs/', minecraft: '/mc/', app: '/apps/', game: '/spiele/' };
const routeOf = (kind, id) => (kind === 'mail' ? '/mail' : `${KIND_ROUTE[kind] || '/'}${encodeURIComponent(id)}`);
const fmtTime = (ts) => new Date(ts).toLocaleString(Hostwerk.lang === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const kb = (n) => Hostwerk.fmt.number(Math.ceil(n / 1024));

async function loadAll() {
  notes = (await Hostwerk.storage.get('notes')) || {};
  // Über /overview statt Hostwerk.services(): so sind auch Spiele-Server und der Mail-Fänger dabei
  try { services = N.servicesFromOverview(await Hostwerk.get('/overview')); servicesOk = true; } catch { services = []; servicesOk = false; }
}

/**
 * Eine Notiz ändern – vorher den neuesten Stand holen, damit zwei offene Reiter sich nicht überschreiben. Wirft bei Fehlern.
 * text darf eine Funktion (alter Text → neuer Text) sein: Abhaken arbeitet so immer auf dem gespeicherten Stand.
 */
async function change(kind, id, text) {
  const fresh = (await Hostwerk.storage.get('notes')) || {};
  const k = N.keyOf(kind, id);
  const next = N.setNote(fresh, kind, id, typeof text === 'function' ? text(fresh[k] ? fresh[k].text : '') : text);
  await store(next);
}
async function store(next) {
  // Hostwerk lehnt mehr als 256 KB ab – vorher prüfen und verständlich sagen, statt still zu scheitern
  if (N.usage(next).bytes > N.STORAGE_LIMIT) throw new Error(t('full'));
  await Hostwerk.storage.set('notes', next);
  notes = next;
  syncGraph();
}
/**
 * Notizen als Knoten in Hostwerks Wissensgraph (ab Hostwerk 3.0, Recht change:knowledge ohne Rückfrage) – gebündelt,
 * weil der Reiter beim Tippen laufend speichert. Ältere Hostwerk-Versionen kennen die Adresse nicht: dann still nichts.
 */
let graphTimer = null;
function syncGraph() {
  clearTimeout(graphTimer);
  graphTimer = setTimeout(() => { Hostwerk.put('/knowledge/notes', { notes: N.graphNotes(notes, services, (kind, name) => t('graphTitle', { kind: t('kind.' + kind), name })) }).catch(() => {}); }, 1500);
}
const failMsg = (e) => (e && e.message === t('full') ? t('full') : t('saveFailed'));

/** Eine Zeile mit sicherer Formatierung: **fett**, `Code`, Links (öffnen nach Rückfrage im Browser). */
function lineView(line) {
  return html`${N.inline(line).map((s) => (s.t === 'b' ? html`<b>${s.v}</b>`
    : s.t === 'code' ? html`<code class="mono">${s.v}</code>`
      : s.t === 'link' ? html`<a href="#" data-url="${s.href}">${s.v}</a>` : s.v))}`;
}
/** Notiz mit abhakbaren Checklisten und Überschriften (sicher – jeder Text wird maskiert). */
function noteView(text, key) {
  let n = -1;
  return html`${String(text).split('\n').map((line) => {
    const h = N.heading(line);
    if (h) return html`<div class="note-line note-heading-${h.level}">${lineView(h.text)}</div>`;
    const m = line.match(/^\s*[-*] \[( |x|X)\]\s?(.*)$/);
    if (!m) return html`<div class="note-line">${line ? lineView(line) : ' '}</div>`;
    n++;
    return html`<label class="note-check"><input type="checkbox" data-key="${key}" data-n="${n}" ${m[1] === ' ' ? '' : Hostwerk.raw('checked')}> <span>${lineView(m[2])}</span></label>`;
  })}`;
}
function bind(root) {
  for (const cb of root.querySelectorAll('input[type=checkbox][data-key]')) cb.addEventListener('change', async () => {
    const k = cb.dataset.key; const [kind, ...rest] = k.split(':');
    // Erst Getipptes sichern – sonst überschreibt das Abhaken den Text bzw. das spätere Autospeichern den Haken
    await flush();
    if (pending) { cb.checked = !cb.checked; return; } // Speichern ging nicht: nichts abhaken, Hinweis steht schon da
    try { await change(kind, rest.join(':'), (old) => N.toggleCheck(old, Number(cb.dataset.n))); } catch (e) { Hostwerk.toast(failMsg(e), { kind: 'error' }); }
    render();
  });
  for (const a of root.querySelectorAll('a[data-url]')) a.addEventListener('click', (e) => { e.preventDefault(); Hostwerk.openUrl(a.dataset.url); });
}

/* ---------- Reiter: eine Notiz für genau diesen Dienst, speichert von selbst ---------- */
let pending = null; // { kind, id, text } – noch nicht gespeichert
let saveTimer = null;
async function flush() {
  clearTimeout(saveTimer);
  if (!pending) return;
  const p = pending; pending = null;
  const state = $('state');
  try {
    await change(p.kind, p.id, p.text);
    if (state && !pending) state.textContent = t('savedAuto');
    refreshView(p);
  } catch (e) {
    pending = pending || p; // nicht verlieren – beim nächsten Tippen oder „Speichern“ erneut versuchen
    if (state) state.textContent = failMsg(e);
  }
}
/** Ansicht neben dem Textfeld auf den gespeicherten Stand bringen – sonst zeigt sie (und hakt ab) eine veraltete Fassung. */
function refreshView(p) {
  const view = $('view');
  if (!view || !editing || N.keyOf(editing.kind, editing.id) !== N.keyOf(p.kind, p.id)) return;
  const k = N.keyOf(p.kind, p.id);
  Hostwerk.render(view, notes[k] ? noteView(notes[k].text, k) : html`<div class="muted small">${t('emptyNote')}</div>`);
  bind(view);
}
// Reiterwechsel, Seitenwechsel, Fenster zu: nichts Ungespeichertes zurücklassen
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
/**
 * Ein Klick außerhalb (Seitenleiste, anderer Reiter) nimmt dem Rahmen zuerst den Fokus – Hostwerk entfernt ihn samt Brücke
 * aber schon ~30 ms später, zu früh für flush() (erst lesen, dann schreiben). Darum sofort und ohne vorheriges Lesen
 * absenden (Stand dieses Reiters), danach wie gewohnt sauber speichern, falls der Rahmen bleibt.
 */
function saveNow() {
  if (!pending) return;
  const next = N.setNote(notes, pending.kind, pending.id, pending.text);
  if (N.usage(next).bytes <= N.STORAGE_LIMIT) Hostwerk.storage.set('notes', next).catch(() => {});
  flush();
}
addEventListener('pagehide', saveNow);
addEventListener('blur', saveNow);

let editing = null; // { kind, id } – welche Notiz gerade im Bearbeiten-Bild steht (Reiter oder auf der Seite gewählt)
/**
 * Hostwerk lädt den Rahmen beim Sprachwechsel neu – mit derselben Adresse (?action=note ohne Dienst). Damit dann die offene
 * Notiz statt der Dienstauswahl erscheint, merkt sich die Seite, welche Notiz zu welcher Aktion offen ist.
 */
function rememberOpen(target) {
  if (N.noteTarget(Hostwerk.context)) return; // im Reiter steht der Dienst ohnehin fest
  const v = target ? { kind: target.kind, id: target.id, at: (lastAction && lastAction.at) || null, t: Date.now() } : null;
  Hostwerk.storage.set('open', v).catch(() => {});
}
function renderTab(target) {
  if (!editing || N.keyOf(editing.kind, editing.id) !== N.keyOf(target.kind, target.id)) rememberOpen(target);
  editing = { kind: target.kind, id: target.id };
  const k = N.keyOf(target.kind, target.id);
  const cur = notes[k] ? notes[k].text : '';
  // Auf der ganzen Seite (nicht im Reiter): Weg zurück zur Liste und welcher Dienst gemeint ist
  const svc = services.find((s) => s.kind === target.kind && s.id === target.id);
  const back = N.noteTarget(Hostwerk.context) ? '' : html`<div class="row" style="margin-bottom: var(--sp-3, 12px)"><button type="button" class="btn ghost sm" id="back">← ${t('allNotes')}</button><b class="grow" style="overflow-wrap: anywhere">${t('kind.' + target.kind)} · ${svc ? svc.name : target.id}</b></div>`;
  Hostwerk.render('#app', html`
    ${back}
    <div class="grid grid-2">
      <div class="card card-pad stack">
        <label class="label" for="text">${t('noteFor')}</label>
        <textarea class="input" id="text" rows="12" maxlength="${N.MAX}" placeholder="${t('placeholder')}">${cur}</textarea>
        <div class="row"><span class="grow tiny muted" id="state" aria-live="polite">${notes[k] ? t('updated', { time: fmtTime(notes[k].updatedAt) }) : t('notYet')}</span><button type="button" class="btn primary" id="save">${t('save')}</button></div>
      </div>
      <div class="card card-pad stack"><div class="label">${t('view')}</div><div id="view">${cur ? noteView(cur, k) : html`<div class="muted small">${t('emptyNote')}</div>`}</div></div>
    </div>`);
  $('text').addEventListener('input', () => {
    pending = { kind: target.kind, id: target.id, text: $('text').value };
    $('state').textContent = t('unsaved');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 800);
  });
  $('save').addEventListener('click', async () => {
    pending = { kind: target.kind, id: target.id, text: $('text').value };
    await flush();
    if (!pending) { Hostwerk.toast(t('saved'), { kind: 'success' }); renderTab(target); }
  });
  if ($('back')) $('back').addEventListener('click', async () => { await flush(); if (!pending) renderPage(); });
  bind($('app'));
}

/* ---------- Seite: alle Notizen mit Suche ---------- */
function usageLine() {
  if (!Object.keys(notes).length) return ''; // ohne Notizen nichts belegt (sonst stünde da „1 KB“)
  const u = N.usage(notes);
  const text = t('usage', { used: kb(u.bytes), limit: kb(u.limit) });
  return u.share >= 0.8 ? html`<span class="badge warn" title="${t('usageHint')}">${text}</span>` : html`<span class="tiny muted">${text}</span>`;
}
function pickerView() {
  if (!picking) return '';
  return html`<section class="card card-pad stack" style="margin-bottom: var(--sp-3, 12px)">
    <div class="row"><h2 class="grow">${t('pickTitle')}</h2><button type="button" class="btn ghost sm" id="pickClose">${t('cancel')}</button></div>
    ${services.length ? html`<div class="row" style="flex-wrap: wrap">${services.map((s) => html`<button type="button" class="btn sm pick" data-pick="${s.kind}:${s.id}" title="${s.name}"><span>${t('kind.' + s.kind)} · ${s.name}</span></button>`)}</div>`
      : html`<p class="small muted">${servicesOk ? t('noServices') : t('servicesFailed')}</p>`}
  </section>`;
}
function renderPage() {
  if (editing) rememberOpen(null);
  editing = null;
  const all = N.list(notes, services, query).map((x) => ({ ...x, missing: servicesOk && x.missing }));
  const items = N.filterList(all, filter);
  const chip = (id, label, n) => html`<button type="button" class="chip ${filter === id ? 'on' : ''}" aria-pressed="${filter === id ? 'true' : 'false'}" data-filter="${id}">${label}${n != null ? html` <span class="muted">${n}</span>` : ''}</button>`;
  const nOpen = all.filter((x) => x.open > 0).length;
  const nMissing = all.filter((x) => x.missing).length;
  Hostwerk.render('#app', html`
    ${pickerView()}
    <div class="row" style="margin-bottom: var(--sp-3, 12px)"><input class="input grow" id="q" aria-label="${t('search')}" placeholder="${t('search')}" value="${query}"><button type="button" class="btn" id="new">${t('newNote')}</button>${usageLine()}</div>
    ${Object.keys(notes).length ? html`<div class="row" style="margin-bottom: var(--sp-3, 12px); flex-wrap: wrap">${chip('all', t('filterAll'))}${chip('open', t('filterOpen'), nOpen)}${servicesOk ? chip('missing', t('filterMissing'), nMissing) : ''}<span class="grow"></span><button type="button" class="btn ghost sm" id="exportMd">${t('exportMd')}</button><button type="button" class="btn ghost sm" id="exportJson">${t('exportJson')}</button></div>` : ''}
    ${!servicesOk ? html`<div class="callout warn" style="margin-bottom: var(--sp-3, 12px)"><div class="callout-body">${t('servicesFailed')} <button type="button" class="btn xs" id="retry">${t('retry')}</button></div></div>` : ''}
    ${items.length ? html`<div class="grid grid-2">${items.map((x) => html`
      <div class="card">
        <div class="card-head"><h3 class="note-name">${x.name}</h3><span class="badge">${t('kind.' + x.kind)}</span>${x.open + x.done ? html`<span class="badge ${x.open ? 'warn' : 'ok'}">${x.done}/${x.open + x.done}</span>` : ''}
          <div class="right row-tight">${x.missing ? html`<span class="tiny muted">${t('missing')}</span>` : html`<button type="button" class="btn xs ghost" data-go="${x.key}">${t('open')}</button>`}
          <button type="button" class="btn xs ${armedDelete === x.key ? 'danger' : 'ghost'}" data-del="${x.key}" aria-label="${t('deleteFor', { name: x.name })}">${armedDelete === x.key ? t('deleteSure') : t('delete')}</button></div></div>
        <div class="card-body small">${noteView(x.text, x.key)}</div>
      </div>`)}</div>` : html`<div class="empty"><b>${query || filter !== 'all' ? t('noHits') : t('none')}</b><span class="muted small">${t('howTo')}</span></div>`}`);
  const q = $('q');
  // Neu zeichnen ersetzt das Suchfeld – Fokus und Schreibmarke dorthin, wo sie waren (nicht ans Ende springen)
  q.addEventListener('input', () => { query = q.value; const a = q.selectionStart; const b = q.selectionEnd; renderPage(); const n = $('q'); n.focus(); n.setSelectionRange(a, b); });
  $('new').addEventListener('click', () => { picking = true; renderPage(); });
  for (const b of document.querySelectorAll('[data-filter]')) b.addEventListener('click', () => { filter = b.dataset.filter; renderPage(); });
  // Sicherung vor dem Entfernen (Entfernen löscht alle Notizen) – Hostwerk speichert die Datei, der Rahmen selbst darf es nicht
  const day = new Date().toISOString().slice(0, 10);
  if ($('exportMd')) $('exportMd').addEventListener('click', () => Hostwerk.saveFile(`service-notes-${day}.md`, N.exportMarkdown(N.list(notes, services), { title: t('exportTitle'), kindName: (k) => t('kind.' + k) }), 'text/markdown').catch(() => Hostwerk.toast(t('exportFailed'), { kind: 'error' })));
  if ($('exportJson')) $('exportJson').addEventListener('click', () => Hostwerk.saveFile(`service-notes-${day}.json`, N.exportJson(notes, services), 'application/json').catch(() => Hostwerk.toast(t('exportFailed'), { kind: 'error' })));
  if ($('retry')) $('retry').addEventListener('click', start);
  if ($('pickClose')) $('pickClose').addEventListener('click', () => { picking = false; renderPage(); });
  for (const b of document.querySelectorAll('[data-pick]')) b.addEventListener('click', () => { const [kind, ...rest] = b.dataset.pick.split(':'); picking = false; renderTab({ kind, id: rest.join(':') }); });
  for (const b of document.querySelectorAll('[data-go]')) b.addEventListener('click', () => { const [kind, ...rest] = b.dataset.go.split(':'); Hostwerk.navigate(routeOf(kind, rest.join(':'))); });
  for (const b of document.querySelectorAll('[data-del]')) b.addEventListener('click', async () => {
    if (armedDelete !== b.dataset.del) { armedDelete = b.dataset.del; renderPage(); return; }
    armedDelete = null;
    try { await store(N.removeNote((await Hostwerk.storage.get('notes')) || {}, b.dataset.del)); Hostwerk.toast(t('deleted')); } catch (e) { Hostwerk.toast(failMsg(e), { kind: 'error' }); }
    renderPage();
  });
  bind($('app'));
}

function render() {
  // Reiter: immer dessen Dienst; ganze Seite: die gerade gewählte Notiz bleibt offen (Abhaken, Sprachwechsel)
  const target = N.noteTarget(Hostwerk.context) || editing;
  if (target) renderTab(target); else renderPage();
}

async function start() {
  try { await loadAll(); if (!N.noteTarget(Hostwerk.context)) syncGraph(); } catch {
    Hostwerk.render('#app', html`<div class="empty"><h3>${t('loadFailed')}</h3><div class="empty-action"><button type="button" class="btn" id="retry">${t('retry')}</button></div></div>`);
    $('retry').addEventListener('click', start);
    return;
  }
  render();
}

Hostwerk.ready().then(async (info) => {
  await start();
  // Aus dem Rechtsklick-Menü eines Dienstes: direkt dessen Notiz bearbeiten (auf der Seite);
  // aus der Schnellsuche oder dem „Neu“-Menü (ohne Dienst): erst einen Dienst wählen
  const act = async (a, first = false) => {
    if (!a || (a.id !== 'note' && a.id !== 'all')) return;
    await flush(); // Getipptes der bisher offenen Notiz nicht verlieren
    lastAction = a;
    if (a.id === 'all') { picking = false; renderPage(); return; } // „Alle Notizen“ (Schnellsuche, Strg+Alt+N): zurück zur Liste
    if (a.kind && a.target) { renderTab({ kind: a.kind, id: a.target }); return; }
    // Neu geladener Rahmen (Sprachwechsel) mit derselben Aktion: die Notiz, die dazu offen war, statt der Dienstauswahl
    if (first) {
      let open = null;
      try { open = await Hostwerk.storage.get('open'); } catch { open = null; }
      if (open && open.kind && open.id && (open.at || null) === (a.at || null) && (a.at || Date.now() - (open.t || 0) < 10 * 60000)) { picking = false; renderTab({ kind: open.kind, id: open.id }); return; }
    }
    picking = true; renderPage();
  };
  act(info.action, true);
  Hostwerk.on('action', act);
  // Sprachwechsel zeichnet neu – vorher speichern, sonst stünde im Textfeld wieder der alte Stand
  Hostwerk.on('lang', () => flush().then(render));
});
