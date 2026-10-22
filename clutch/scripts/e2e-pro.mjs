import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const calls = [];
await page.route('https://mock.test/api/ai', async (route) => {
  const body = JSON.parse(route.request().postData());
  calls.push({ body, code: route.request().headers()['x-clutch-code'] });
  const out = body.task === 'rewrite' ? { text: 'oye {n}, ya son 100 días juntos' }
    : body.task === 'sos' ? { text: 'Respira. Escríbele: "Lo siento, hablemos".' }
    : { dest: 'regalos', field: '', value: 'collar dorado', confidence: 'alta' };
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
});
await page.route('https://overpass-api.de/api/interpreter', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ elements: [
    { type: 'node', lat: 36.72, lon: -4.42, tags: { name: 'Mirador de Gibralfaro', tourism: 'viewpoint' } },
    { type: 'node', lat: 36.73, lon: -4.43, tags: { name: 'Parque de Málaga', leisure: 'park' } }] }) });
});
await page.goto(pathToFileURL(resolve('dist/index.html')).href);
const txt = () => page.locator('#app').innerText();

await page.fill('#f-name', 'Lucía');
await page.fill('#f-birth', '1997-05-14');
await page.click('button:has-text("Pareja")');
await page.fill('#f-since', '2026-07-14');
await page.click('text=Crear su ficha');

// Yo: ciudad, acompañante PRO, estilo, IA
await page.click('.nav button:has-text("Yo")');
await page.selectOption('#city-sel', 'Málaga');
await page.click('.chip:has-text("Mentor tranquilo")');
await page.fill('#style-in', 'jaja vale, nos vemos 😂\noye q tal el finde 😂\nva, luego te escribo jaja\nok 😂');
await page.click('text=Aprender mi estilo');
assert.match(await txt(), /Aprendido: mensajes cortos/);
await page.fill('#ai-url', 'https://mock.test/api/ai');
await page.fill('#ai-code', 'tester1');
await page.dispatchEvent('#ai-code', 'change');
await page.dispatchEvent('#ai-url', 'change');
await page.click('.nav button:has-text("Ella")');
await page.click('.nav button:has-text("Yo")');
assert.match(await txt(), /Servidor configurado/);

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
await page.setInputFiles('input[type=file] >> nth=1', '/tmp/test-photo.jpg');
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
await page.fill('#imp-text', enc);
await page.fill('#pass-in', 'mala-clave');
await page.click('button:has-text("Restaurar o importar")');
await page.waitForSelector('text=Contraseña incorrecta');
await page.fill('#pass-in', 'clave-secreta-1');
await page.click('button:has-text("Restaurar o importar")');
await page.waitForSelector('text=copia restaurada');
await page.waitForSelector('h1:has-text("Lucía")');

// Modo gratis: lo PRO se bloquea
await page.click('.nav button:has-text("Yo")');
await page.click('button[role=switch][data-v=pro]');
assert.match(await txt(), /Reconocer|PRO/);
await page.click('.nav button:has-text("Hoy")');
assert.match(await txt(), /Planes cerca\s*\n?.*PRO|PRO/);
assert.equal(await page.locator('text=Buscar planes').count(), 0);
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
assert.deepEqual(errors, [], errors.join('\n'));
await browser.close();
console.log('E2E PRO OK');
