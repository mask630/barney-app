import test from 'node:test';
import assert from 'node:assert/strict';
import { pickRotating, restFor, isRested, markUsed, unmarkUsedToday, REST_DAYS, ONE_PER_DAY } from '../js/engine/rotation.js';
import { MESSAGES, GESTURES } from '../js/data/bank.js';
import { dailyGestures, genericMessages } from '../js/engine/content.js';
import { newProfile } from '../js/core/store.js';
import { STAGES } from '../js/core/stages.js';
import { daysBetween } from '../js/core/dates.js';

const day = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const START = '2026-10-22';
const mk = (stage = 'pareja') => newProfile({ name: 'Lucía', birth: '1997-05-14', stage, since: '2026-01-10' }, START).profile;

test('banco: ids únicos, esfuerzos válidos y sin datos inventados', () => {
  const all = [...Object.values(MESSAGES).flat(), ...Object.values(GESTURES).flat()];
  assert.equal(new Set(all.map((x) => x.id)).size, all.length);
  for (const x of all) {
    assert.ok(x.e in REST_DAYS, x.id);
    if (x.st) assert.ok(x.st.length && x.st.every((st) => STAGES.includes(st)), x.id);
  }
  for (const g of ['flirt', 'pareja']) {
    assert.ok(MESSAGES[g].length >= 12 && GESTURES[g].length >= 10, g);
    assert.ok(MESSAGES[g].some((m) => m.e === 'alto'));
  }
  // nada de "estudios", días mundiales inventados ni cifras
  assert.ok(!all.some((x) => /estudio|día mundial|internacional|\d/i.test(x.t)));
});

test('descanso: varía al azar entre el 80 y el 150 % y cambia en cada uso', () => {
  const item = { id: 'x', e: 'ligero' };
  const rests = Array.from({ length: 60 }, (_, i) => restFor(item, 'p1', day(START, i)));
  assert.ok(rests.every((r) => r >= 8 && r <= 15), rests.join(','));
  assert.ok(new Set(rests).size >= 5, 'no siempre el mismo plazo');
  const p = markUsed({ id: 'p1' }, 'x', START);
  assert.equal(isRested(item, p, day(START, 7)), false);
  assert.equal(isRested(item, p, day(START, 15)), true);
});

test('lo usado hoy sigue en la lista de hoy y deshacer lo libera', () => {
  let p = mk();
  const before = genericMessages(p, '25-34', 'pareja', START).map((m) => m.id);
  for (const id of before) p = markUsed(p, id, START);
  assert.deepEqual(genericMessages(p, '25-34', 'pareja', START).map((m) => m.id), before);
  const tomorrow = genericMessages(p, '25-34', 'pareja', day(START, 1)).map((m) => m.id);
  assert.ok(!tomorrow.some((id) => before.includes(id)), 'mañana salen otros');
  p = unmarkUsedToday(p, before[0], START);
  assert.equal(p.used[before[0]], undefined);
  assert.equal(unmarkUsedToday(p, before[1], day(START, 1)).used[before[1]], START, 'solo deshace lo de hoy');
});

test('etapas: pareja y matrimonio comparten banco', () => {
  const ids = (stage, group) => genericMessages({ ...mk(stage), id: 'x' }, '25-34', group, START).map((m) => m.id);
  assert.deepEqual(ids('pareja', 'pareja'), ids('matrimonio', 'pareja'));
});

// Simulación de 6 meses. Realista: copia 1 mensaje y hace 2 gestos al día. Peor caso: usa todo lo que sale.
function simulate(stage, useMsgs, useGest, seed = 'p1') {
  let p = { ...mk(stage), id: seed }; // id fijo: la simulación es reproducible
  const group = { rollo: 'flirt', pareja: 'pareja', matrimonio: 'pareja' }[stage];
  const byId = Object.fromEntries([...MESSAGES[group], ...GESTURES[group]].map((x) => [x.id, x]));
  const history = {};
  const days = [];
  for (let i = 0; i < 180; i++) {
    const today = day(START, i);
    const msgs = genericMessages(p, '25-34', group, today);
    const gest = dailyGestures(p, today);
    const shown = [...msgs.map((m) => byId[m.id]), ...gest];
    days.push({ today, msgs, gest, restedShown: shown.map((it) => isRested(it, p, today)) });
    for (const id of [...msgs.slice(0, useMsgs).map((m) => m.id), ...gest.slice(0, useGest).map((g) => g.id)]) {
      (history[id] ||= []).push(today);
      p = markUsed(p, id, today);
    }
  }
  const gaps = [];
  let early = 0;
  for (const [id, dates] of Object.entries(history)) for (let k = 1; k < dates.length; k++) {
    const gap = daysBetween(dates[k - 1], dates[k]);
    gaps.push(gap);
    if (gap < Math.floor(REST_DAYS[byId[id].e] * 0.8)) early++;
  }
  return { byId, days, gaps, early, used: Object.keys(history).length };
}

for (const stage of ['rollo', 'pareja', 'matrimonio']) {
  test(`simulación realista 6 meses (${stage}): nada antes de tiempo, sin patrón fijo, un plan grande al día`, () => {
    // 5 fichas distintas: como mucho un 1 % vuelve antes de tiempo (solo cuando un día no queda nada descansado)
    let early = 0, total = 0;
    for (const seed of ['p1', 'p2', 'p3', 'p4', 'p5']) { const x = simulate(stage, 1, 2, seed); early += x.early; total += x.gaps.length; }
    assert.ok(early / total <= 0.01, `${early} de ${total} repeticiones antes de tiempo`);
    const r = simulate(stage, 1, 2);
    for (const d of r.days) {
      assert.ok(d.msgs.length >= 1 && d.gest.length >= 1, d.today);
      for (const kind of ONE_PER_DAY) {
        assert.ok(d.msgs.filter((m) => r.byId[m.id].e === kind).length <= 1, `${d.today}: dos mensajes ${kind}`);
        assert.ok(d.gest.filter((g) => g.e === kind).length <= 1, `${d.today}: dos gestos ${kind}`);
      }
    }
    assert.ok(new Set(r.gaps).size >= 6, `intervalos: ${[...new Set(r.gaps)].sort((a, b) => a - b).join(',')}`);
  });

  test(`peor caso 6 meses (${stage}): lo que sale ha descansado; si no queda nada, solo uno`, () => {
    const r = simulate(stage, 3, 3);
    for (const d of r.days) {
      assert.ok(d.msgs.length >= 1 && d.gest.length >= 1, d.today);
      // un elemento sin descansar solo aparece como relleno único
      if (d.restedShown.slice(0, d.msgs.length).includes(false)) assert.equal(d.msgs.length, 1, d.today);
      if (d.restedShown.slice(d.msgs.length).includes(false)) assert.equal(d.gest.length, 1, d.today);
    }
  });
}
