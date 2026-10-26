// Cuentas en un móvil simulado: crear cuenta con email + código, recibir lo de otro móvil, subir lo nuevo,
// cerrar sesión (se borra del móvil) y volver a entrar (vuelve todo). El servidor se simula.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : { executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const json = (route, out, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });

// «Servidor»: una cuenta con una ficha creada en otro móvil.
let server = { rev: 3, state: { profiles: [{ id: 'pX', name: 'Raquel', birth: '1995-02-10', band: null, stage: 'pareja', since: null, tastes: ['sushi'], sizes: {}, gifts: [], events: [], remember: [], avoid: [], cycle: { enabled: false, lastStart: null, length: 28, starts: [] }, history: [], createdAt: '2026-10-01', updatedAt: 1 }], inbox: [], deleted: [], activeId: 'pX', settings: {} } };
const puts = [], authCalls = [];
await page.route('https://clutch-ia.vercel.app/api/auth', (route) => {
  const r = route.request();
  if (r.method() === 'GET') return json(route, { email: true, google: null });
  const b = JSON.parse(r.postData());
  authCalls.push({ ...b, authorization: r.headers().authorization });
  if (b.action === 'start') return json(route, { ok: true });
  if (b.action === 'verify') return b.code === '123456' ? json(route, { token: 'tok_'.padEnd(32, 'x'), code: 'cuenta1', status: 'pending', email: b.email, created: false }) : json(route, { error: 'codigo' }, 400);
  return json(route, { ok: true });
});
await page.route('https://clutch-ia.vercel.app/api/data', (route) => {
  const r = route.request();
  assert.equal(r.headers().authorization, `Bearer ${'tok_'.padEnd(32, 'x')}`);
  if (r.method() === 'GET') return json(route, server);
  const b = JSON.parse(r.postData());
  puts.push(b);
  if (b.baseRev !== server.rev) return json(route, server, 409);
  server = { rev: server.rev + 1, state: b.state };
  return json(route, { rev: server.rev });
});
await page.route('https://clutch-ia.vercel.app/api/config', (route) => json(route, { status: 'pending', group: null, features: [] }));
await page.route('https://clutch-ia.vercel.app/api/event', (route) => json(route, { ok: true }));

await page.goto(pathToFileURL(resolve('dist/index.html')).href);
const txt = () => page.locator('#app').innerText();

// Entrar: hace falta aceptar las condiciones; luego llega el código
await page.waitForSelector('text=Entra o crea tu cuenta');
await page.fill('#l-email', 'Pepe@Mail.es');
await page.click('text=Enviarme el código');
await page.waitForSelector('text=Tienes que aceptar las condiciones');
await page.click('button[data-act=legalSheet]');
assert.match(await txt(), /Dónde se guarda lo que apuntas/);
await page.click('.sheet button:has-text("Cerrar")');
await page.check('input[data-v=terms]');
await page.click('text=Enviarme el código');
await page.waitForSelector('#l-code');
assert.match(await txt(), /pepe@mail\.es/);
await page.fill('#l-code', '000000');
await page.click('button:has-text("Entrar")');
await page.waitForSelector('text=Código incorrecto');
await page.fill('#l-code', '123456');
await page.click('button:has-text("Entrar")');
// Lo del otro móvil aparece aquí
await page.waitForSelector('h1:has-text("Raquel")');

// Lo que se apunta aquí sube a la cuenta (sin fotos)
await page.waitForTimeout(500);
const revBefore = server.rev; // al entrar puede subir ya algo del móvil (país, ficha activa)
await page.click('.nav button:has-text("Ella")');
await page.click('button.item:has-text("Gustos")');
await page.fill('#add-text', 'flores');
await page.click('.sheet button:has-text("Añadir")');
await page.click('.sheet button:has-text("Cerrar")');
await page.waitForFunction(() => true);
await page.waitForTimeout(3200);
assert.ok(puts.length >= 1, 'se sube');
assert.deepEqual(server.state.profiles[0].tastes, ['sushi', 'flores']);
assert.equal(server.rev, revBefore + 1);

// Otro móvil cambia algo a la vez: conflicto 409 → se mezcla y se vuelve a subir sin perder nada
server = { rev: 9, state: { ...server.state, profiles: [...server.state.profiles, { ...server.state.profiles[0], id: 'pY', name: 'Otra', updatedAt: 5 }] } };
await page.click('button.item:has-text("Evitar")');
await page.fill('#add-text', 'el cilantro');
await page.click('.sheet button:has-text("Añadir")');
await page.click('.sheet button:has-text("Cerrar")');
await page.waitForTimeout(3500);
assert.equal(server.rev, 10);
assert.deepEqual(server.state.profiles.map((p) => p.name).sort(), ['Otra', 'Raquel']);
assert.deepEqual(server.state.profiles.find((p) => p.id === 'pX').avoid, ['el cilantro']);

// Yo: cuenta visible; cerrar sesión borra el móvil
await page.click('.nav button:has-text("Yo")');
assert.match(await txt(), /pepe@mail\.es/);
assert.equal(await page.locator('#ai-code').count(), 0, 'con cuenta no se pide código');
await page.click('text=Cerrar sesión');
await page.click('text=¿Seguro?');
await page.waitForSelector('text=Entra o crea tu cuenta');
assert.ok(!(await page.evaluate(() => localStorage.getItem('clutch_v2') || '')).includes('Raquel'), 'el móvil queda limpio');
assert.ok(authCalls.some((c) => c.action === 'logout'));

// Volver a entrar: vuelve todo
await page.fill('#l-email', 'pepe@mail.es');
await page.check('input[data-v=terms]');
await page.click('text=Enviarme el código');
await page.fill('#l-code', '123456');
await page.click('button:has-text("Entrar")');
await page.waitForSelector('h1:has-text("Raquel")');
await page.click('.nav button:has-text("Ella")');
assert.match(await txt(), /Otra/);

assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
assert.deepEqual(errors, [], errors.join('\n'));
await browser.close();
console.log('E2E CUENTA OK');
