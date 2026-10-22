import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeStyle, applyStyle, describeStyle } from '../js/engine/style.js';
import { COMPANIONS, isAvailable, companionLine } from '../js/engine/companions.js';
import { buildQuery, parsePlans, fetchPlans } from '../js/engine/plans.js';
import { aiConfigured, aiRewrite, aiSos, fillName } from '../js/engine/ai.js';
import { buildRequest, safeRewrite } from '../api/ai.js';
import { encryptBackup, decryptBackup, isEncryptedBackup, exportBackup, emptyState } from '../js/core/store.js';

test('estilo: rasgos y adaptación sin añadir datos', () => {
  const t = analyzeStyle(['jaja vale, nos vemos 😂', 'oye q tal el finde 😂', 'va, luego te escribo jaja', 'ok 😂']);
  assert.equal(t.short, true);
  assert.equal(t.lowerStart, true);
  assert.equal(t.topEmoji, '😂');
  assert.ok(describeStyle(t).includes('mensajes cortos'));
  const out = applyStyle('Hola Lucía, hoy se cumplen 100 días desde que estamos juntos. Cada uno ha valido la pena. Gracias por todo. 🤍', t);
  assert.ok(out.startsWith('hola'));
  assert.ok(out.includes('😂') && !out.includes('🤍'));
  assert.ok(out.includes('100'));
  assert.ok(out.split(/[.!?]/).filter(Boolean).length <= 3);
  assert.equal(analyzeStyle(['solo uno']), null);
  assert.equal(applyStyle('Hola.', null), 'Hola.');
});

test('acompañantes: gratis vs PRO', () => {
  assert.equal(isAvailable('gymbro', false), true);
  assert.equal(isAvailable('mentor', false), false);
  assert.equal(isAvailable('mentor', true), true);
  assert.equal(Object.keys(COMPANIONS).length, 5);
  assert.equal(companionLine('mentor', 'hook', '2026-10-22', false), companionLine('gymbro', 'hook', '2026-10-22', false));
  assert.notEqual(companionLine('mentor', 'hook', '2026-10-22', true), companionLine('colega', 'hook', '2026-10-22', true));
});

test('planes: consulta y análisis de la respuesta', () => {
  assert.ok(buildQuery(36.7213, -4.4214).includes('around:3500,36.7213,-4.4214'));
  const json = { elements: [
    { type: 'node', lat: 36.72, lon: -4.42, tags: { name: 'Mirador de Gibralfaro', tourism: 'viewpoint' } },
    { type: 'way', center: { lat: 36.73, lon: -4.43 }, tags: { name: 'Parque de Málaga', leisure: 'park' } },
    { type: 'node', lat: 36.73, lon: -4.4, tags: { name: 'Heladería X', amenity: 'ice_cream' } },
    { type: 'node', lat: 36.73, lon: -4.4, tags: { name: 'Heladería X', amenity: 'ice_cream' } },
    { type: 'node', lat: 36.73, lon: -4.4, tags: { amenity: 'cafe' } }
  ] };
  const pareja = parsePlans(json, { lat: 36.7213, lon: -4.4214, group: 'pareja' });
  assert.equal(pareja.length, 3);
  assert.ok(pareja.some((p) => p.text === 'Ver el atardecer desde Mirador de Gibralfaro'));
  const amiga = parsePlans(json, { lat: 36.7213, lon: -4.4214, group: 'amiga' });
  assert.equal(amiga.some((p) => p.kind === 'viewpoint'), false);
});

test('planes: errores de red no rompen', async () => {
  assert.deepEqual(await fetchPlans({ lat: 1, lon: 1, group: 'pareja', fetchFn: async () => { throw new Error('x'); } }), { ok: false, reason: 'red' });
  assert.deepEqual(await fetchPlans({ lat: 1, lon: 1, group: 'pareja', fetchFn: async () => ({ ok: false }) }), { ok: false, reason: 'servicio' });
  const r = await fetchPlans({ lat: 1, lon: 1, group: 'pareja', fetchFn: async () => ({ ok: true, json: async () => ({ elements: [] }) }) });
  assert.equal(r.ok, true);
});

