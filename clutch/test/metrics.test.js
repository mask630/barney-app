import test from 'node:test';
import assert from 'node:assert/strict';
import eventHandler, { EVENTS as SERVER_EVENTS } from '../api/event.js';
import feedbackHandler from '../api/feedback.js';
import adminHandler, { stats } from '../api/admin.js';
import configHandler from '../api/config.js';
import { setJson, addToSet, _resetMemory } from '../api/_lib/db.js';
import { createMetrics, sendFeedback, canSend, EVENTS } from '../js/engine/metrics.js';

const mkRes = () => { const r = { code: 200, headers: {}, body: null }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.end = () => r; return r; };
const call = async (h, req) => { const r = mkRes(); await h({ headers: {}, ...req }, r); return r; };
const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const TODAY = new Date().toISOString().slice(0, 10);

async function setup() {
  _resetMemory();
  for (const k of ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'CLUTCH_ADMIN']) delete process.env[k];
  process.env.CLUTCH_CODES = 'dueno';
  await setJson('tester:t1', { code: 't1', alias: 'Ana', email: 'a@x.es', group: 'base', status: 'active', metrics: false, createdAt: '2026-09-01', approvedAt: '2026-09-01', lastSeen: '2026-09-20' });
  await setJson('tester:t2', { code: 't2', alias: 'Leo', email: 'l@x.es', group: 'base', status: 'pending', createdAt: TODAY });
  await setJson('tester:t3', { code: 't3', alias: 'Bea', email: 'b@x.es', group: 'base', status: 'blocked', createdAt: '2026-09-01' });
  for (const c of ['t1', 't2', 't3']) await addToSet('testers', c);
}

test('métricas: cliente y servidor aceptan los mismos eventos', () => {
  assert.deepEqual(EVENTS, SERVER_EVENTS);
});

test('métricas cliente: solo con permiso, agrupa y reintenta', async () => {
  const st = memStorage();
  const sent = [];
  let fail = false;
  const m = createMetrics(st, async (url, o) => { sent.push({ url, body: JSON.parse(o.body) }); return fail ? { ok: false, status: 500 } : { ok: true, status: 200 }; });
  const off = { testerCode: 't1', betaStatus: 'active', metrics: false };
  const on = { ...off, metrics: true };
  assert.equal(canSend(off), false);
  assert.equal(canSend({ ...on, betaStatus: 'pending' }), false);
  m.track(off, 'copy');
  assert.deepEqual(m.pending(), {}, 'sin permiso no se apunta nada');
  m.track(on, 'copy'); m.track(on, 'copy'); m.track(on, 'open'); m.track(on, 'inventado');
  assert.deepEqual(m.pending(), { copy: 2, open: 1 });
  fail = true;
  assert.equal(await m.flush(on), false);
  assert.deepEqual(m.pending(), { copy: 2, open: 1 }, 'si falla, vuelve a la cola');
  fail = false;
  assert.equal(await m.flush(on), true);
  assert.deepEqual(m.pending(), {});
  assert.deepEqual(sent.at(-1).body, { events: { copy: 2, open: 1 } });
  assert.ok(!JSON.stringify(sent).includes('Lucía'));
  // retirar el permiso vacía la cola y avisa al servidor
  m.track(on, 'copy');
  await m.consent(off, false);
  assert.deepEqual(m.pending(), {});
  assert.deepEqual(sent.at(-1).body, { consent: false });
  // errores: como mucho 3 por sesión
  for (let i = 0; i < 5; i++) await m.error(on, { message: 'x', screen: 'hoy' });
  assert.equal(sent.filter((x) => x.url.endsWith('/api/feedback')).length, 3);
});

test('evento servidor: cuenta por día sin enlazar al tester y guarda el permiso', async () => {
  await setup();
  const post = (code, body) => call(eventHandler, { method: 'POST', headers: { 'x-clutch-code': code }, body });
  assert.equal((await post('t2', { events: { copy: 1 } })).code, 401, 'pendiente no envía');
  assert.equal((await post('t3', { events: { copy: 1 } })).code, 401, 'bloqueado no envía');
  const r = await post('t1', { events: { copy: 3, open: 1, inventado: 5, whatsapp: -2 }, consent: true });
  assert.equal(r.body.counted, 2);
  await post('t1', { events: { copy: 9999 } });
  const s = await stats([], TODAY, 1);
  assert.deepEqual(s.daily[0].events, { copy: 203, open: 1 }, 'tope de 200 por envío');
  const admin = await call(adminHandler, { method: 'GET', headers: { 'x-admin-key': 'dueno' } });
  assert.equal(admin.body.testers.find((t) => t.code === 't1').metrics, true);
});

