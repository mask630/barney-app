import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyGestures, upcoming, cycleInfo, cycleLength, genericMessages, SOS } from '../js/engine/content.js';
import { agenda, reminders, markDone } from '../js/engine/agenda.js';
import { newProfile } from '../js/core/store.js';
import es from '../js/i18n/es.js';

const T = '2026-10-22';
const mk = (o = {}) => newProfile({ name: 'Lucía', birth: '1997-05-14', stage: 'pareja', since: '2026-07-14', ...o }, T).profile;

test('gestos: tres distintos y estables en el día', () => {
  const p = mk();
  const a = dailyGestures(p, T);
  assert.equal(new Set(a.map((g) => g.id)).size, 3);
  assert.deepEqual(a, dailyGestures(p, T));
});

test('fechas próximas: cumpleaños y eventos, ordenadas', () => {
  const p = mk({ since: null });
  p.events.push({ id: 'e', text: 'Concierto', month: 11, day: 5, year: 2026, yearly: false });
  const u = upcoming(p, T, 400);
  assert.equal(u[0].label, 'Concierto');
  assert.equal(u[0].daysAhead, 14);
  assert.equal(u.find((x) => x.kind === 'birthday').iso, '2027-05-14');
  assert.ok(u.every((x, i) => i === 0 || u[i - 1].daysAhead <= x.daysAhead));
});

test('aniversario: en todas las etapas, si hay fecha de inicio', () => {
  assert.equal(upcoming(mk({ stage: 'rollo' }), '2027-07-10').some((x) => x.kind === 'anniversary'), true);
  assert.equal(upcoming(mk({ since: null }), '2027-07-10').some((x) => x.kind === 'anniversary'), false);
});

test('ciclo: desactivado, fases en todas las etapas y próxima regla', () => {
  const p = mk({ stage: 'rollo' });
  assert.equal(cycleInfo(p, T), null);
  p.cycle = { enabled: true, lastStart: '2026-10-20', length: 28 };
  assert.equal(cycleInfo(p, T).phase, 'regla');
  assert.match(cycleInfo(p, T).tip, /[Cc]hocolate/);
  const at = (last) => cycleInfo({ ...p, cycle: { ...p.cycle, lastStart: last } }, T);
  assert.equal(at('2026-10-14').phase, 'folicular'); // día 9
  assert.equal(at('2026-10-09').phase, 'ovulacion'); // día 14
  assert.equal(at('2026-10-02').phase, 'lutea'); // día 21
  assert.equal(at('2026-09-27').phase, 'premenstrual'); // día 26
  assert.match(at('2026-09-27').tip, /unos 3 días/);
  assert.equal(at('2026-10-20').nextStart, '2026-11-17');
  assert.equal(at('2026-12-01'), null, 'fecha futura');
});

test('ciclo: la duración sale de los inicios marcados', () => {
  assert.equal(cycleLength({ length: 28 }), 28);
  assert.equal(cycleLength({ length: 99 }), 28);
  assert.equal(cycleLength({ length: 28, starts: ['2026-08-01', '2026-08-31', '2026-09-30'] }), 30);
});

test('agenda: fechas del año, hitos y regla estimada', () => {
  const p = { ...mk(), cycle: { enabled: true, lastStart: '2026-10-20', length: 28 } };
  const a = agenda(p, T);
  assert.ok(a.some((d) => d.kind === 'birthday' && d.iso === '2027-05-14'), 'cumpleaños a más de 4 meses');
  assert.ok(a.some((d) => d.key === 'milestone-100' && d.iso === '2026-10-22'));
  assert.ok(a.some((d) => d.kind === 'period' && d.iso === '2026-11-17'));
  assert.deepEqual(a.map((d) => d.daysAhead), [...a.map((d) => d.daysAhead)].sort((x, y) => x - y));
});

test('avisos: pensar, comprar y preparar el regalo; hecho no vuelve a salir', () => {
  const p = { ...mk(), tastes: ['pasta'] };
  const r = (day, prof = p) => reminders(prof, day).filter((x) => x.kind === 'birthday');
  assert.equal(r('2027-04-10').length, 0, 'a más de 30 días nada');
  assert.equal(r('2027-04-20')[0].title, 'Piensa qué regalarle');
  assert.deepEqual(r('2027-04-20')[0].ideas, ['algo de pasta']);
  assert.equal(r('2027-05-05')[0].title, 'Compra el regalo');
  assert.match(r('2027-05-12')[0].title, /Prepara/);
  assert.equal(r('2027-05-14').length, 0, 'el mismo día lo cubre la jugada de hoy');
  const done = markDone(p, r('2027-05-05')[0].id, '2027-05-05');
  assert.equal(r('2027-05-06', done).length, 0);
  assert.equal(r('2027-05-12', done).length, 1, 'el paso siguiente sí sale');
});

test('mensajes genéricos y SOS completos para los dos registros', () => {
  const msgs = genericMessages(mk(), '25-34', 'pareja', T);
  assert.equal(msgs.length, 3);
  assert.ok(msgs.every((m) => m.id && m.text && !m.text.startsWith('Lucía')), 'no empieza por su nombre');
  for (const s of SOS) assert.ok(s.tip.length > 10);
  for (const s of SOS) for (const g of ['flirt', 'pareja']) assert.ok(s.scripts[g].length > 10);
  assert.equal(es.stages.citas, undefined);
});
