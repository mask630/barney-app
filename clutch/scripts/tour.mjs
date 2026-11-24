// Recorrido visual: capturas de todas las pantallas (normal y PRO, claro y oscuro) para revisar el diseño.
// uso: node scripts/tour.mjs <carpeta>
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const out = process.argv[2] || 'shots';
const browser = await chromium.launch({ channel: 'msedge', args: ['--no-sandbox'] });
const ALL = ['multi_profile', 'ai_rewrite', 'my_style', 'companions_pro', 'sos_chat', 'photo_ai', 'profile_ai', 'plans', 'encrypted_backup'];
const json = (route, o, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
const issues = [];

for (const [mode, scheme] of [['pro', 'light'], ['pro', 'dark'], ['base', 'light']]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block', colorScheme: scheme });
// En Yo los apartados están plegados: las pruebas los abren todos (se quedan abiertos al volver).
const openFolds = async (pg) => { await pg.evaluate(() => document.querySelectorAll('details[data-fold]').forEach((d) => { d.open = true; })); await pg.waitForTimeout(30); };
  const page = await ctx.newPage();
  page.on('pageerror', (e) => issues.push(`${mode}/${scheme} error: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') issues.push(`${mode}/${scheme} console: ${m.text()}`); });
  await page.route('https://clutch-ia.vercel.app/**', (route) => {
    const u = route.request().url();
    if (u.endsWith('/api/auth')) return json(route, { email: true, google: null, push: 'BPLy' });
    if (u.endsWith('/api/config')) return json(route, mode === 'pro' ? { status: 'active', group: 'admin', features: ALL } : { status: 'active', group: 'base', features: [] });
    if (u.endsWith('/api/ai')) {
      const b = JSON.parse(route.request().postData());
      return json(route, b.task === 'profile' ? { result: { gustos: ['yoga', 'sushi'], evitar: ['el picante'], regalos: ['esterilla de yoga'], planes: ['clase de cerámica'], lectura: 'Le encanta cuidarse y probar sitios nuevos.' } }
        : b.task === 'sos' ? { text: 'Respira. Dale espacio un rato y luego escríbele algo corto.' } : { text: 'oye, que hoy me acuerdo mucho de ti' });
    }
    return json(route, { ok: true });
  });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${out}/${mode}-${scheme}-${name}.png`, fullPage: true }); };
  const overflow = async (name) => { if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) issues.push(`${mode}/${scheme} ${name}: se sale de ancho`); };
  await shot('00-login');
  await page.click('text=Seguir sin cuenta');
  await shot('01-onboarding');
  await page.fill('#f-name', 'Lucía');
  await page.fill('#f-birth', '1996-03-10');
  await page.click('button:has-text("Pareja")');
  await page.click('text=Crear su ficha');
  if (mode === 'pro') {
    await page.click('.nav button:has-text("Yo")'); await openFolds(page);
    await page.fill('#ai-code', 'tester1');
    await page.dispatchEvent('#ai-code', 'change');
    await page.waitForSelector('text=Acceso activo');
  }
  // Datos: ficha con gustos, evento mañana, ciclo
  await page.click('.nav button:has-text("Apuntar")');
  const tomorrow = 'mañana tiene una entrevista';
  await page.fill('#cap-text', `le encanta el chocolate\nodia el cilantro\nsu talla de anillo es la 14\n${tomorrow}\nquiere unos pendientes de perlas\nsu hermana se llama Marta\nla playa`);
  await page.click('button[data-act=classify]');
  await shot('02-apuntar-lote');
  await overflow('apuntar-lote');
  await page.click('button[data-act=saveBatch]');
  await shot('03-apuntar-guardado');
  await page.click('.nav button:has-text("Ella")');
  await page.click('button[data-act=toggleCycle]');
  const d = await page.evaluate(() => { const x = new Date(); x.setDate(x.getDate() - 25); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; });
  await page.fill('#c-last', d);
  await page.dispatchEvent('#c-last', 'change');
  await shot('04-ella');
  await overflow('ella');
  await page.click('button.item:has-text("Gustos")');
  await shot('05-seccion-gustos');
  await page.click('.sheet button:has-text("Cerrar")');
  await page.click('.nav button:has-text("Hoy")');
  await shot('06-hoy');
  await overflow('hoy');
  await page.click('button[data-act=goWrite]');
  await shot('07-escribele');
  await overflow('escribele');
  await page.click('button[data-act=back]');
  await page.click('button[data-act=goAgenda]');
  await shot('08-agenda');
  await page.click('button[data-act=back]');
  await page.click('button[data-act=goSos]');
  await page.click('button[data-act=openSos]');
  await shot('09-sos');
  await page.click('button[data-act=back]');
  await page.click('.nav button:has-text("Ella")');
  await page.click('button[data-act=goSocial]');
  await shot('10-social');
  await page.click('button[data-act=back]');
  await page.click('.nav button:has-text("Yo")'); await openFolds(page);
  await shot('11-yo');
  await overflow('yo');
  await ctx.close();
}
await browser.close();
console.log(issues.length ? issues.join('\n') : 'SIN ERRORES');
