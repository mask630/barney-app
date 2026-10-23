import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, parseDate, applyToProfile } from '../js/engine/capture.js';
import { newProfile, setStage, importBackup, exportBackup, emptyState, load, save, STORE_KEY, completeness, hashPin } from '../js/core/store.js';

const TODAY = '2026-10-22';
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('Apuntar: anillo talla 14 → Tallas / anillo', () => {
  const c = classify('Su anillo es una talla 14');
  assert.equal(c.dest, 'tallas');
  assert.equal(c.field, 'anillo');
  assert.equal(c.value, '14');
});

test('Apuntar: zapatos y camiseta', () => {
  assert.deepEqual(pick(classify('Calza un 38')), ['tallas', 'calzado', '38']);
  assert.deepEqual(pick(classify('Talla M de camiseta')), ['tallas', 'camiseta', 'M']);
});
const pick = (c) => [c.dest, c.field, c.value];

test('Apuntar: gustos, evitar, regalos, recordar', () => {
  assert.equal(classify('Le encanta el matcha latte').dest, 'gustos');
  assert.equal(classify('Le encanta el matcha latte').value, 'el matcha latte');
  assert.equal(classify('Odia el cilantro').dest, 'evitar');
  assert.equal(classify('Es alérgica a los frutos secos').dest, 'evitar');
  assert.equal(classify('Quiere unos pendientes de perlas').dest, 'regalos');
  assert.equal(classify('No olvides preguntarle por su examen').dest, 'recordar');
});

test('Apuntar: fechas', () => {
  assert.deepEqual(parseDate('concierto el 12 de marzo de 2027'), { day: 12, month: 3, year: 2027, match: '12 de marzo de 2027' });
  assert.equal(parseDate('31/02'), null);
  assert.equal(parseDate('cumple el 5/11').month, 11);
  const c = classify('Cumpleaños de su madre el 3 de mayo');
  assert.equal(c.dest, 'eventos');
  assert.equal(c.date.month, 5);
});

test('Apuntar: lo que no se entiende va a la Bandeja', () => {
  assert.equal(classify('mmm pensar esto luego').dest, 'bandeja');
  assert.equal(classify('').dest, 'bandeja');
});

test('aplicar a perfil: tallas, gustos sin duplicar, eventos anuales', () => {
  const { profile } = newProfile({ name: 'Lucía', birth: '1997-05-14', stage: 'pareja' }, TODAY);
  let p = applyToProfile(profile, classify('Su anillo es una talla 14'), 'x1', TODAY);
  assert.equal(p.sizes.anillo, '14');
  p = applyToProfile(p, classify('Le encanta el matcha'), 'x2', TODAY);
  p = applyToProfile(p, classify('Le encanta el matcha'), 'x3', TODAY);
  assert.equal(p.tastes.length, 1);
  p = applyToProfile(p, classify('Cumpleaños de su madre el 3 de mayo'), 'x4', TODAY);
  assert.equal(p.events[0].yearly, true);
  assert.equal(profile.sizes.anillo, undefined, 'no muta el original');
});

test('perfil: solo adultos, nombre obligatorio', () => {
  assert.equal(newProfile({ name: 'A', birth: '2012-01-01' }, TODAY).reason, 'menor-de-edad');
  assert.equal(newProfile({ name: '  ', birth: '1990-01-01' }, TODAY).reason, 'nombre-vacio');
  assert.equal(newProfile({ name: 'A', birth: '1990-01-01', stage: 'x' }, TODAY).reason, 'etapa-invalida');
});

test('subir de etapa conserva el historial y los datos', () => {
  const { profile } = newProfile({ name: 'Lucía', birth: '1997-05-14', stage: 'rollo', tastes: ['Pasta'] }, TODAY);
  const up = setStage(profile, 'pareja', '2026-11-01');
  assert.equal(up.stage, 'pareja');
  assert.deepEqual(up.history.map((h) => h.stage), ['rollo', 'pareja']);
  assert.deepEqual(up.tastes, ['pasta']);
});

test('guardar y cargar; almacenamiento roto no rompe', () => {
  const st = mem();
  const s = emptyState();
  s.settings.companion = 'Colega';
  assert.equal(save(st, s), true);
  assert.equal(load(st).settings.companion, 'Colega');
  assert.equal(load({ getItem() { throw new Error('x'); } }).profiles.length, 0);
  assert.equal(save({ setItem() { throw new Error('lleno'); } }, s), false);
  st.setItem(STORE_KEY, '{basura');
  assert.equal(load(st).profiles.length, 0);
});

test('copia de seguridad: exportar e importar', () => {
  const s = emptyState();
  const { profile } = newProfile({ name: 'Lucía', birth: '1997-05-14' }, TODAY);
  s.profiles.push(profile);
  const r = importBackup(exportBackup(s));
  assert.equal(r.ok, true);
  assert.equal(r.state.profiles[0].name, 'Lucía');
  assert.equal(importBackup('no json').ok, false);
  assert.equal(importBackup('{"x":1}').reason, 'formato-desconocido');
});

test('copias que no son de Clutch se rechazan (ya no hay migración desde otras apps)', () => {
  assert.equal(importBackup(JSON.stringify({ girls: [{ name: 'X', bday: '1990-01-01' }] })).reason, 'formato-desconocido');
});

test('completitud de ficha solo cuenta datos reales', () => {
  const { profile } = newProfile({ name: 'L', birth: '1997-05-14', stage: 'rollo' }, TODAY);
  const a = completeness(profile);
  const b = completeness(applyToProfile(profile, classify('Le encanta el té'), 'z', TODAY));
  assert.ok(b > a);
});

test('PIN: hash determinista y distinto con otra sal', async () => {
  const a = await hashPin('1234', 's1');
  assert.equal(a, await hashPin('1234', 's1'));
  assert.notEqual(a, await hashPin('1234', 's2'));
  assert.notEqual(a, await hashPin('1235', 's1'));
});

test('fichas de etapas retiradas (Amiga, Objetivo) pasan a Rollo sin perder datos', async () => {
  const { upgradeStages, load } = await import('../js/core/store.js');
  const old = { ...emptyState(), profiles: [{ id: 'a', name: 'Ana', birth: '1990-01-01', stage: 'amiga', tastes: ['té'], history: [{ stage: 'amiga', at: '2026-01-01' }] }, { id: 'b', name: 'Bea', birth: '1990-01-01', stage: 'pareja', history: [] }] };
  const up = upgradeStages(old, '2026-10-23');
  assert.equal(up.profiles[0].stage, 'rollo');
  assert.deepEqual(up.profiles[0].tastes, ['té']);
  assert.deepEqual(up.profiles[0].history.at(-1), { stage: 'rollo', at: '2026-10-23' });
  assert.equal(up.profiles[1], old.profiles[1], 'las demás no se tocan');
  const st = { getItem: () => JSON.stringify(old) };
  assert.equal(load(st).profiles[0].stage, 'rollo');
});