test('opiniones y errores: llegan al panel, con alias si hay código', async () => {
  await setup();
  const fb = (code, body) => call(feedbackHandler, { method: 'POST', headers: { 'x-clutch-code': code, 'x-forwarded-for': '5.5.5.5' }, body });
  assert.equal((await fb('t1', { text: 'no' })).code, 400);
  assert.equal((await fb('t3', { text: 'hola hola' })).code, 401);
  assert.equal((await fb('t1', { text: 'Me encanta Hoy', screen: 'hoy', version: 'Clutch beta 0.1' })).code, 200);
  assert.equal((await fb('', { text: 'Sin código' })).code, 200);
  assert.equal((await fb('t1', { kind: 'error', text: 'TypeError: x\napp.js:10:2', screen: 'yo' })).code, 200);
  const admin = (body) => call(adminHandler, { method: body ? 'POST' : 'GET', headers: { 'x-admin-key': 'dueno' }, body });
  const d = (await admin()).body;
  assert.equal(d.feedback.length, 2);
  assert.equal(d.feedback[0].alias, null, 'la más reciente primero (anónima)');
  assert.equal(d.feedback[1].alias, 'Ana');
  assert.equal(d.errors.length, 1);
  const id = d.feedback[1].id;
  assert.equal((await admin({ action: 'feedback', op: 'read', id })).body.feedback.find((x) => x.id === id).read, true);
  assert.equal((await admin({ action: 'feedback', op: 'delete', id })).body.feedback.length, 1);
  assert.equal((await admin({ action: 'errors', op: 'clear' })).body.errors.length, 0);
  // freno: 20 por hora
  for (let i = 0; i < 19; i++) await fb('t1', { text: `opinión ${i}` });
  assert.equal((await fb('t1', { text: 'una más' })).code, 429);
});

test('activos: cuenta el mismo día del alta tras aprobar, y una sola vez', async () => {
  _resetMemory();
  process.env.CLUTCH_CODES = 'dueno';
  await setJson('tester:n1', { code: 'n1', status: 'pending', createdAt: TODAY, lastSeen: TODAY });
  const open = () => call(configHandler, { method: 'GET', headers: { 'x-clutch-code': 'n1' } });
  await open();
  assert.equal((await stats([], TODAY, 1)).daily[0].active, 0, 'pendiente no cuenta');
  await setJson('tester:n1', { code: 'n1', status: 'active', createdAt: TODAY, lastSeen: TODAY });
  await open(); await open();
  assert.equal((await stats([], TODAY, 1)).daily[0].active, 1);
});

test('panel: activos por día y retención', async () => {
  await setup();
  await call(configHandler, { method: 'GET', headers: { 'x-clutch-code': 't1' } }); // t1 abre hoy
  const s = await stats([{ code: 't1', status: 'active', approvedAt: '2026-09-01', lastSeen: TODAY }, { code: 'tx', status: 'active', approvedAt: '2026-09-01', lastSeen: '2026-09-01' }, { code: 't2', status: 'pending', createdAt: TODAY }], TODAY);
  assert.equal(s.daily.length, 14);
  assert.equal(s.daily.at(-1).active, 1);
  await call(eventHandler, { method: 'POST', headers: { 'x-clutch-code': 't1' }, body: { events: { copy: 2 } } });
  assert.equal((await call(adminHandler, { method: 'POST', headers: { 'x-admin-key': 'dueno' }, body: { action: 'reset-stats' } })).code, 200);
  const after = await stats([], TODAY, 1);
  assert.deepEqual(after.daily[0], { date: TODAY, active: 0, events: {} });
  assert.deepEqual(s.retention.d1, { eligible: 2, kept: 1 });
  assert.deepEqual(s.retention.d7, { eligible: 2, kept: 1 });
});

test('opinión desde la app', async () => {
  let body;
  const ok = await sendFeedback({ testerCode: 't1' }, { text: 'hola', screen: 'yo', version: 'v' }, async (url, o) => { body = JSON.parse(o.body); return { ok: true }; });
  assert.deepEqual(ok, { ok: true });
  assert.deepEqual(body, { kind: 'opinion', text: 'hola', screen: 'yo', version: 'v' });
  assert.deepEqual(await sendFeedback({}, { text: 'x' }, async () => ({ ok: false, json: async () => ({ error: 'limite' }) })), { ok: false, reason: 'limite' });
});
