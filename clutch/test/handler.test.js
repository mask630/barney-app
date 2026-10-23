import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/ai.js';

const mkRes = () => { const r = { code: 200, headers: {}, body: null }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.end = () => r; return r; };
const req = (o = {}) => ({ method: 'POST', headers: { origin: 'https://mask630.github.io', 'x-clutch-code': 'tester1' }, body: { task: 'rewrite', band: '25-34', group: 'pareja', message: 'hoy hace 100 días', facts: [] }, ...o });

test('servidor: sin configurar, sin código y con código', async () => {
  const realFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, o) => { sent = { url, o }; return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'ya son 100 días' }] }) }; };
  try {
    delete process.env.ANTHROPIC_API_KEY; delete process.env.CLUTCH_CODES;
    let r = mkRes(); await handler(req(), r); assert.equal(r.code, 503);
    process.env.ANTHROPIC_API_KEY = 'sk-test'; process.env.CLUTCH_CODES = 'tester1,tester2'; process.env.CLUTCH_ORIGINS = 'https://mask630.github.io';
    r = mkRes(); await handler(req({ headers: { 'x-clutch-code': 'mal' } }), r); assert.equal(r.code, 401);
    r = mkRes(); await handler(req({ method: 'GET' }), r); assert.equal(r.code, 405);
    r = mkRes(); await handler(req(), r);
    assert.equal(r.code, 200);
    assert.equal(r.body.text, 'ya son 100 días');
    assert.equal(r.headers['Access-Control-Allow-Origin'], 'https://mask630.github.io');
    assert.equal(sent.url, 'https://api.anthropic.com/v1/messages');
    assert.equal(sent.o.headers['x-api-key'], 'sk-test');
    // la IA inventa un número: se descarta
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'ya son 200 días' }] }) });
    r = mkRes(); await handler(req(), r); assert.equal(r.body.text, null);
    // fallo del proveedor
    globalThis.fetch = async () => ({ ok: false });
    r = mkRes(); await handler(req(), r); assert.equal(r.code, 502);
    // tarea no válida
    r = mkRes(); await handler(req({ body: { task: 'x', band: '25-34', group: 'pareja' } }), r); assert.equal(r.code, 400);
  } finally { globalThis.fetch = realFetch; }
});

test('análisis de perfil: hasta 6 capturas jpeg, respuesta limpia y con límites', async () => {
  const { buildRequest, parseProfile } = await import('../api/ai.js');
  const ph = 'data:image/jpeg;base64,AAAA';
  const b = buildRequest({ task: 'profile', photos: Array(9).fill(ph), band: '25-34', group: 'pareja' });
  assert.equal(b.payload.messages[0].content.filter((c) => c.type === 'image').length, 6);
  assert.match(b.payload.system, /datos sensibles/);
  assert.equal(buildRequest({ task: 'profile', photos: [], band: '25-34' }).error, 'foto');
  assert.equal(buildRequest({ task: 'profile', photos: ['data:image/png;base64,AAAA'], band: '25-34' }).error, 'foto');
  const r = parseProfile('```json\n' + JSON.stringify({ gustos: ['sushi', 'yoga', 3], regalos: ['x'.repeat(99)], lectura: 'Le encanta viajar.' }) + '\n```');
  assert.deepEqual(r.gustos, ['sushi', 'yoga', '3']);
  assert.equal(r.regalos[0].length, 60);
  assert.deepEqual(r.evitar, []);
  assert.equal(parseProfile('no es json'), null);
});
