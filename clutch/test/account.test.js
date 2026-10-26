import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import authHandler, { _setMailer, verifyGoogle } from '../api/auth.js';
import dataHandler from '../api/data.js';
import registerHandler from '../api/register.js';
import { _resetMemory, getJson } from '../api/_lib/db.js';
import { sendMail, buildMessage } from '../api/_lib/mail.js';
import { syncable, mergeStates } from '../js/engine/account.js';
import { emptyState } from '../js/core/store.js';

const mkRes = () => { const r = { code: 200, headers: {}, body: null }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.end = () => r; return r; };
const call = async (h, req) => { const r = mkRes(); await h({ headers: {}, ...req }, r); return r; };
const auth = (body, ip = '2.2.2.2') => call(authHandler, { method: 'POST', headers: { 'x-forwarded-for': ip }, body });
const data = (method, token, body) => call(dataHandler, { method, headers: { authorization: `Bearer ${token}` }, body });

let sent = [];
function setup() {
  _resetMemory();
  for (const k of ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'VERCEL', 'GOOGLE_CLIENT_ID']) delete process.env[k];
  process.env.GMAIL_APP_PASSWORD = 'abcd efgh ijkl mnop';
  process.env.CLUTCH_DATA_KEY = Buffer.alloc(32, 7).toString('base64');
  sent = [];
  _setMailer(async (m) => { sent.push(m); return true; });
}
const lastCode = () => /(\d{6})/.exec(sent.at(-1).text)[1];

async function loginAs(email, extra = { terms: true }) {
  await auth({ action: 'start', email });
  return auth({ action: 'verify', email, code: lastCode(), ...extra });
}

test('cuenta: código por email, cuenta nueva = tester pendiente, y el mismo email vuelve a su cuenta', async () => {
  setup();
  assert.equal((await auth({ action: 'start', email: 'no-es-email' })).body.error, 'email');
  const r1 = await auth({ action: 'start', email: 'Pepe@Mail.es ' });
  assert.equal(r1.code, 200);
  assert.equal(sent[0].to, 'pepe@mail.es');
  assert.match(sent[0].text, /\d{6}/);
  assert.equal((await auth({ action: 'verify', email: 'pepe@mail.es', code: '000000' === lastCode() ? '111111' : '000000' })).body.error, 'codigo');
  assert.equal((await auth({ action: 'verify', email: 'pepe@mail.es', code: lastCode() })).body.error, 'condiciones', 'cuenta nueva exige condiciones');
  await auth({ action: 'start', email: 'pepe@mail.es' });
  const ok = await auth({ action: 'verify', email: 'pepe@mail.es', code: lastCode(), terms: true });
  assert.equal(ok.code, 200);
  assert.equal(ok.body.status, 'pending');
  assert.equal(ok.body.created, true);
  assert.ok(ok.body.token.length >= 30);
  const tester = await getJson(`tester:${ok.body.code}`);
  assert.equal(tester.email, 'pepe@mail.es');
  assert.equal(tester.group, 'base');
  // El código ya no sirve una segunda vez; otro inicio de sesión da la misma cuenta
  assert.equal((await auth({ action: 'verify', email: 'pepe@mail.es', code: lastCode() })).body.error, 'caducado');
  const again = await loginAs('pepe@mail.es', {});
  assert.equal(again.body.code, ok.body.code);
  assert.equal(again.body.created, false);
});

test('cuenta: un tester apuntado con el formulario antiguo entra con su email y conserva su código', async () => {
  setup();
  const old = await call(registerHandler, { method: 'POST', headers: { 'x-forwarded-for': '3.3.3.3' }, body: { alias: 'Ana', email: 'ana@mail.es', terms: true } });
  const r = await loginAs('ana@mail.es', {});
  assert.equal(r.body.code, old.body.code);
});

