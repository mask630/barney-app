import test from 'node:test';
import assert from 'node:assert/strict';
import adminHandler from '../api/admin.js';
import authHandler, { _setMailer } from '../api/auth.js';
import dataHandler from '../api/data.js';
import aiHandler from '../api/ai.js';
import { _resetMemory, getJson, setJson, setList, listAll } from '../api/_lib/db.js';
import { validSubscription } from '../api/_lib/push.js';
import { purgeAccount } from '../api/_lib/account.js';
import { maskName } from '../js/engine/ai.js';
import { giftIdeas, reminders } from '../js/engine/agenda.js';
import { mergeStates, syncable } from '../js/engine/account.js';
import { decidePlans } from '../js/engine/decider.js';
import { putPhoto, photoSrc, delPhoto, _clearMem } from '../js/core/photos.js';
import { newProfile, emptyState } from '../js/core/store.js';

const mkRes = () => {
  const r = { code: 200, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  return r;
};
const call = async (h, req) => { const r = mkRes(); await h({ headers: {}, ...req }, r); return r; };

function setupEnv() {
  _resetMemory();
  for (const k of ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'VERCEL']) delete process.env[k];
  process.env.CLUTCH_ADMIN = 'secret-admin-key';
  process.env.CLUTCH_CODES = 'owner1';
  process.env.GMAIL_APP_PASSWORD = 'abcd efgh ijkl mnop';
  process.env.CLUTCH_DATA_KEY = Buffer.alloc(32, 9).toString('base64');
  process.env.ANTHROPIC_API_KEY = 'sk-test-key';
}

