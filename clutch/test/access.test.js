import test from 'node:test';
import assert from 'node:assert/strict';
import configHandler from '../api/config.js';
import aiHandler from '../api/ai.js';
import plansHandler, { findPlaces } from '../api/plans.js';
import { setJson, _resetMemory } from '../api/_lib/db.js';
import { DEFAULT_GROUPS, FEATURES as SERVER_FEATURES } from '../api/_lib/access.js';
import { FEATURES, has, fetchConfig } from '../js/engine/features.js';

const mkRes = () => { const r = { code: 200, headers: {}, body: null }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.end = () => r; return r; };
const call = async (h, req) => { const r = mkRes(); await h({ headers: {}, ...req }, r); return r; };

async function setup() {
  _resetMemory();
  for (const k of ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL']) delete process.env[k];
  process.env.CLUTCH_CODES = 'dueno';
  process.env.ANTHROPIC_API_KEY = 'sk-test';
  await setJson('tester:t-base', { code: 't-base', group: 'base', status: 'active' });
  await setJson('tester:t-pro1', { code: 't-pro1', group: 'pro-1', status: 'active' });
  await setJson('tester:t-off', { code: 't-off', group: 'pro-2', status: 'blocked' });
}

test('acceso: el cliente y el servidor conocen las mismas funciones', () => {
  assert.deepEqual(Object.keys(FEATURES).sort(), [...SERVER_FEATURES].sort());
  assert.deepEqual(DEFAULT_GROUPS.base, []);
  assert.equal(has({ features: ['plans'] }, 'plans'), true);
  assert.equal(has({}, 'plans'), false);
});

test('config: anónimo, base, pro-1, bloqueado y dueño', async () => {
  await setup();
  const get = (code) => call(configHandler, { method: 'GET', headers: { 'x-clutch-code': code } });
  assert.deepEqual((await get('')).body, { status: 'anon', group: null, features: [] });
  assert.deepEqual((await get('t-base')).body.features, []);
  assert.deepEqual((await get('t-pro1')).body.features, ['multi_profile', 'ai_rewrite', 'my_style', 'companions_pro']);
  assert.deepEqual((await get('t-off')).body, { status: 'blocked', group: null, features: [] });
  const owner = (await get('dueno')).body;
  assert.equal(owner.group, 'admin');
  assert.equal(owner.features.length, SERVER_FEATURES.length);
  // los grupos se pueden cambiar sin tocar código
  await setJson('groups', { ...DEFAULT_GROUPS, base: ['plans'] });
  assert.deepEqual((await get('t-base')).body.features, ['plans']);
  assert.equal((await call(configHandler, { method: 'POST' })).code, 405);
});

test('IA: cada tarea exige su función', async () => {
  await setup();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'Respira.' }] }) });
  try {
    const sos = (code) => call(aiHandler, { method: 'POST', headers: { 'x-clutch-code': code }, body: { task: 'sos', band: '25-34', group: 'pareja', history: [{ role: 'user', text: 'hola' }] } });
    assert.equal((await sos('t-off')).code, 401);
    assert.equal((await sos('t-pro1')).code, 403);
    assert.equal((await sos('dueno')).code, 200);
    const rw = await call(aiHandler, { method: 'POST', headers: { 'x-clutch-code': 't-pro1' }, body: { task: 'rewrite', band: '25-34', group: 'pareja', message: 'hola', facts: [] } });
    assert.equal(rw.code, 200);
  } finally { globalThis.fetch = realFetch; }
});

test('planes servidor: acceso, coordenadas, fuentes de respaldo y caché', async () => {
  await setup();
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    if (String(url).includes('photon')) return { ok: true, json: async () => ({ features: [{ properties: { name: 'Mirador de Gibralfaro' }, geometry: { coordinates: [-4.41, 36.72] } }, { properties: { name: 'Muy lejos' }, geometry: { coordinates: [-3.7, 40.4] } }] }) };
    return { ok: false, status: 500 };
  };
  try {
    const post = (code, body) => call(plansHandler, { method: 'POST', headers: { 'x-clutch-code': code }, body });
    assert.equal((await post('t-pro1', { lat: 36.72, lon: -4.42 })).code, 403);
    assert.equal((await post('dueno', { lat: 'x', lon: 1 })).code, 400);
    const r = await post('dueno', { lat: 36.7213, lon: -4.4214 });
    assert.equal(r.code, 200);
    assert.ok(r.body.elements.some((e) => e.tags.name === 'Mirador de Gibralfaro'));
    assert.ok(!r.body.elements.some((e) => e.tags.name === 'Muy lejos'), 'filtra lo que está a más de 6 km');
    const before = calls;
    const again = await post('dueno', { lat: 36.7213, lon: -4.4214 });
    assert.equal(again.body.cached, true);
    assert.equal(calls, before, 'la segunda vez sale de la caché');
    // si todas las fuentes fallan
    globalThis.fetch = async () => ({ ok: false, status: 502 });
    assert.equal(await findPlaces(1, 1), null);
  } finally { globalThis.fetch = realFetch; }
});

test('IA: el markdown se convierte en texto plano', async () => {
  const { plain } = await import('../api/ai.js');
  assert.equal(plain('**1) Qué hacer ahora**\n- Pide perdón\n## Mensaje'), '1) Qué hacer ahora\n• Pide perdón\nMensaje');
});

test('config cliente: filtra funciones desconocidas y soporta errores', async () => {
  const ok = await fetchConfig({ testerCode: 'x' }, async () => ({ ok: true, json: async () => ({ status: 'active', group: 'pro-1', features: ['ai_rewrite', 'inventada'] }) }));
  assert.deepEqual(ok, { ok: true, status: 'active', group: 'pro-1', features: ['ai_rewrite'] });
  assert.deepEqual(await fetchConfig({}, async () => { throw new Error('x'); }), { ok: false, reason: 'red' });
  assert.deepEqual(await fetchConfig({}, async () => ({ ok: false })), { ok: false, reason: 'servidor' });
});
