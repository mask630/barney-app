import test from 'node:test';
import assert from 'node:assert/strict';
import { newProfile } from '../js/core/store.js';
import { profileBand } from '../js/core/stages.js';
import { generateHooks } from '../js/engine/hooks.js';
import { genericMessages, upcoming } from '../js/engine/content.js';
import { importantDates } from '../js/engine/calendar.js';

const T = '2026-10-23';

test('ficha sin fecha de nacimiento: basta con la edad aproximada', () => {
  const r = newProfile({ name: 'Marta', band: '25-34', stage: 'citas' }, T);
  assert.ok(r.ok);
  assert.equal(r.profile.birth, null);
  assert.equal(r.profile.band, '25-34');
  assert.equal(profileBand(r.profile, T), '25-34');
  assert.equal(newProfile({ name: 'Marta', stage: 'citas' }, T).reason, 'sin-edad');
  assert.equal(newProfile({ name: 'Marta', band: '12-17', stage: 'citas' }, T).reason, 'sin-edad');
});

test('con fecha manda la fecha: sigue rechazando menores', () => {
  assert.equal(newProfile({ name: 'X', birth: '2015-01-01', band: '25-34', stage: 'pareja' }, T).reason, 'menor-de-edad');
  const r = newProfile({ name: 'X', birth: '1990-01-01', band: '18-24', stage: 'pareja' }, T);
  assert.equal(r.profile.band, null, 'si hay fecha no se guarda la edad aproximada');
  assert.equal(profileBand(r.profile, T), '35-49');
});

test('sin fecha la app funciona: mensajes, ganchos sin cumpleaños y aviso para añadirla', () => {
  const p = newProfile({ name: 'Marta', band: '25-34', stage: 'pareja', since: '2026-07-15' }, T).profile;
  const r = generateHooks({ ...p, location: null }, T);
  assert.ok(r.ok);
  assert.equal(r.band, '25-34');
  assert.ok(!r.hooks.some((h) => h.kind === 'birthday' || h.id === 'moon-in-sign'));
  assert.ok(r.unlocks.some((u) => u.id === 'birth'));
  assert.equal(genericMessages(p, '25-34', 'pareja', T).length, 3);
  assert.ok(!upcoming(p, T, 400).some((x) => x.kind === 'birthday'));
  assert.ok(!importantDates(p, T).some((x) => x.key === 'birthday'));
  assert.ok(importantDates(p, T).some((x) => x.key === 'anniversary'));
});
