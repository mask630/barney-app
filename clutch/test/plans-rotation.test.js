import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlans, plansForToday, planMessage, planId } from '../js/engine/plans.js';
import { markUsed } from '../js/engine/rotation.js';

const day = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const T = '2026-10-22';
const items = parsePlans({ elements: [
  { lat: 36.72, lon: -4.42, tags: { name: 'Mirador de Gibralfaro', tourism: 'viewpoint' } },
  { lat: 36.72, lon: -4.42, tags: { name: 'Parque de Málaga', leisure: 'park' } },
  { lat: 36.72, lon: -4.42, tags: { name: 'Cine Albéniz', amenity: 'cinema' } },
  { lat: 36.72, lon: -4.42, tags: { name: 'Museo Picasso', tourism: 'museum' } },
  { lat: 36.72, lon: -4.42, tags: { name: 'Heladería Casa Mira', amenity: 'ice_cream' } },
  { lat: 36.72, lon: -4.42, tags: { name: 'Café Central', amenity: 'cafe' } }
] }, { lat: 36.72, lon: -4.42, group: 'pareja' });

test('planes: hasta 4 al día, estables, y lo propuesto descansa unas semanas', () => {
  let p = { id: 'p1', used: {} };
  const hoy = plansForToday(items, p, T);
  assert.equal(hoy.length, 4);
  assert.deepEqual(hoy, plansForToday(items, p, T));
  p = markUsed(p, hoy[0].id, T);
  assert.ok(plansForToday(items, p, T).some((x) => x.id === hoy[0].id), 'hoy sigue visible');
  assert.ok(!plansForToday(items, p, day(T, 7)).some((x) => x.id === hoy[0].id), 'a la semana no');
  assert.ok(Array.from({ length: 20 }, (_, i) => day(T, 15 + i)).some((d) => plansForToday(items, p, d).some((x) => x.id === hoy[0].id)), 'vuelve tras el descanso');
});

test('planes: si todo está propuesto, sale al menos uno', () => {
  let p = { id: 'p1', used: {} };
  for (const it of items) p = markUsed(p, planId(it), T);
  assert.equal(plansForToday(items, p, day(T, 2)).length, 1);
});

test('planes: mensaje para proponerlo', () => {
  const mirador = items.find((i) => i.kind === 'viewpoint');
  assert.equal(planMessage(mirador, { name: 'Lucía', band: '25-34', group: 'pareja' }), 'Lucía, ¿te apetece ver el atardecer desde Mirador de Gibralfaro? 🤍');
  const cine = items.find((i) => i.kind === 'cinema');
  assert.match(planMessage(cine, { name: 'Lucía', band: '25-34', group: 'pareja' }), /ver una peli en Cine Albéniz\?/);
});
