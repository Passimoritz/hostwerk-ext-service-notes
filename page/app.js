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

/** Eine Notiz ändern – vorher den neuesten Stand holen, damit zwei offene Reiter sich nicht überschreiben. Wirft bei Fehlern. */
async function change(kind, id, text) {
  const fresh = (await Hostwerk.storage.get('notes')) || {};
  const next = N.setNote(fresh, kind, id, text);
  await store(next);
}
async function store(next) {
  // Hostwerk lehnt mehr als 256 KB ab – vorher prüfen und verständlich sagen, statt still zu scheitern
  if (N.usage(next).bytes > N.STORAGE_LIMIT) throw new Error(t('full'));
  await Hostwerk.storage.set('notes', next);
  notes = next;
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
    try { await change(kind, rest.join(':'), N.toggleCheck(notes[k].text, Number(cb.dataset.n))); } catch (e) { Hostwerk.toast(failMsg(e), { kind: 'error' }); }
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
  try { await change(p.kind, p.id, p.text); if (state) state.textContent = t('savedAuto'); } catch (e) {
    pending = pending || p; // nicht verlieren – beim nächsten Tippen oder „Speichern“ erneut versuchen
    if (state) state.textContent = failMsg(e);
  }
}
// Reiterwechsel, Seitenwechsel, Fenster zu: nichts Ungespeichertes zurücklassen
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
addEventListener('pagehide', flush);

function renderTab(target) {
  const k = N.keyOf(target.kind, target.id);
  const cur = notes[k] ? notes[k].text : '';
  Hostwerk.render('#app', html`
    <div class="grid grid-2">
      <div class="card card-pad stack">
        <label class="label" for="text">${t('noteFor')}</label>
        <textarea class="input" id="text" rows="12" placeholder="${t('placeholder')}">${cur}</textarea>
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
  bind($('app'));
}

/* ---------- Seite: alle Notizen mit Suche ---------- */
function usageLine() {
  const u = N.usage(notes);
  const text = t('usage', { used: kb(u.bytes), limit: kb(u.limit) });
  return u.share >= 0.8 ? html`<span class="badge warn" title="${t('usageHint')}">${text}</span>` : html`<span class="tiny muted">${text}</span>`;
}
function pickerView() {
  if (!picking) return '';
  return html`<section class="card card-pad stack" style="margin-bottom: var(--sp-3, 12px)">
    <div class="row"><h2 class="grow">${t('pickTitle')}</h2><button type="button" class="btn ghost sm" id="pickClose">${t('cancel')}</button></div>
    ${services.length ? html`<div class="row" style="flex-wrap: wrap">${services.map((s) => html`<button type="button" class="btn sm" data-pick="${s.kind}:${s.id}">${t('kind.' + s.kind)} · ${s.name}</button>`)}</div>`
      : html`<p class="small muted">${servicesOk ? t('noServices') : t('servicesFailed')}</p>`}
  </section>`;
}
function renderPage() {
  const items = N.list(notes, services, query).map((x) => ({ ...x, missing: servicesOk && x.missing }));
  Hostwerk.render('#app', html`
    ${pickerView()}
    <div class="row" style="margin-bottom: var(--sp-3, 12px)"><input class="input grow" id="q" aria-label="${t('search')}" placeholder="${t('search')}" value="${query}"><button type="button" class="btn" id="new">${t('newNote')}</button>${usageLine()}</div>
    ${!servicesOk ? html`<div class="callout warn" style="margin-bottom: var(--sp-3, 12px)"><div class="callout-body">${t('servicesFailed')} <button type="button" class="btn xs" id="retry">${t('retry')}</button></div></div>` : ''}
    ${items.length ? html`<div class="grid grid-2">${items.map((x) => html`
      <div class="card">
        <div class="card-head"><h3>${x.name}</h3><span class="badge">${t('kind.' + x.kind)}</span>${x.open + x.done ? html`<span class="badge ${x.open ? 'warn' : 'ok'}">${x.done}/${x.open + x.done}</span>` : ''}
          <div class="right row-tight">${x.missing ? html`<span class="tiny muted">${t('missing')}</span>` : html`<button type="button" class="btn xs ghost" data-go="${x.key}">${t('open')}</button>`}
          <button type="button" class="btn xs ${armedDelete === x.key ? 'danger' : 'ghost'}" data-del="${x.key}" aria-label="${t('deleteFor', { name: x.name })}">${armedDelete === x.key ? t('deleteSure') : t('delete')}</button></div></div>
        <div class="card-body small">${noteView(x.text, x.key)}</div>
      </div>`)}</div>` : html`<div class="empty"><b>${query ? t('noHits') : t('none')}</b><span class="muted small">${t('howTo')}</span></div>`}`);
  const q = $('q');
  q.addEventListener('input', () => { query = q.value; renderPage(); const n = $('q'); n.focus(); n.setSelectionRange(query.length, query.length); });
  $('new').addEventListener('click', () => { picking = true; renderPage(); });
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
  const target = N.noteTarget(Hostwerk.context);
  if (target) renderTab(target); else renderPage();
}

async function start() {
  try { await loadAll(); } catch {
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
  const act = (a) => {
    if (!a || a.id !== 'note') return;
    if (a.kind && a.target) renderTab({ kind: a.kind, id: a.target });
    else { picking = true; renderPage(); }
  };
  act(info.action);
  Hostwerk.on('action', act);
  Hostwerk.on('lang', render);
});
