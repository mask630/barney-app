import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : { executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const calls = [];
const ALL = ['multi_profile', 'ai_rewrite', 'my_style', 'companions_pro', 'sos_chat', 'photo_ai', 'plans', 'encrypted_backup'];
let granted = ALL;
const json = (route, out, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
let newStatus = 'pending';
const events = [], feedback = [];
await page.route('https://clutch-ia.vercel.app/api/event', (route) => { events.push(JSON.parse(route.request().postData())); json(route, { ok: true }); });
await page.route('https://clutch-ia.vercel.app/api/feedback', (route) => { feedback.push(JSON.parse(route.request().postData())); json(route, { ok: true }); });
const registrations = [];
await page.route('https://clutch-ia.vercel.app/api/register', (route) => {
  registrations.push(JSON.parse(route.request().postData()));
  json(route, { code: 'nuevo1', status: 'pending' });
});
await page.route('https://clutch-ia.vercel.app/api/config', (route) => {
  const code = route.request().headers()['x-clutch-code'];
  if (code === 'nuevo1') return json(route, newStatus === 'active' ? { status: 'active', group: 'base', features: [] } : { status: newStatus, group: null, features: [] });
  json(route, code === 'tester1' ? { status: 'active', group: 'admin', features: granted } : { status: 'anon', group: null, features: [] });
});
await page.route('https://clutch-ia.vercel.app/api/ai', async (route) => {
  const body = JSON.parse(route.request().postData());
  calls.push({ body, code: route.request().headers()['x-clutch-code'] });
  const out = body.task === 'rewrite' ? { text: 'oye {n}, ya son 100 días juntos' }
    : body.task === 'sos' ? { text: 'Respira. Escríbele: "Lo siento, hablemos".' }
    : { dest: 'regalos', field: '', value: 'collar dorado', confidence: 'alta' };
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
});
await page.route('https://clutch-ia.vercel.app/api/plans', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ elements: [
    { type: 'node', lat: 36.72, lon: -4.42, tags: { name: 'Mirador de Gibralfaro', tourism: 'viewpoint' } },
    { type: 'node', lat: 36.73, lon: -4.43, tags: { name: 'Parque de Málaga', leisure: 'park' } }] }) });
});
await page.goto(pathToFileURL(resolve('dist/index.html')).href);
const txt = () => page.locator('#app').innerText();

await page.fill('#f-name', 'Lucía');
await page.fill('#f-birth', '1997-05-14');
await page.click('button:has-text("Pareja")');
// inicio hace exactamente 100 días (fecha local), para que el hito salga cualquier día que se ejecute
await page.fill('#f-since', await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 100); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }));
await page.click('text=Crear su ficha');

// Hoy invita a apuntarse; el alta exige aceptar condiciones y queda pendiente hasta que el dueño apruebe
assert.match(await txt(), /Únete a la beta/);
await page.click('button:has-text("Únete a la beta")');
assert.equal(await page.locator('text=Aprender mi estilo').count(), 0);
await page.fill('#j-alias', 'Pepe');
await page.fill('#j-email', 'pepe@mail.es');
await page.click('text=Apuntarme');
await page.waitForSelector('text=Tienes que aceptar las condiciones');
await page.click('text=Leer condiciones y privacidad');
await page.waitForSelector('text=Condiciones y privacidad');
assert.match(await txt(), /Qué se queda en tu móvil/);
await page.click('.sheet button:has-text("Cerrar")');
await page.check('input[data-v=terms]');
await page.click('text=Apuntarme');
await page.waitForSelector('text=Solicitud enviada');
assert.deepEqual(registrations[0], { alias: 'Pepe', email: 'pepe@mail.es', terms: true, metrics: false });
newStatus = 'active';
await page.click('text=Comprobar acceso');
await page.waitForSelector('text=¡Ya estás dentro de la beta!');
assert.match(await txt(), /Acceso activo/);
assert.equal(await page.locator('text=Aprender mi estilo').count(), 0, 'grupo base: sin funciones extra');
// grupo base: una sola persona
await page.click('.nav button:has-text("Ella")');
await page.click('button[data-act=newProfileSheet]');
await page.waitForSelector('text=Tener varias personas llegará pronto');
assert.equal(await page.locator('#f-name').count(), 0, 'no se abre el formulario');
await page.click('.nav button:has-text("Yo")');
await page.fill('#ai-code', 'tester1');
await page.dispatchEvent('#ai-code', 'change');
await page.waitForSelector('text=Acceso activo');
// con «Varias personas» sí se puede añadir otra
await page.click('.nav button:has-text("Ella")');
await page.click('button[data-act=newProfileSheet]');
await page.waitForSelector('#f-name');
await page.click('.sheet button:has-text("Cancelar")');
await page.click('.nav button:has-text("Yo")');
await page.selectOption('#city-sel', 'Málaga');
await page.click('.chip:has-text("Mentor tranquilo")');
await page.fill('#style-in', 'jaja vale, nos vemos 😂\noye q tal el finde 😂\nva, luego te escribo jaja\nok 😂');
await page.click('text=Aprender mi estilo');
assert.match(await txt(), /Aprendido: mensajes cortos/);

