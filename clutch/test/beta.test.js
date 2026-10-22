import test from 'node:test';
import assert from 'node:assert/strict';
import registerHandler, { newCode } from '../api/register.js';
import adminHandler from '../api/admin.js';
import configHandler from '../api/config.js';
import aiHandler from '../api/ai.js';
import { _resetMemory } from '../api/_lib/db.js';

const mkRes = () => { const r = { code: 200, headers: {}, body: null }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.end = () => r; return r; };
const call = async (h, req) => { const r = mkRes(); await h({ headers: {}, ...req }, r); return r; };
const register = (body, ip = '1.1.1.1') => call(registerHandler, { method: 'POST', headers: { 'x-forwarded-for': ip }, body });
const admin = (method, body, key = 'dueno') => call(adminHandler, { method, headers: { 'x-admin-key': key }, body });
const config = (code) => call(configHandler, { method: 'GET', headers: { 'x-clutch-code': code } });

function setup() {
  _resetMemory();
  for (const k of ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'CLUTCH_ADMIN', 'VERCEL']) delete process.env[k];
  process.env.CLUTCH_CODES = 'dueno';
  process.env.ANTHROPIC_API_KEY = 'sk-test';
}

test('código: 12 caracteres sin letras confusas', () => {
  const c = newCode();
  assert.match(c, /^[a-z2-9]{12}$/);
  assert.ok(!/[01ol]/.test(c));
  assert.notEqual(newCode(), newCode());
});

test('alta: validación, pendiente hasta aprobar, sin duplicados', async () => {
  setup();
  assert.equal((await register({ alias: 'x', email: 'a@b.es', terms: true })).body.error, 'alias');
  assert.equal((await register({ alias: 'Pepe', email: 'nope', terms: true })).body.error, 'email');
  assert.equal((await register({ alias: 'Pepe', email: 'pepe@mail.es' })).body.error, 'condiciones');
  const r = await register({ alias: 'Pepe', email: 'Pepe@Mail.es', terms: true, metrics: true });
  assert.equal(r.code, 200);
  assert.equal(r.body.status, 'pending');
  const code = r.body.code;
  assert.equal((await register({ alias: 'Otro', email: 'pepe@mail.es', terms: true })).code, 409, 'mismo email (sin distinguir mayúsculas)');
  // pendiente: sin funciones y sin IA
  assert.deepEqual((await config(code)).body, { status: 'pending', group: null, features: [] });
  const ai = await call(aiHandler, { method: 'POST', headers: { 'x-clutch-code': code }, body: { task: 'rewrite', band: '25-34', group: 'pareja', message: 'hola', facts: [] } });
  assert.equal(ai.code, 401);
});

test('alta: límite por IP, plazas y beta cerrada', async () => {
  setup();
  for (let i = 0; i < 5; i++) assert.equal((await register({ alias: `T${i}`, email: `t${i}@x.es`, terms: true }, '9.9.9.9')).code, 200);
  assert.equal((await register({ alias: 'T5', email: 't5@x.es', terms: true }, '9.9.9.9')).body.error, 'limite');
  await admin('POST', { action: 'settings', settings: { maxTesters: 5 } });
  assert.equal((await register({ alias: 'T6', email: 't6@x.es', terms: true }, '8.8.8.8')).body.error, 'completo');
  await admin('POST', { action: 'settings', settings: { open: false, maxTesters: 50 } });
  assert.equal((await register({ alias: 'T7', email: 't7@x.es', terms: true }, '7.7.7.7')).body.error, 'cerrado');
});

test('panel: clave, aprobar, cambiar de grupo, bloquear y editar grupos', async () => {
  setup();
  const code = (await register({ alias: 'Ana', email: 'ana@x.es', terms: true })).body.code;
  assert.equal((await admin('GET', null, 'mala')).code, 401);
  assert.equal((await admin('GET', null, '')).code, 401);
  const list = (await admin('GET')).body;
  assert.equal(list.testers.length, 1);
  assert.equal(list.testers[0].alias, 'Ana');
  assert.equal(list.settings.aiPerDay, 30);

  const ok = await admin('POST', { action: 'tester', code, status: 'active' });
  assert.equal(ok.body.tester.status, 'active');
  assert.ok(ok.body.tester.approvedAt);
  assert.deepEqual((await config(code)).body, { status: 'active', group: 'base', features: [] });

  await admin('POST', { action: 'tester', code, group: 'pro-1' });
  assert.deepEqual((await config(code)).body.features, ['multi_profile', 'ai_rewrite', 'my_style', 'companions_pro']);
  assert.equal((await admin('POST', { action: 'tester', code, group: 'inventado' })).code, 400);
  assert.equal((await admin('POST', { action: 'tester', code: 'nadie', status: 'active' })).code, 404);

  const g = await admin('POST', { action: 'groups', groups: { base: ['plans', 'falsa'], 'pro-1': ['ai_rewrite'] } });
  assert.deepEqual(g.body.groups.base, ['plans']);
  assert.deepEqual((await config(code)).body.features, ['ai_rewrite']);

  await admin('POST', { action: 'tester', code, status: 'blocked' });
  assert.equal((await config(code)).body.status, 'blocked');

  // borrar: desaparece del panel, el código deja de valer y el email puede volver a apuntarse
  assert.equal((await admin('POST', { action: 'delete', code })).body.deleted, code);
  assert.equal((await admin('GET')).body.testers.length, 0);
  assert.equal((await config(code)).body.status, 'anon');
  assert.equal((await register({ alias: 'Ana', email: 'ana@x.es', terms: true }, '2.2.2.2')).code, 200);
  assert.equal((await admin('POST', { action: 'delete', code: 'nadie' })).code, 404);

  // con CLUTCH_ADMIN, el código del dueño ya no abre el panel
  process.env.CLUTCH_ADMIN = 'clave-panel';
  assert.equal((await admin('GET')).code, 401);
  assert.equal((await admin('GET', null, 'clave-panel')).code, 200);
});

test('IA: límite diario por tester; el dueño no tiene límite', async () => {
  setup();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'hola {n}' }] }) });
  try {
    const code = (await register({ alias: 'Leo', email: 'leo@x.es', terms: true })).body.code;
    await admin('POST', { action: 'tester', code, status: 'active', group: 'pro-1' });
    await admin('POST', { action: 'settings', settings: { aiPerDay: 2 } });
    const rw = (c) => call(aiHandler, { method: 'POST', headers: { 'x-clutch-code': c }, body: { task: 'rewrite', band: '25-34', group: 'pareja', message: 'hola {n}', facts: [] } });
    assert.equal((await rw(code)).code, 200);
    assert.equal((await rw(code)).code, 200);
    assert.equal((await rw(code)).code, 429);
    for (let i = 0; i < 4; i++) assert.equal((await rw('dueno')).code, 200);
  } finally { globalThis.fetch = realFetch; }
});

test('alta en Vercel sin base de datos: aviso claro', async () => {
  setup();
  process.env.VERCEL = '1';
  try {
    assert.equal((await register({ alias: 'Pepe', email: 'p@x.es', terms: true })).body.error, 'sin-db');
  } finally { delete process.env.VERCEL; }
});
