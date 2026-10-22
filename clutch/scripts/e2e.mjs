import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const url = pathToFileURL(resolve('dist/index.html')).href;
const browser = await chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : { executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }), args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.addInitScript(() => {
  if (!localStorage.getItem('clutch_v2')) localStorage.setItem('barney_v9', JSON.stringify({ city: 'Málaga', girls: [
    { id: 1, name: 'Marta', stage: 'dating', bday: '1995-06-01', last: '2026-10-01', cycle: 28, cycleEnabled: false, favs: { Café: 'Cortado' }, sizes: { Calzado: '38' }, wish: [], events: [], dates: [] }] }));
});
await page.goto(url);
await page.waitForSelector('text=Encontré tus datos de Barney');
await page.click('text=Traer mis datos de Barney');
await page.waitForSelector('h1:has-text("Marta")');
await page.click('.nav button:has-text("Ella")');
await page.click('button:has-text("Editar")');
await page.click('text=Eliminar perfil');
await page.click('text=¿Seguro?');
await page.waitForSelector('text=Crear su ficha');
const txt = () => page.locator('#app').innerText();
const shot = (n) => page.screenshot({ path: `/tmp/claude-0/-home-claude/81aedb1f-9ad7-5fb0-af9c-647a397c196d/scratchpad/shot-${n}.png` });

// Onboarding: menor de edad rechazado
await page.fill('#f-name', 'Lucía');
await page.fill('#f-birth', '2012-03-03');
await page.click('text=Crear su ficha');
assert.match(await txt(), /18 años/);
// Alta correcta
await page.fill('#f-birth', '1997-05-14');
await page.click('button:has-text("Pareja")');
await page.fill('#f-since', '2026-07-14');
await page.click('text=Crear su ficha');
let t = await txt();
assert.match(t, /Lucía/);
assert.match(t, /100 días/, 'hito de 100 días visible: ' + t.slice(0, 300));
await shot('hoy');
// Gesto
await page.click('.gesture >> nth=0');
assert.equal(await page.locator('.gesture[aria-pressed=true]').count(), 1);
// Escríbele
await page.click('text=Escríbele >> nth=0');
t = await txt();
assert.match(t, /Dato real/);
await shot('escribele');
await page.click('button[aria-label=Volver]');
// Apuntar
await page.click('.nav button:has-text("Apuntar")');
await page.fill('#cap-text', 'Su anillo es una talla 14');
await page.click('text=Clasificar >> nth=0');
t = await txt();
assert.match(t, /va a/i);
assert.equal(await page.inputValue('#p-field'), 'anillo');
await shot('apuntar');
await page.click('text=Guardar aquí');
// Texto sin sentido → bandeja
await page.fill('#cap-text', 'mmm luego lo miro');
await page.click('text=Clasificar >> nth=0');
await page.click('text=Mandar a la Bandeja');
assert.match(await txt(), /bandeja · 1/i);
// Ella
await page.click('.nav button:has-text("Ella")');
t = await txt();
assert.match(t, /Tallas/);
assert.match(t, /anillo 14/);
await shot('ella');
// Cambiar etapa conserva datos
await page.click('.chip:has-text("Matrimonio")');
await page.click('button:has-text("Cambiar a Matrimonio")');
assert.match(await txt(), /anillo 14/);
// SOS
await page.click('.nav button:has-text("Hoy")');
await page.click('text=¿La has liado?');
await page.click('text=La he liado');
assert.match(await txt(), /mensaje para copiar/i);
await shot('sos');
await page.click('button[aria-label=Volver]');
// Yo + PIN
await page.click('.nav button:has-text("Yo")');
await page.click('button[role=switch][data-act=togglePin]');
await page.fill('#pin-new', '1234');
await page.click('button:has-text("Guardar")');
await page.waitForTimeout(300);
await shot('yo');
// recarga → bloqueo
await page.reload();
assert.match(await txt(), /Introduce tu PIN/);
for (const k of ['9', '9', '9', '9']) await page.click(`.keypad button:text-is("${k}")`);
assert.match(await txt(), /PIN incorrecto/);
for (const k of ['1', '2', '3', '4']) await page.click(`.keypad button:text-is("${k}")`);
await page.waitForTimeout(200);
assert.match(await txt(), /Lucía/);
// tema claro
await page.click('.nav button:has-text("Yo")');
await page.click('.chip:has-text("Claro")');
await shot('claro');
// sin desbordamiento horizontal
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
assert.equal(overflow, false, 'hay scroll horizontal');
assert.deepEqual(errors, [], 'errores de consola: ' + errors.join('\n'));
await browser.close();
console.log('E2E OK');