test('push: validSubscription solo acepta hosts oficiales de Web Push', () => {
  assert.equal(validSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }), true);
  assert.equal(validSubscription({ endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/abc' }), true);
  assert.equal(validSubscription({ endpoint: 'https://wns2-par02p.notify.windows.com/w/?token=1' }), true);
  assert.equal(validSubscription({ endpoint: 'https://web.push.apple.com/QAbc' }), true);
  assert.equal(validSubscription({ endpoint: 'https://169.254.169.254/latest/meta-data/' }), false);
  assert.equal(validSubscription({ endpoint: 'https://evil.com/hook' }), false);
  assert.equal(validSubscription({ endpoint: 'http://fcm.googleapis.com/x' }), false);
  assert.equal(validSubscription({ endpoint: 'https://user:pass@fcm.googleapis.com/x' }), false);
});

test('admin: rate-limit tras 10 fallos seguidos desde la misma IP', async () => {
  setupEnv();
  for (let i = 0; i < 10; i++) {
    const r = await call(adminHandler, { method: 'GET', headers: { 'x-real-ip': '9.9.9.9', 'x-admin-key': 'bad' } });
    assert.equal(r.code, 401);
  }
  const blocked = await call(adminHandler, { method: 'GET', headers: { 'x-real-ip': '9.9.9.9', 'x-admin-key': 'bad' } });
  assert.equal(blocked.code, 429);
  assert.equal(blocked.body.error, 'limite');
});

test('auth: start respeta beta cerrada sin gastar SMTP', async () => {
  setupEnv();
  let mails = 0;
  _setMailer(async () => { mails++; return true; });
  await setJson('beta:settings', { open: false, maxTesters: 50, aiPerDay: 30 });
  const r = await call(authHandler, { method: 'POST', headers: { 'x-real-ip': '3.3.3.3' }, body: { action: 'start', email: 'nuevo@test.es' } });
  assert.equal(r.code, 403);
  assert.equal(r.body.error, 'cerrado');
  assert.equal(mails, 0);
});

test('cuenta: purgeAccount y DELETE /api/data borran tester, email, push y anonimizan opiniones', async () => {
  setupEnv();
  let sent = [];
  _setMailer(async (m) => { sent.push(m); return true; });
  await call(authHandler, { method: 'POST', body: { action: 'start', email: 'ana@test.es' } });
  const code = /(\d{6})/.exec(sent[0].text)[1];
  const login = await call(authHandler, { method: 'POST', body: { action: 'verify', email: 'ana@test.es', code, terms: true } });
  const c = login.body.code;
  await setJson(`push:${c}`, { endpoint: 'https://fcm.googleapis.com/fcm/send/1' });
  await setList('feedback', [{ id: 'f1', code: c, alias: 'ana', text: 'hola' }, { id: 'f2', code: 'otro', alias: 'pepe', text: 'bien' }]);

  const delRes = await call(dataHandler, { method: 'DELETE', headers: { authorization: `Bearer ${login.body.token}` } });
  assert.equal(delRes.code, 200);
  assert.equal(await getJson(`tester:${c}`), null);
  assert.equal(await getJson('email:ana@test.es'), null);
  assert.equal(await getJson(`push:${c}`), null);

  await purgeAccount('otro', null);
  const fbs = await listAll('feedback');
  assert.equal(fbs[0].alias, null);
  assert.equal(fbs[1].alias, null);
});

test('ai: petición inválida no consume la cuota diaria del tester', async () => {
  setupEnv();
  await setJson('tester:t1', { code: 't1', alias: 'T1', status: 'active', group: 'pro-1' });
  const bad = await call(aiHandler, { method: 'POST', headers: { 'x-clutch-code': 't1' }, body: { task: 'rewrite', band: '99-99', group: 'pareja', message: 'hola' } });
  assert.equal(bad.code, 400);
  const todayISO = new Date().toISOString().slice(0, 10);
  assert.equal(await getJson(`ai:t1:${todayISO}`), null);
});

test('maskName: enmascara sin depender de tildes ni mayúsculas', () => {
  assert.equal(maskName('Buenos días Lucía, ¿qué tal lucia?', 'Lucía'), 'Buenos días {n}, ¿qué tal {n}?');
  assert.equal(maskName('Para LUCÍA con cariño', 'Lucía'), 'Para {n} con cariño');
  assert.equal(maskName('Luciano no se toca', 'Lucía'), 'Luciano no se toca');
});

test('agenda: excluye regalos ya entregados y genera aviso de seguimiento', () => {
  const p = {
    ...newProfile({ name: 'Marta', band: '25-34', stage: 'pareja' }, '2026-11-01').profile,
    gifts: [
      { id: 'g1', text: 'Bolso beige', status: 'given' },
      { id: 'g2', text: 'Auriculares', status: 'idea' }
    ],
    remember: [{ id: 'r1', text: 'Entrevista el lunes', followUp: '2026-11-10' }]
  };
  assert.deepEqual(giftIdeas(p), ['Auriculares']);
  const list = reminders(p, '2026-11-10');
  assert.ok(list.some((x) => x.kind === 'followup' && x.label === 'Entrevista el lunes'));
});

test('sync: settingsUpdatedAt más reciente del servidor prevalece', () => {
  const s1 = { ...emptyState(), settings: { ...emptyState().settings, city: { name: 'Madrid' }, settingsUpdatedAt: 100 } };
  const remoteNew = syncable({ ...emptyState(), settings: { ...emptyState().settings, city: { name: 'Sevilla' }, settingsUpdatedAt: 200 } });
  assert.equal(mergeStates(s1, remoteNew).settings.city.name, 'Sevilla');
});

test('decider y photos: 3 planes evitando lo que no le gusta + ref idb en memoria', async () => {
  const p = { ...newProfile({ name: 'Elena', band: '25-34', stage: 'pareja' }, '2026-11-01').profile, avoid: ['museo'] };
  const res = decidePlans(p, { weather: 'lluvia', budget: 'medio', time: 120 });
  assert.equal(res.length, 3);
  assert.ok(res.every((x) => !x.title.toLowerCase().includes('museo')));

  _clearMem();
  const ref = await putPhoto('ph1', 'data:image/jpeg;base64,AAA');
  assert.equal(ref, 'idb:ph1');
  assert.equal(photoSrc(ref), 'data:image/jpeg;base64,AAA');
  await delPhoto(ref);
  assert.equal(photoSrc(ref), '');
});
