// Dienst-Notizen – Seite (alle Notizen, Suche) und Reiter auf jeder Detailseite (Notiz zu diesem Dienst).
// Gespeichert in Hostwerk.storage (bleibt bei Hostwerk, max. 256 KB). Checklisten „- [ ] …“ lassen sich abhaken.
const { html, t } = Hostwerk;
const N = Notes;
let notes = {};
let services = [];
let query = '';
const $ = (id) => document.getElementById(id);
const KIND_ROUTE = { web: '/web/', db: '/dbs/', minecraft: '/mc/', app: '/apps/', game: '/spiele/', mail: '/mail' };

async function loadAll() {
  notes = (await Hostwerk.storage.get('notes')) || {};
  try { services = await Hostwerk.services(); } catch { services = []; }
}
/** Eine Notiz ändern – vorher den neuesten Stand holen, damit zwei offene Reiter sich nicht überschreiben. */
async function change(kind, id, text) {
  const fresh = (await Hostwerk.storage.get('notes')) || {};
  notes = N.setNote(fresh, kind, id, text);
  await Hostwerk.storage.set('notes', notes);
}

/** Notiz mit abhakbaren Checklisten (sicher – jeder Text wird maskiert). */
function noteView(text, key) {
  let n = -1;
  return html`${String(text).split('\n').map((line) => {
    const m = line.match(/^\s*[-*] \[( |x|X)\]\s?(.*)$/);
    if (!m) return html`<div class="note-line">${line || ' '}</div>`;
    n++;
    return html`<label class="note-check"><input type="checkbox" data-key="${key}" data-n="${n}" ${m[1] === ' ' ? '' : Hostwerk.raw('checked')}> <span>${m[2]}</span></label>`;
  })}`;
}
function bindChecks(root) {
  for (const cb of root.querySelectorAll('input[type=checkbox][data-key]')) cb.addEventListener('change', async () => {
    const k = cb.dataset.key; const [kind, ...rest] = k.split(':');
    await change(kind, rest.join(':'), N.toggleCheck(notes[k].text, Number(cb.dataset.n)));
    render();
  });
}

/** Reiter auf einer Detailseite: eine Notiz für genau diesen Dienst. */
function renderTab(ctx) {
  const k = N.keyOf(ctx.kind, ctx.id);
  const cur = notes[k] ? notes[k].text : '';
  Hostwerk.render('#app', html`
    <div class="grid grid-2">
      <div class="card card-pad stack">
        <label class="label" for="text">${t('noteFor')}</label>
        <textarea class="input" id="text" rows="12" placeholder="${t('placeholder')}">${cur}</textarea>
        <div class="row"><span class="grow tiny muted">${notes[k] ? t('updated', { time: new Date(notes[k].updatedAt).toLocaleString(Hostwerk.lang === 'de' ? 'de-DE' : 'en-US') }) : t('notYet')}</span><button class="btn primary" id="save">${t('save')}</button></div>
      </div>
      <div class="card card-pad stack"><div class="label">${t('view')}</div><div id="view">${cur ? noteView(cur, k) : html`<div class="muted small">${t('emptyNote')}</div>`}</div></div>
    </div>`);
  $('save').addEventListener('click', async () => { await change(ctx.kind, ctx.id, $('text').value); Hostwerk.toast(t('saved'), { kind: 'success' }); render(); });
  bindChecks($('app'));
}

/** Seite: alle Notizen mit Suche. */
function renderPage() {
  const items = N.list(notes, services, query);
  Hostwerk.render('#app', html`
    <div class="row" style="margin-bottom:12px"><input class="input grow" id="q" placeholder="${t('search')}" value="${query}"></div>
    ${items.length ? html`<div class="grid grid-2">${items.map((x) => html`
      <div class="card">
        <div class="card-head"><h3>${x.name}</h3><span class="badge">${t('kind.' + x.kind)}</span>${x.open + x.done ? html`<span class="badge ${x.open ? 'warn' : 'ok'}">${x.done}/${x.open + x.done}</span>` : ''}<div class="right">${x.missing ? html`<span class="tiny muted">${t('missing')}</span>` : html`<button class="btn xs ghost" data-go="${x.kind}:${x.id}">${t('open')}</button>`}</div></div>
        <div class="card-body small">${noteView(x.text, x.key)}</div>
      </div>`)}</div>` : html`<div class="empty"><b>${query ? t('noHits') : t('none')}</b><span class="muted small">${t('howTo')}</span></div>`}`);
  const q = $('q');
  q.addEventListener('input', () => { query = q.value; renderPage(); const n = $('q'); n.focus(); n.setSelectionRange(query.length, query.length); });
  for (const b of document.querySelectorAll('[data-go]')) b.addEventListener('click', () => { const [kind, ...rest] = b.dataset.go.split(':'); Hostwerk.navigate(kind === 'mail' ? '/mail' : `${KIND_ROUTE[kind]}${rest.join(':')}`); });
  bindChecks($('app'));
}

function render() {
  const ctx = Hostwerk.context;
  if (ctx && ctx.kind && ctx.id) renderTab(ctx); else renderPage();
}

Hostwerk.ready().then(async (info) => {
  await loadAll();
  // Aus dem Rechtsklick-Menü eines Dienstes: direkt dessen Notiz bearbeiten (auf der Seite)
  const act = (a) => {
    if (!a || a.id !== 'note' || !a.kind || !a.target) return render();
    renderTab({ kind: a.kind, id: a.target });
  };
  act(info.action);
  Hostwerk.on('action', act);
  Hostwerk.on('lang', render);
});
