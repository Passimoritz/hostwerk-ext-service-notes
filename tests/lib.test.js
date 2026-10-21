const test = require('node:test');
const assert = require('node:assert');
const N = require('../page/lib.js');

test('Notiz speichern und mit leerem Text entfernen', () => {
  let m = N.setNote({}, 'web', 'shop', 'Zugang: admin', 5);
  assert.deepStrictEqual(m, { 'web:shop': { text: 'Zugang: admin', updatedAt: 5 } });
  m = N.setNote(m, 'web', 'shop', '   ');
  assert.deepStrictEqual(m, {});
});

test('Checkliste: Punkt n umschalten, Fortschritt zählen', () => {
  const t = 'Aufgaben:\n- [ ] Backup\n- [x] Update\n- [ ] SSL';
  assert.strictEqual(N.toggleCheck(t, 0), 'Aufgaben:\n- [x] Backup\n- [x] Update\n- [ ] SSL');
  assert.strictEqual(N.toggleCheck(t, 1), 'Aufgaben:\n- [ ] Backup\n- [ ] Update\n- [ ] SSL');
  assert.deepStrictEqual(N.progress(t), { open: 2, done: 1 });
});

test('Liste: mit Dienstnamen, neueste zuerst, Suche, verschwundene Dienste markiert', () => {
  const map = { 'web:shop': { text: 'alt', updatedAt: 1 }, 'minecraft:frei': { text: 'Whitelist an', updatedAt: 9 }, 'db:weg': { text: 'x', updatedAt: 5 } };
  const services = [{ kind: 'web', id: 'shop', name: 'Shop' }, { kind: 'minecraft', id: 'frei', name: 'Freunde' }];
  const l = N.list(map, services);
  assert.deepStrictEqual(l.map((x) => x.name), ['Freunde', 'weg', 'Shop']);
  assert.strictEqual(l.find((x) => x.key === 'db:weg').missing, true);
  assert.deepStrictEqual(N.list(map, services, 'whitelist').map((x) => x.key), ['minecraft:frei']);
});

test('Dienste aus /overview: auch Spiele-Server und Mail-Fänger', () => {
  const s = N.servicesFromOverview({ web: [{ id: 'shop', name: 'Shop' }], apps: [{ id: 'a1', name: 'API' }], games: [{ id: 'valheim', name: 'Valheim', running: true }], mail: { proc: {} } });
  assert.deepStrictEqual(s.map((x) => `${x.kind}:${x.id}`), ['web:shop', 'app:a1', 'game:valheim', 'mail:mail']);
  assert.deepStrictEqual(N.servicesFromOverview(null), []);
  // Spiele-Server gelten damit nicht mehr als „Dienst fehlt“
  const l = N.list({ 'game:valheim': { text: 'Port 2456', updatedAt: 1 } }, s);
  assert.strictEqual(l[0].missing, false);
  assert.strictEqual(l[0].name, 'Valheim');
});

test('Reiter-Ziel: Detailseite oder Mail-Bereich', () => {
  assert.deepStrictEqual(N.noteTarget({ kind: 'game', id: 'v' }), { kind: 'game', id: 'v' });
  assert.deepStrictEqual(N.noteTarget({ kind: 'area:mail', id: null }), { kind: 'mail', id: 'mail' });
  assert.strictEqual(N.noteTarget({ kind: 'area:web', id: null }), null);
  assert.strictEqual(N.noteTarget(null), null);
});

test('Löschen, auch verwaiste Notizen', () => {
  const m = { 'db:weg': { text: 'x' }, 'web:shop': { text: 'y' } };
  assert.deepStrictEqual(Object.keys(N.removeNote(m, 'db:weg')), ['web:shop']);
  assert.deepStrictEqual(Object.keys(m).length, 2, 'Original bleibt unverändert');
});

test('Speicher: Bytes in UTF-8, Anteil an 256 KB', () => {
  const u = N.usage({ 'web:a': { text: 'ä', updatedAt: 1 } });
  assert.strictEqual(u.bytes, Buffer.byteLength(JSON.stringify({ notes: { 'web:a': { text: 'ä', updatedAt: 1 } } })));
  assert.strictEqual(u.limit, 262144);
  assert.ok(N.usage({ x: { text: 'a'.repeat(300000) } }).share > 1);
});

test('Formatierung: fett, Code, Links – nur http(s), Satzzeichen nicht im Link', () => {
  assert.deepStrictEqual(N.inline('Login **admin** auf `:8080` siehe https://example.com/doc.'), [
    { t: 'text', v: 'Login ' }, { t: 'b', v: 'admin' }, { t: 'text', v: ' auf ' }, { t: 'code', v: ':8080' },
    { t: 'text', v: ' siehe ' }, { t: 'link', v: 'https://example.com/doc', href: 'https://example.com/doc' }, { t: 'text', v: '.' },
  ]);
  assert.deepStrictEqual(N.inline('javascript:alert(1)'), [{ t: 'text', v: 'javascript:alert(1)' }]);
  assert.deepStrictEqual(N.inline('<b>nicht</b>'), [{ t: 'text', v: '<b>nicht</b>' }]);
  assert.deepStrictEqual(N.heading('## Zugänge'), { level: 2, text: 'Zugänge' });
  assert.strictEqual(N.heading('#kein'), null);
});
