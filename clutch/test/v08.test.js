import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyGestures, genericMessages, activePhase, cycleInfo } from '../js/engine/content.js';
import { reminders } from '../js/engine/agenda.js';
import { QUIZ, pendingQuiz, answerQuiz } from '../js/engine/quiz.js';
import { logAction, weekStats, weekLine } from '../js/engine/week.js';
import { sweetTaste, tasteMessages } from '../js/engine/moments.js';
import { newProfile } from '../js/core/store.js';

const T = '2026-11-24';
const base = () => newProfile({ name: 'Lucía', birth: '1996-03-10', stage: 'pareja' }, T).profile;
// 31-oct + 28 = 28-nov: hoy está antes de la regla
const withCycle = (mode) => ({ ...base(), cycle: { enabled: true, lastStart: '2026-10-31', length: 28, starts: [], mode } });

test('ciclo natural: antes de la regla cambia gestos y mensajes', () => {
  assert.equal(activePhase(withCycle('natural'), T), 'premenstrual');
  assert.equal(activePhase(withCycle(undefined), T), 'premenstrual', 'sin modo = natural (fichas de antes)');
});

test('con anticonceptivos: solo los días de regla cuentan', () => {
  const p = withCycle('hormonal');
  assert.equal(activePhase(p, T), null);
  assert.ok(dailyGestures(p, T, 4).every((g) => !g.id.startsWith('cg-')));
  assert.match(cycleInfo(p, T).mood, /se notan menos|notarse menos/);
  assert.equal(activePhase(p, '2026-11-29'), 'regla');
});

test('irregular: solo justo después de que él marque que le ha venido', () => {
  const p = { ...base(), cycle: { enabled: true, lastStart: '2026-11-22', length: 28, starts: [], mode: 'irregular' } };
  assert.equal(activePhase(p, T), 'regla');
  assert.equal(activePhase(p, '2026-11-30'), null);
  assert.match(cycleInfo(p, '2026-11-30').mood, /irregular/);
});

test('aviso de la regla con su dulce favorito', () => {
  const p = { ...withCycle('natural'), tastes: ['dulce favorito: helado de pistacho'] };
  assert.equal(sweetTaste(p), 'helado de pistacho');
  const r = reminders(p, '2026-11-26').find((x) => x.kind === 'period');
  assert.equal(r.title, 'Ten helado de pistacho a mano');
});

test('ficha en 2 minutos: guarda en su lista y no vuelve a preguntar', () => {
  let p = base();
  assert.equal(pendingQuiz(p).length, QUIZ.length);
  p = answerQuiz(p, 'comida', 'la pasta', 'x1', T);
  p = answerQuiz(p, 'pie', '38', 'x2', T);
  p = answerQuiz(p, 'amiga', 'Ana', 'x3', T);
  p = answerQuiz(p, 'evitar', '', 'x4', T); // saltada
  assert.deepEqual(p.tastes, ['comida favorita: la pasta']);
  assert.equal(p.sizes.calzado, '38');
  assert.equal(p.remember[0].text, 'Su mejor amiga se llama Ana');
  assert.deepEqual(p.avoid, []);
  assert.equal(pendingQuiz(p).length, QUIZ.length - 4);
  assert.ok(!pendingQuiz(p).some((q) => ['comida', 'pie', 'amiga', 'evitar'].includes(q.id)));
  // la comida favorita se usa en los mensajes aunque no sea un plato conocido
  assert.match(tasteMessages(p, 'pareja')[0].t, /pasta/);
});

test('resumen de la semana', () => {
  let p = base();
  p = logAction(p, 'g', '2026-11-20');
  p = logAction(p, 'g', T);
  p = logAction(p, 'g', T);
  p = logAction(p, 'g', T, -1);
  p = logAction(p, 'm', T);
  p = logAction(p, 'm', '2026-11-10'); // hace más de una semana: no cuenta
  assert.deepEqual(weekStats(p, T), { g: 2, m: 1 });
  assert.equal(weekLine(weekStats(p, T)), 'Esta semana: 2 detalles · 1 mensaje');
  assert.equal(weekLine({ g: 0, m: 0 }), '');
  p = logAction(p, 'g', '2026-12-20');
  assert.ok(!('2026-11-20' in p.log), 'solo se guardan 14 días');
});

test('«Otro»: el mensaje cambiado no vuelve a salir hoy', () => {
  const p = base();
  const first = genericMessages(p, '25-34', 'pareja', T, 3);
  const next = genericMessages(p, '25-34', 'pareja', T, 3, { exclude: [first[0].id] });
  assert.equal(next.length, 3);
  assert.ok(!next.some((m) => m.id === first[0].id));
});

test('el consejo del ciclo usa su dulce favorito', () => {
  const p = { ...withCycle('natural'), tastes: ['dulce favorito: tarta de queso'] };
  assert.match(cycleInfo(p, T).tip, /Ten tarta de queso a mano/);
  assert.match(cycleInfo(withCycle('natural'), T).tip, /chocolate/);
});
