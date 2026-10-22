import test from 'node:test';
import assert from 'node:assert/strict';
import { generateHooks } from '../js/engine/hooks.js';
import { compose } from '../js/engine/voice.js';
import { checkAdult, ageBand } from '../js/core/stages.js';
import { WORLD_DAYS, verifiedWorldDays } from '../js/data/worldDays.js';

const MAD = { lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid', city: 'Madrid' };
const base = { name: 'Lucía', birth: '1997-05-14', stage: 'pareja', since: '2026-07-14', tastes: ['pasta'], location: MAD };

test('menores de 18 y fechas inválidas se rechazan', () => {
  assert.equal(checkAdult('2010-01-01', '2026-10-22').ok, false);
  assert.equal(checkAdult('2008-10-23', '2026-10-22').reason, 'menor-de-edad');
  assert.equal(checkAdult('2008-10-22', '2026-10-22').ok, true);
  assert.equal(checkAdult('basura', '2026-10-22').reason, 'fecha-invalida');
  assert.equal(generateHooks({ ...base, birth: '2012-03-03' }, '2026-10-22').ok, false);
});

test('tramos de edad', () => {
  assert.equal(ageBand(18), '18-24');
  assert.equal(ageBand(24), '18-24');
  assert.equal(ageBand(25), '25-34');
  assert.equal(ageBand(35), '35-49');
  assert.equal(ageBand(49), '35-49');
  assert.equal(ageBand(50), '50+');
  assert.equal(ageBand(17), null);
});

test('hito de 100 días el 22-oct-2026 desde el 14-jul-2026', () => {
  const r = generateHooks(base, '2026-10-22');
  assert.ok(r.ok);
  const m = r.hooks.find((h) => h.id === 'milestone-100');
  assert.ok(m, 'debe existir el hito');
  assert.equal(m.daysAhead, 0);
  assert.match(m.message, /100 días/);
});

test('Día Mundial de la Pasta el 25-oct, con y sin gustos', () => {
  const withTaste = generateHooks(base, '2026-10-25').hooks.find((h) => h.id === 'world-pasta');
  const without = generateHooks({ ...base, tastes: [] }, '2026-10-25');
  const noTaste = without.hooks.find((h) => h.id === 'world-pasta');
  assert.ok(withTaste && noTaste);
  assert.ok(withTaste.priority > noTaste.priority);
  assert.deepEqual(withTaste.usedData, ['tastes']);
  assert.ok(without.unlocks.some((u) => u.id === 'tastes'));
  assert.ok(withTaste.source.urls.length > 0);
  assert.equal(generateHooks(base, '2026-10-24').hooks.some((h) => h.id === 'world-pasta'), false);
});

test('los días mundiales sin verificar nunca se devuelven', () => {
  assert.ok(WORLD_DAYS.some((d) => !d.verified));
  assert.ok(verifiedWorldDays().every((d) => d.verified && d.sources.length));
  const r = generateHooks({ ...base, tastes: ['chocolate'] }, '2026-07-07');
  assert.equal(r.hooks.some((h) => h.kind === 'worldday'), false);
});

test('sin datos: sin hitos ni ubicación, aparecen sugerencias para desbloquear', () => {
  const r = generateHooks({ name: 'Ana', birth: '1990-01-01', stage: 'pareja' }, '2026-10-22');
  assert.ok(r.ok);
  assert.equal(r.hooks.some((h) => h.kind === 'milestone'), false);
  assert.equal(r.hooks.some((h) => h.kind === 'sunset'), false);
  const ids = r.unlocks.map((u) => u.id);
  assert.ok(ids.includes('since') && ids.includes('tastes') && ids.includes('location'));
});

test('etapa amiga: nada de hitos ni sugerencia de fecha de inicio', () => {
  const r = generateHooks({ ...base, stage: 'amiga' }, '2026-10-22');
  assert.equal(r.hooks.some((h) => ['milestone', 'anniversary', 'sunset'].includes(h.kind)), false);
  assert.equal(r.unlocks.some((u) => u.id === 'since'), false);
});

test('cumpleaños: aviso previo y mensaje el propio día', () => {
  const before = generateHooks(base, '2027-05-10').hooks.find((h) => h.id === 'birthday');
  assert.equal(before.daysAhead, 4);
  assert.match(before.reminder, /4 días/);
  const day = generateHooks(base, '2027-05-14').hooks.find((h) => h.id === 'birthday');
  assert.ok(day.message.includes('cumpleaños'));
});

test('aniversario: un año después de la fecha de inicio', () => {
  const r = generateHooks(base, '2027-07-14').hooks.find((h) => h.id === 'anniversary');
  assert.ok(r);
  assert.match(r.message, /un año/);
});

test('luna en su signo solo si es estable ese día y su signo no es cúspide', () => {
  let found = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(Date.UTC(2026, 9, 1 + i, 12)).toISOString().slice(0, 10);
    const r = generateHooks({ ...base, birth: '1997-05-14' }, d); // Tauro
    if (r.hooks.some((h) => h.id === 'moon-in-sign')) {
      found++;
      assert.match(r.hooks.find((h) => h.id === 'moon-in-sign').message, /según los astros/i);
    }
  }
  assert.ok(found >= 2 && found <= 6, `días con Luna en Tauro: ${found}`);
  const cusp = generateHooks({ ...base, birth: '1997-05-21' }, '2026-10-22');
  assert.equal(cusp.hooks.some((h) => h.id === 'moon-in-sign'), false);
});

test('estación: otoño empieza el 23-sep-2026 en el hemisferio norte', () => {
  const ids = ['2026-09-22', '2026-09-23', '2026-09-24'].map((d) => generateHooks(base, d).hooks.some((h) => h.id === 'season-otoño'));
  assert.equal(ids.filter(Boolean).length, 1);
});

test('voz: sin tokens sin sustituir, amiga sin coqueteo, distinta por edad', () => {
  const flirty = /(amor|mi vida|guapa|beso|cariño|te quiero|😏|😉|❤️|🤍)/i;
  const out = new Set();
  for (const birth of ['2006-01-01', '1997-01-01', '1982-01-01', '1965-01-01']) {
    for (const stage of ['amiga', 'objetivo', 'rollo', 'citas', 'pareja', 'matrimonio']) {
      const r = generateHooks({ name: 'Lucía', birth, stage, since: '2026-07-14', tastes: ['pasta'], location: MAD }, '2026-10-25');
      assert.ok(r.ok);
      assert.ok(r.hooks.length > 0);
      for (const h of r.hooks) {
        if (h.message) assert.ok(!/[{}]|undefined|null|NaN/.test(h.message), h.message);
        if (stage === 'amiga' && h.message) assert.ok(!flirty.test(h.message), `amiga coquetea: ${h.message}`);
      }
      out.add(r.hooks.find((h) => h.id === 'world-pasta').message);
    }
  }
  assert.ok(out.size >= 10, `mensajes distintos: ${out.size}`);
});

test('voz: sin nombre usa saludo genérico', () => {
  assert.equal(compose({ text: 'hoy es sábado.', name: '', band: '35-49', group: 'amiga' }), 'Hola, hoy es sábado.');
});