test('IA cliente: sin código, códigos y errores', async () => {
  assert.equal(aiConfigured({}), false);
  assert.equal(aiConfigured({ testerCode: '  ' }), false);
  assert.equal(aiConfigured({ testerCode: 'abc' }), true);
  assert.equal((await aiRewrite({}, { message: 'hola', band: '25-34', group: 'flirt' })).reason, 'sin-servidor');
  const s = { testerCode: 'abc' };
  let seen, seenUrl;
  const ok = await aiRewrite(s, { message: 'hola {n}', band: '25-34', group: 'flirt', facts: ['f'] }, async (url, o) => { seenUrl = url; seen = o; return { ok: true, status: 200, json: async () => ({ text: 'ey {n}' }) }; });
  assert.equal(ok.text, 'ey {n}');
  assert.equal(seenUrl, 'https://clutch-ia.vercel.app/api/ai');
  assert.equal(seen.headers['X-Clutch-Code'], 'abc');
  assert.equal((await aiSos(s, { history: [], band: '25-34', group: 'pareja' }, async () => ({ ok: false, status: 403 }))).reason, 'funcion');
  assert.ok(!seen.body.includes('Lucía'));
  assert.equal((await aiSos(s, { history: [], band: '25-34', group: 'pareja' }, async () => ({ ok: false, status: 401 }))).reason, 'codigo');
  assert.equal((await aiSos(s, { history: [], band: '25-34', group: 'pareja' }, async () => ({ ok: false, status: 429 }))).reason, 'limite');
  assert.equal(fillName('hola {n}, ¿qué tal?', 'Lucía'), 'hola Lucía, ¿qué tal?');
});

test('IA servidor: validación y defensa contra datos inventados', () => {
  assert.equal(buildRequest({ task: 'rewrite', band: 'x', group: 'flirt', message: 'a' }).error, 'parametros');
  assert.equal(buildRequest({ task: 'nada', band: '25-34', group: 'flirt' }).error, 'tarea');
  assert.equal(buildRequest({ task: 'photo', band: '25-34', group: 'flirt', photo: 'http://x' }).error, 'foto');
  // la app manda la foto sin registro: debe aceptarse
  assert.ok(buildRequest({ task: 'photo', band: '25-34', photo: 'data:image/jpeg;base64,AAAA' }).payload);
  const r = buildRequest({ task: 'rewrite', band: '25-34', group: 'pareja', message: 'hoy hace 100 días', facts: ['100 días'] });
  assert.ok(r.payload.system.includes('No inventes'));
  assert.ok(!JSON.stringify(r.payload).includes('Lucía'));
  assert.equal(safeRewrite('hoy hace 100 días', [], 'han pasado 100 días'), 'han pasado 100 días');
  assert.equal(safeRewrite('hoy hace 100 días', [], 'han pasado 200 días'), null);
  assert.equal(safeRewrite('x', [], ''), null);
});

test('copia cifrada: ida y vuelta, contraseña incorrecta y formato', async () => {
  const plain = exportBackup(emptyState());
  const enc = await encryptBackup(plain, 'contraseña-larga', undefined, 1000);
  assert.equal(enc.ok, true);
  assert.equal(isEncryptedBackup(enc.text), true);
  assert.ok(!enc.text.includes('profiles'));
  assert.equal((await decryptBackup(enc.text, 'contraseña-larga')).text, plain);
  assert.equal((await decryptBackup(enc.text, 'otra-distinta')).reason, 'contrasena-incorrecta');
  assert.equal((await encryptBackup(plain, '123')).reason, 'contrasena-corta');
  assert.equal(isEncryptedBackup(plain), false);
});

test('IA servidor: matiz por etapa (Objetivo sin intensidad ni manipulación)', () => {
  const obj = buildRequest({ task: 'rewrite', band: '25-34', group: 'flirt', stage: 'objetivo', message: 'hola', facts: [] });
  assert.ok(obj.payload.messages[0].content.includes('aún no hay nada'));
  assert.ok(obj.payload.messages[0].content.includes('manipulación'));
  const plain = buildRequest({ task: 'rewrite', band: '25-34', group: 'flirt', message: 'hola', facts: [] });
  assert.ok(!plain.payload.messages[0].content.includes('Etapa:'), 'sin etapa, como antes');
  const raro = buildRequest({ task: 'rewrite', band: '25-34', group: 'flirt', stage: '<script>', message: 'hola', facts: [] });
  assert.ok(!raro.payload.messages[0].content.includes('<script>'), 'etapas desconocidas se ignoran');
});