test('cuenta: 5 fallos invalidan el código; sin correo configurado avisa', async () => {
  setup();
  await auth({ action: 'start', email: 'x@mail.es' });
  const wrong = lastCode() === '123456' ? '654321' : '123456';
  for (let i = 0; i < 4; i++) assert.equal((await auth({ action: 'verify', email: 'x@mail.es', code: wrong })).body.error, 'codigo');
  assert.equal((await auth({ action: 'verify', email: 'x@mail.es', code: wrong })).body.error, 'caducado');
  delete process.env.GMAIL_APP_PASSWORD;
  assert.equal((await auth({ action: 'start', email: 'x@mail.es' })).body.error, 'sin-correo');
  const info = await call(authHandler, { method: 'GET' });
  assert.deepEqual(info.body, { email: false, google: null });
});

test('datos: cifrados en el servidor, con versión, conflicto entre móviles y borrado de cuenta', async () => {
  setup();
  const { body: s } = await loginAs('luis@mail.es');
  assert.equal((await data('GET', 'x'.repeat(32))).code, 401);
  assert.deepEqual((await data('GET', s.token)).body, { state: null, rev: 0 });
  const state = { profiles: [{ id: 'p1', name: 'Raquel', tastes: ['sushi'] }], inbox: [], deleted: [] };
  assert.equal((await data('PUT', s.token, { state, baseRev: 0 })).body.rev, 1);
  const raw = JSON.stringify(await getJson(`data:${s.code}`));
  assert.ok(!raw.includes('Raquel') && !raw.includes('sushi'), 'guardado cifrado');
  assert.equal((await data('GET', s.token)).body.state.profiles[0].name, 'Raquel');
  // Otro móvil con una versión vieja: 409 con lo último, para mezclar
  const stale = await data('PUT', s.token, { state: { profiles: [] }, baseRev: 0 });
  assert.equal(stale.code, 409);
  assert.equal(stale.body.rev, 1);
  assert.equal(stale.body.state.profiles[0].name, 'Raquel');
  assert.equal((await data('PUT', s.token, { state: { profiles: [], big: 'x'.repeat(950000) }, baseRev: 1 })).code, 413);
  // Dos sesiones (dos móviles); al borrar la cuenta dejan de valer las dos
  const { body: s2 } = await loginAs('luis@mail.es', {});
  assert.equal((await data('DELETE', s.token)).code, 200);
  assert.equal(await getJson(`data:${s.code}`), null);
  assert.equal((await data('GET', s2.token)).code, 401);
  delete process.env.CLUTCH_DATA_KEY;
  assert.equal((await data('GET', s2.token)).body.error, 'sin-clave');
});

test('google: solo tokens para nuestra app y con email verificado', async () => {
  process.env.GOOGLE_CLIENT_ID = 'cliente.apps.googleusercontent.com';
  const fake = (o) => async () => ({ ok: true, json: async () => ({ iss: 'https://accounts.google.com', aud: 'cliente.apps.googleusercontent.com', email: 'Eva@Gmail.com', email_verified: 'true', ...o }) });
  assert.equal(await verifyGoogle('a.b.c', fake({})), 'eva@gmail.com');
  assert.equal(await verifyGoogle('a.b.c', fake({ aud: 'otra-app' })), null);
  assert.equal(await verifyGoogle('a.b.c', fake({ email_verified: 'false' })), null);
  assert.equal(await verifyGoogle('a.b.c', fake({ iss: 'evil.com' })), null);
  assert.equal(await verifyGoogle('no-es-token', fake({})), null);
  delete process.env.GOOGLE_CLIENT_ID;
});