// Hoy: acompañante, planes
await page.click('.nav button:has-text("Hoy")');
assert.match(await txt(), /Con calma|constancia|presencia|Fíjate/i);
await page.click('text=Buscar planes');
await page.waitForSelector('text=Ver el atardecer desde Mirador de Gibralfaro');

// Escríbele: con mi estilo, IA
await page.click('text=Escríbele >> nth=0');
await page.click('text=Con mi estilo >> nth=0');
let t = await txt();
assert.match(t, /Versión adaptada/);
assert.match(t, /😂/);
await page.click('text=Ver original');
await page.click('text=Reescribir con IA >> nth=0');
await page.waitForSelector('text=Versión adaptada');
assert.match(await txt(), /oye Lucía, ya son 100 días juntos/);
const rw = calls.find((c) => c.body.task === 'rewrite');
assert.equal(rw.code, 'tester1');
assert.ok(!JSON.stringify(rw.body).includes('Lucía'), 'el nombre no debe viajar al servidor');
assert.ok(rw.body.message.includes('{n}'));
await page.click('button[aria-label=Volver]');

// SOS chat
await page.click('text=¿La has liado?');
await page.fill('#chat-in', 'Se me olvidó el cumple de Lucía');
await page.click('button:has-text("Enviar")');
await page.waitForSelector('text=Respira. Escríbele');
const sos = calls.find((c) => c.body.task === 'sos');
assert.ok(!JSON.stringify(sos.body).includes('Lucía'));
await page.click('button[aria-label=Volver]');

// Apuntar: foto + IA
await page.click('.nav button:has-text("Apuntar")');
await page.setInputFiles('input[type=file] >> nth=1', resolve('public/icon-192.png'));
await page.waitForSelector('img.thumb');
await page.click('text=Reconocer con IA');
await page.waitForSelector('#p-val');
assert.equal(await page.inputValue('#p-val'), 'collar dorado');
await page.click('text=Guardar aquí');
await page.click('.nav button:has-text("Ella")');
await page.click('button.item:has-text("Regalos")');
assert.match(await txt(), /collar dorado/);
assert.equal(await page.locator('.sheet img.thumb').count(), 1);
await page.click('text=Cerrar');

// Copia cifrada ida y vuelta
await page.click('.nav button:has-text("Yo")');
await page.fill('#pass-in', 'clave-secreta-1');
await page.click('button:has-text("Copia cifrada")');
const enc = await page.inputValue('#exp-text');
assert.ok(enc.includes('clutchEnc') && !enc.includes('Lucía'));
await page.click('text=Borrar todos mis datos');
await page.click('text=¿Seguro?');
assert.match(await txt(), /Crear su ficha/);
// restaurar desde el inicio: es PRO, primero el código de tester
await page.click('text=¿Ya usabas Clutch? Restaurar mi copia');
await page.fill('#r-code', 'tester1');
await page.click('button[data-act=restoreCheck]');
await page.waitForSelector('#imp-text');
await page.fill('#imp-text', enc);
await page.fill('#pass-in', 'mala-clave');
await page.click('button:has-text("Restaurar o importar")');
await page.waitForSelector('text=Contraseña incorrecta');
await page.fill('#pass-in', 'clave-secreta-1');
await page.click('button:has-text("Restaurar o importar")');
await page.waitForSelector('text=copia restaurada');
await page.waitForSelector('h1:has-text("Lucía")');

