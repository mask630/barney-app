import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyGestures, upcoming, cycleCare, genericMessages, SOS } from '../js/engine/content.js';
import { newProfile } from '../js/core/store.js';
import es from '../js/i18n/es.js';

const T = '2026-10-22';
const mk = (o = {}) => newProfile({ name: 'Lucía', birth: '1997-05-14', stage: 'pareja', since: '2026-07-14', ...o }, T).profile;

test('gestos: tres distintos y estables en el día', () => {
  const p = mk();
  const a = dailyGestures(p, T);
  assert.equal(new Set(a).size, 3);
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

test('aniversario solo en etapas con hitos', () => {
  const amiga = mk({ stage: 'amiga' });
  assert.equal(upcoming(amiga, '2027-07-10').some((x) => x.kind === 'anniversary'), false);
  assert.equal(upcoming(mk(), '2027-07-10').some((x) => x.kind === 'anniversary'), true);
});

test('ciclo: desactivado, etapa baja y fases', () => {
  const p = mk();
  assert.equal(cycleCare(p, T), null);
  p.cycle = { enabled: true, lastStart: '2026-10-20', length: 28 };
  assert.equal(cycleCare(p, T).phase, 'regla');
  assert.ok(!/ganas|recept|fértil|fertil/i.test(cycleCare(p, T).text));
  assert.equal(cycleCare({ ...p, stage: 'rollo' }, T), null);
  p.cycle.lastStart = '2026-10-01'; // día 22 de 28
  assert.equal(cycleCare(p, T), null);
  p.cycle.lastStart = '2026-09-28'; // día 25
  assert.equal(cycleCare(p, T).phase, 'previos');
});

test('mensajes genéricos y SOS completos para los tres registros', () => {
  assert.equal(genericMessages(mk(), '25-34', 'pareja').length, 3);
  for (const s of SOS) for (const g of ['amiga', 'flirt', 'pareja']) assert.ok(s.scripts[g].length > 10);
  assert.equal(es.stages.citas, 'Citas');
});
