import test from 'node:test';
import assert from 'node:assert/strict';
import { generateHooks } from '../js/engine/hooks.js';
import { moonPhase } from '../js/core/astro.js';
import { parseISO } from '../js/core/dates.js';
import { markUsed } from '../js/engine/rotation.js';

const day = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const MADRID = { lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid', city: 'Madrid' };
const base = { id: 'p1', used: {}, name: 'Lucía', birth: '1997-05-14', stage: 'pareja', since: '2025-01-10', tastes: [], location: MADRID };
const use = (p, h, t) => { let n = markUsed(p, h.mid, t); return markUsed(n, h.mid.split(':')[0], t); };

test('luna llena: cada mes una versión distinta de la anterior', () => {
  let p = { ...base };
  const seen = [];
  for (let i = 0; i < 370 && seen.length < 12; i++) {
    const t = day('2026-10-22', i);
    if (moonPhase(parseISO(t)).name !== 'llena') continue;
    const h = generateHooks(p, t).hooks.find((x) => x.id === 'full-moon');
    if (!h || seen.at(-1)?.date === day(t, -1)) continue; // un día por luna llena
    seen.push({ date: t, mid: h.mid });
    p = use(p, h, t);
  }
  assert.ok(seen.length >= 10);
  for (let k = 1; k < seen.length; k++) assert.notEqual(seen[k].mid, seen[k - 1].mid, seen[k].date);
  assert.equal(new Set(seen.map((x) => x.mid)).size, 3, 'salen las tres versiones');
});

test('atardecer: sale cada día hasta usarlo; luego descansa unos 8-15 días', () => {
  let p = { ...base };
  const t0 = '2026-10-22';
  const sunset = (pp, t) => generateHooks(pp, t).hooks.find((x) => x.id === 'sunset');
  const h = sunset(p, t0);
  assert.ok(h, 'sale con ciudad');
  p = use(p, h, t0);
  assert.ok(sunset(p, t0), 'el mismo día sigue visible');
  const back = Array.from({ length: 20 }, (_, i) => i + 1).find((i) => sunset(p, day(t0, i)));
  assert.ok(back >= 8 && back <= 15, `volvió a los ${back} días`);
  assert.notEqual(sunset(p, day(t0, back)).mid, h.mid, 'y con otra versión');
});

test('cumpleaños: cada año suena distinto si se usó', () => {
  let p = { ...base };
  const mids = [];
  for (const y of [2027, 2028, 2029]) {
    const t = `${y}-05-14`;
    const h = generateHooks(p, t).hooks.find((x) => x.id === 'birthday');
    mids.push(h.mid);
    p = use(p, h, t);
  }
  assert.equal(new Set(mids).size, 3);
});

test('sin memoria de uso (perfil antiguo) sigue funcionando', () => {
  const { used, id, ...old } = base;
  const r = generateHooks(old, '2027-05-14');
  assert.ok(r.ok && r.hooks.find((x) => x.id === 'birthday').message.includes('cumpleaños'));
});
