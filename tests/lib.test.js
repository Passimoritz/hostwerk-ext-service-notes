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