// Estadísticas: nada se envía sin permiso; con permiso, solo recuentos y sin datos de ella
const hide = () => page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { value: false, configurable: true }); });
await hide();
await page.waitForTimeout(300);
assert.equal(events.filter((e) => e.events).length, 0, 'sin permiso no se envía nada');
await page.click('.nav button:has-text("Yo")');
await page.click('button[role=switch][data-v=metrics]');
await page.waitForTimeout(200);
assert.deepEqual(events.at(-1), { consent: true });
await page.click('.nav button:has-text("Hoy")');
await page.click('text=Escríbele >> nth=0');
await page.click('button:has-text("Copiar") >> nth=0');
// copiar un mensaje sencillo lo deja descansando (se apunta en el móvil, por persona)
const mid = await page.getAttribute('button[data-act=copy]:not([data-mid=""]) >> nth=0', 'data-mid');
await page.click(`button[data-act=copy][data-mid="${mid}"]`);
const used = await page.evaluate(() => JSON.parse(localStorage.getItem('clutch_v2')).profiles[0].used);
assert.ok(used && /^\d{4}-\d{2}-\d{2}$/.test(used[mid]), 'mensaje apuntado como usado hoy');
await page.click('button[aria-label=Volver]');
await hide();
await page.waitForFunction(() => true);
await page.waitForTimeout(300);
const batch = events.filter((e) => e.events).at(-1);
assert.ok(batch, 'con permiso se envía');
assert.equal(batch.events.write_open, 1);
assert.equal(batch.events.copy, 2);
assert.ok(batch.events.tab_hoy >= 1);
assert.ok(!JSON.stringify(events).includes('Lucía'), 'nunca datos de ella');

// Avisos: el calendario se descarga con títulos discretos (sin nombres) por defecto
await page.click('.nav button:has-text("Yo")');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Añadir fechas a mi calendario')]);
assert.equal(dl.suggestedFilename(), 'agenda.ics');
const ics = await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8');
assert.ok(ics.includes('BEGIN:VCALENDAR') && ics.includes('Agenda · evento') && !ics.includes('Lucía'));

// Opinión: llega al servidor con la pantalla y la versión
await page.fill('#fb', 'Me gusta mucho la pantalla Hoy');
await page.click('button[data-act=sendFeedback]');
await page.waitForSelector('text=¡Gracias!');
assert.deepEqual(feedback.at(-1), { kind: 'opinion', text: 'Me gusta mucho la pantalla Hoy', screen: 'yo', version: 'Clutch beta 0.2' });

// El servidor cierra funciones (grupo base): la app las muestra como "Pronto" sin romperse
granted = [];
await page.click('.nav button:has-text("Yo")');
await page.fill('#ai-code', 'tester1');
await page.click('text=Comprobar acceso');
await page.waitForSelector('text=Acceso actualizado');
assert.equal(await page.locator('text=Aprender mi estilo').count(), 0);
await page.click('.nav button:has-text("Hoy")');
assert.match(await txt(), /Planes cerca[\s\S]*Pronto/);
assert.equal(await page.locator('text=Buscar planes').count(), 0);
await page.click('text=Escríbele >> nth=0');
assert.equal(await page.locator('text=Reescribir con IA').count(), 0);
assert.equal(await page.locator('text=Con mi estilo').count(), 0);
await page.click('button[aria-label=Volver]');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
assert.deepEqual(errors, [], errors.join('\n'));
await browser.close();
console.log('E2E PRO OK');
