import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_DAYS, verifiedWorldDays, worldDaysOn } from '../js/data/worldDays.js';

test('días mundiales: todos verificados con fuente, fecha y mensaje para los tres registros', () => {
  assert.equal(verifiedWorldDays().length, WORLD_DAYS.length);
  assert.ok(WORLD_DAYS.length >= 35);
  assert.equal(new Set(WORLD_DAYS.map((d) => d.id)).size, WORLD_DAYS.length);
  for (const d of WORLD_DAYS) {
    assert.ok(d.sources.length && d.sources.every((u) => u.startsWith('https://')), d.id);
    for (const g of ['amiga', 'flirt', 'pareja']) assert.ok(/^hoy /.test(d.ideas[g]), `${d.id}/${g}`);
    if (d.needsTaste) assert.ok(d.tags.length, `${d.id}: si depende de un gusto, necesita etiquetas`);
  }
});

test('Año Nuevo Chino: fechas de la tabla y nada fuera de ella', () => {
  const on = (iso) => worldDaysOn(iso, 'España').some((d) => d.id === 'lunar-new-year');
  for (const iso of ['2027-02-06', '2028-01-26', '2031-01-23', '2035-02-08']) assert.ok(on(iso), iso);
  assert.equal(on('2027-02-07'), false);
  assert.equal(on('2040-02-01'), false);
});

test('patata (tortilla) solo en España; la Luna y el ajedrez comparten día', () => {
  assert.ok(worldDaysOn('2027-05-30', 'España').some((d) => d.id === 'potato'));
  assert.equal(worldDaysOn('2027-05-30', 'México').some((d) => d.id === 'potato'), false);
  assert.deepEqual(worldDaysOn('2027-07-20', 'España').map((d) => d.id).sort(), ['chess', 'moon']);
});
