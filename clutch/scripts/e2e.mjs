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
await page.goto(url);
await page.waitForSelector('text=Crear su ficha');
assert.ok(!/barney/i.test(await page.locator('#app').innerText()), 'el inicio no menciona Barney');
const txt = () => page.locator('#app').innerText();
const shot = (n) => process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/shot-${n}.png`, fullPage: true }) : null;

// Onboarding: el año se puede teclear número a número (antes se cortaba en «0001»)
await page.click('#f-birth');
await page.keyboard.type('14051997', { delay: 30 });
assert.equal(await page.inputValue('#f-birth'), '1997-05-14');
await page.fill('#f-birth', '');
// Solo con el nombre no basta: pide fecha o edad aproximada; con la edad aproximada vale
await page.fill('#f-name', 'Sin fecha');
await page.click('text=Crear su ficha');
assert.match(await txt(), /edad aproximada/);
await page.click('text=No sé su fecha');
await page.click('button[data-act=formBand][data-v="25-34"]');
await page.click('text=Crear su ficha');
await page.waitForSelector('h1:has-text("Sin fecha")');
assert.ok(!/OpenStreetMap|Prueba antes que nadie|Para desbloquear/.test(await txt()), 'Hoy sin explicaciones de más');
await page.click('.nav button:has-text("Ella")');
await page.click('button:has-text("Editar")');
await page.click('text=Eliminar perfil');
await page.click('text=¿Seguro?');
await page.waitForSelector('text=Crear su ficha');
assert.equal(await page.locator('text=Restaurar o importar').count(), 0, 'el inicio ya no pide importar');
// Onboarding: menor de edad rechazado
await page.fill('#f-name', 'Lucía');
await page.fill('#f-birth', '2012-03-03');
await page.click('text=Crear su ficha');
assert.match(await txt(), /18 años/);
// Alta correcta
await page.fill('#f-birth', '1997-05-14');
await page.click('button:has-text("Pareja")');
assert.equal(await page.locator('.chip:text-is("Citas")').count(), 0, 'sin Citas');
await page.click('text=Crear su ficha');
// inicio hace exactamente 100 días (fecha local), para que el hito salga cualquier día que se ejecute
await page.click('.nav button:has-text("Ella")');
await page.click('button:has-text("Editar")');
await page.fill('#e-since', await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 100); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }));
await page.click('.sheet button:has-text("Guardar")');
await page.click('.nav button:has-text("Hoy")');
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
// Añadir directamente desde la ficha
await page.click('button.item:has-text("Gustos")');
await page.fill('#add-text', 'sushi');
await page.click('.sheet button:has-text("Añadir")');
assert.match(await page.locator('.sheet').innerText(), /sushi/);
await page.click('.sheet button:has-text("Cerrar")');
await page.click('button.item:has-text("Eventos")');
await page.fill('#add-text', 'Concierto');
const in40 = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 40); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
await page.fill('#add-date', in40);
await page.click('.sheet button:has-text("Añadir")');
assert.match(await page.locator('.sheet').innerText(), new RegExp(`Concierto · ${in40.slice(8)}/${in40.slice(5, 7)}`));
await page.click('.sheet button:has-text("Cerrar")');
// Su ciclo
await page.click('button[role=switch][data-act=toggleCycle]');
await page.click('text=Le ha venido hoy');
assert.match(await txt(), /Tiene la regla · día 1/);
assert.match(await txt(), /Analizar su perfil/);
await shot('ciclo');
// Cambiar etapa conserva datos
await page.click('.chip:has-text("Matrimonio")');
await page.click('button:has-text("Cambiar a Matrimonio")');
assert.match(await txt(), /anillo 14/);
// SOS
await page.click('.nav button:has-text("Hoy")');
assert.match(await txt(), /Chocolate/, 'el ciclo sale en Hoy');
await page.click('text=Ver calendario');
assert.match(await txt(), /Le puede venir la regla/);
assert.match(await txt(), /Concierto/);
await shot('calendario');
await page.click('button[aria-label=Volver]');
await page.click('text=¿La has liado?');
await page.click('.chip:has-text("La he liado")');
assert.match(await txt(), /Reconócelo pronto/);
assert.equal(await page.locator('main button:has-text("Copiar")').count(), 1);
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
const navOn = await page.evaluate(() => getComputedStyle(document.querySelector('.nav button[aria-current=page]')).backgroundColor);
assert.notEqual(navOn, 'rgba(0, 0, 0, 0)', 'la pestaña activa se distingue en claro');
// sin desbordamiento horizontal
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
assert.equal(overflow, false, 'hay scroll horizontal');
assert.deepEqual(errors, [], 'errores de consola: ' + errors.join('\n'));
await browser.close();
console.log('E2E OK');