test('correo: conversación SMTP completa y mensaje en UTF-8', async () => {
  process.env.GMAIL_APP_PASSWORD = 'clave';
  const said = [];
  const fakeSock = () => {
    const s = new EventEmitter();
    const replies = { EHLO: '250-smtp\r\n250 OK\r\n', AUTH: '235 ok\r\n', MAIL: '250 ok\r\n', RCPT: '250 ok\r\n', DATA: '354 go\r\n', QUIT: '221 bye\r\n' };
    s.write = (line) => { said.push(line); const k = line.split(/[ :\r]/)[0]; setImmediate(() => s.emit('data', Buffer.from(replies[k] || '250 queued\r\n'))); };
    s.destroy = () => {};
    setImmediate(() => s.emit('data', Buffer.from('220 hola\r\n')));
    return s;
  };
  assert.equal(await sendMail({ to: 'a@b.es', subject: 'Código', text: 'Tu código: 123456' }, { connect: fakeSock }), true);
  assert.ok(said.some((l) => l.startsWith('RCPT TO:<a@b.es>')));
  assert.ok(said.some((l) => l.includes(Buffer.from('Tu código: 123456').toString('base64'))));
  await assert.rejects(sendMail({ to: 'a@b.es\r\nRCPT TO:<x@y.z>', subject: 's', text: 't' }, { connect: fakeSock }));
  assert.match(buildMessage({ from: 'f@g.com', to: 'a@b.es', subject: 'Código', text: 'x' }), /Subject: =\?UTF-8\?B\?/);
});

test('sincronizar: sin fotos ni ajustes del móvil; gana lo último cambiado; lo borrado no vuelve', () => {
  const local = { ...emptyState(), profiles: [
    { id: 'a', name: 'Raquel', updatedAt: 200, gifts: [{ id: 'g1', text: 'collar', photo: 'data:image/jpeg;base64,AAA' }], remember: [] },
    { id: 'b', name: 'Vieja', updatedAt: 100, gifts: [], remember: [] }
  ], inbox: [{ id: 'i1', text: 'algo' }, { id: 'i2', photo: 'data:...' }], activeId: 'a' };
  local.settings = { ...local.settings, pinHash: 'secreto', theme: 'dark', city: { name: 'Málaga' }, session: { token: 't' } };
  const up = syncable(local);
  assert.ok(!JSON.stringify(up).includes('base64'), 'sin fotos');
  assert.ok(!JSON.stringify(up).includes('secreto') && !('theme' in up.settings) && !('session' in up.settings));
  assert.deepEqual(up.inbox.map((i) => i.id), ['i1']);
  const remote = { profiles: [
    { id: 'a', name: 'Raquel (vieja)', updatedAt: 150, gifts: [{ id: 'g1', text: 'collar' }], remember: [] },
    { id: 'b', name: 'Nueva en el otro móvil', updatedAt: 300, gifts: [{ id: 'g1x', text: 'x' }], remember: [] },
    { id: 'c', name: 'Borrada', updatedAt: 50, gifts: [], remember: [] }
  ], inbox: [], deleted: ['c'], settings: { city: { name: 'Madrid' }, companionStyle: 'cordial' } };
  const m = mergeStates(local, remote);
  assert.deepEqual(m.profiles.map((p) => p.name).sort(), ['Nueva en el otro móvil', 'Raquel']);
  assert.equal(m.profiles.find((p) => p.id === 'a').gifts[0].photo, 'data:image/jpeg;base64,AAA', 'la foto del móvil se conserva');
  assert.equal(m.settings.city.name, 'Málaga', 'lo del móvil manda');
  assert.equal(m.settings.pinHash, 'secreto');
  // Borrado en este móvil: no vuelve aunque el servidor aún lo tenga
  const m2 = mergeStates({ ...m, profiles: m.profiles.filter((p) => p.id !== 'b'), deleted: [...m.deleted, 'b'] }, remote);
  assert.ok(!m2.profiles.some((p) => p.id === 'b'));
  // Móvil nuevo (vacío): recibe todo de la cuenta
  const fresh = mergeStates(emptyState(), remote);
  assert.equal(fresh.profiles.length, 2);
  assert.equal(fresh.settings.city.name, 'Madrid');
  assert.ok(fresh.activeId);
});
