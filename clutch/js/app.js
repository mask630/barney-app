// Clutch · interfaz. JavaScript sin framework: un estado, una función render y eventos delegados.

import es from './i18n/es.js';
import { localISO, daysBetween, parseISO } from './core/dates.js';
import { STAGES, STAGE_GROUP, STAGES_WITH_MILESTONES, checkAdult } from './core/stages.js';
import * as Store from './core/store.js';
import { generateHooks } from './engine/hooks.js';
import { genericMessages, dailyGestures, upcoming, cycleCare, SOS } from './engine/content.js';
import { classify, applyToProfile, DESTINATIONS } from './engine/capture.js';
import { CITIES, countryFromTimezone, detectTimezone, nearestCity } from './core/geo.js';
import { COMPANIONS, COMPANION_IDS, isAvailable, companionLine } from './engine/companions.js';
import { analyzeStyle, applyStyle, describeStyle } from './engine/style.js';
import { fetchPlans, plansForToday, planMessage } from './engine/plans.js';
import { aiConfigured, aiRewrite, aiSos, aiPhoto, fillName } from './engine/ai.js';
import { FEATURES, has as hasFeature, fetchConfig, registerBeta } from './engine/features.js';
import { LEGAL, UPDATED } from './i18n/legal.js';
import { createMetrics, sendFeedback } from './engine/metrics.js';
import { markUsed, unmarkUsedToday } from './engine/rotation.js';
import { buildICS } from './engine/calendar.js';

const T = es;

// ---------- almacenamiento seguro (si falla, memoria) ----------
function safeStorage() {
  try {
    const k = '__clutch_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const m = new Map();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), volatile: true };
  }
}
const storage = safeStorage();
let S = Store.load(storage);
const metrics = createMetrics(storage);
const track = (ev) => metrics.track(S.settings, ev);
// Qué acción cuenta como qué uso (solo recuentos; ver engine/metrics.js).
const ACT_EVENT = {
  goWrite: 'write_open', copy: 'copy', goSos: 'sos_open', aiMsg: 'ai_rewrite', styleMsg: 'style_apply', aiChat: 'sos_chat',
  savePending: 'capture_save', aiPhoto: 'photo_ai', findPlans: 'plans_search', createProfile: 'profile_create',
  confirmStage: 'stage_change', toggleGesture: 'gesture_done', exportData: 'backup_export', exportEnc: 'backup_export', openSos: 'sos_script'
};

const ui = {
  tab: 'hoy', screen: null, sheet: null, ask: null, toast: null,
  locked: false, pinEntry: '', pinError: false,
  form: { name: '', birth: '', stage: 'pareja', since: '', error: '' },
  edit: {}, draft: '', pending: null, imp: { text: '', msg: '' }, exp: { text: '' }, pin: { value: '', error: '' }, fb: { text: '' },
  open: null, breath: { on: false, phase: 'in' },
  alt: {}, busy: null, chat: [], chatDraft: '', plansMsg: '', pass: { value: '' }, styleDraft: '',
  join: { alias: '', email: '', terms: false, metrics: false, error: '' }
};
ui.locked = !!S.settings.pinHash;

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => localISO();
const has = (f) => hasFeature(S.settings, f);
const SOON = '<span class="badge pro">Pronto</span>';
const bandOf = (p) => checkAdult(p.birth, today()).band;
const AI_ERR = { 'sin-servidor': 'Apúntate a la beta en Yo para usar la IA.', codigo: 'El código de tester no es válido.', funcion: 'Esta función aún no está abierta para ti.', limite: 'Has llegado al límite de IA de hoy. Mañana más.', red: 'No se pudo conectar con el servidor.', servidor: 'El servidor de IA tuvo un problema.', descartado: 'La IA añadió datos que no estaban. Descartado por seguridad.' };
const $ = (sel, root = document) => root.querySelector(sel);
const persist = () => {
  if (!Store.save(storage, S)) showToast('No se pudo guardar. Descarga una copia en Yo > Copia de seguridad.');
};
function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys.at(-1)] = value;
}
function prof() {
  return Store.activeProfile(S);
}
function updateProfile(fn) {
  const p = prof();
  if (!p) return;
  const next = fn(p);
  S.profiles = S.profiles.map((x) => (x.id === p.id ? next : x));
  persist();
}
let toastTimer = null;
function showToast(msg) {
  ui.toast = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = null; render(); }, 2600);
  render();
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(T.write.copied);
    return;
  } catch { /* sigue */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    showToast(ok ? T.write.copied : 'Mantén pulsado el texto para copiarlo');
  } catch {
    showToast('Mantén pulsado el texto para copiarlo');
  }
}
function location() {
  const c = S.settings.city;
  return c && Number.isFinite(c.lat) && Number.isFinite(c.lon) && c.tz ? c : null;
}
function hookData(p) {
  return generateHooks({ id: p.id, used: p.used, name: p.name, birth: p.birth, stage: p.stage, since: p.since, tastes: p.tastes, location: location(), country: S.settings.country }, today());
}
function longDate(iso) {
  return new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(parseISO(iso));
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

// ---------- iconos ----------
const ICON = {
  hoy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  ella: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  yo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>'
};

// ---------- vistas ----------
function switchHtml(on, act, extra = '') {
  return `<button class="switch" role="switch" aria-checked="${on}" data-act="${act}" ${extra}></button>`;
}

function profileForm() {
  const f = ui.form;
  const needsSince = STAGES_WITH_MILESTONES.includes(f.stage);
  return `
  <div class="stack">
    <div class="field"><label for="f-name">${T.profile.name}</label>
      <input id="f-name" class="input" data-bind="form.name" value="${esc(f.name)}" autocomplete="off" maxlength="40"></div>
    <div class="field"><label for="f-birth">${T.profile.birth}</label>
      <input id="f-birth" class="input" type="date" data-bind="form.birth" value="${esc(f.birth)}" max="${today()}"></div>
    <div class="field"><label>${T.profile.stage}</label>
      <div class="chips">${STAGES.map((s) => `<button class="chip" aria-pressed="${f.stage === s}" data-act="formStage" data-v="${s}">${T.stages[s]}</button>`).join('')}</div>
      <span class="small muted">${T.stageHint[f.stage]}</span></div>
    ${needsSince ? `<div class="field"><label for="f-since">${T.profile.since}</label>
      <input id="f-since" class="input" type="date" data-bind="form.since" value="${esc(f.since)}" max="${today()}">
      <span class="small muted">${T.profile.sinceHint}</span></div>` : ''}
    ${f.error ? `<p class="error" role="alert">${esc(f.error)}</p>` : ''}
    <p class="small muted">${T.profile.adultOnly}</p>
  </div>`;
}

// Si Barney v1 está en este mismo móvil y dominio, ofrecemos traer sus perfiles sin pegar nada.
function readBarney() {
  try {
    const v1 = JSON.parse(localStorage.getItem('barney_v9'));
    if (!v1 || !Array.isArray(v1.girls)) return null;
    const r = Store.migrateFromBarney(v1, today());
    return r.demoOnly || !r.state.profiles.length ? null : r;
  } catch {
    return null;
  }
}

function viewOnboarding() {
  const barney = readBarney();
  return `<main class="screen">
    <div class="stack"><span class="badge" style="align-self:flex-start">${T.me.beta}</span>
    <h1>${T.welcome.title}</h1><p class="muted">${T.welcome.body}</p></div>
    ${barney ? `<div class="card hero"><h3>Encontré tus datos de Barney</h3>
      <p class="muted">${barney.state.profiles.length} perfil(es) de adultos: ${esc(barney.state.profiles.map((x) => x.name).join(', '))}. Se copian aquí y Barney no se toca.</p>
      <button class="btn primary block" data-act="importBarney">Traer mis datos de Barney</button></div>` : ''}
    <div class="card">${profileForm()}
      <button class="btn primary block" data-act="createProfile">${T.welcome.cta}</button></div>
    <div class="card"><h3>${T.me.import}</h3><p class="small muted">${T.me.importHint}</p>
      <textarea id="imp-text" class="textarea" data-bind="imp.text" placeholder="{ ... }">${esc(ui.imp.text)}</textarea>
      <input id="pass-in" class="input" type="password" autocomplete="off" data-bind="pass.value" value="${esc(ui.pass.value)}" placeholder="Contraseña (solo si la copia está cifrada)" aria-label="Contraseña de la copia">
      ${ui.imp.msg ? `<p class="small ${ui.imp.msg.startsWith('Listo') ? 'ok' : 'error'}">${esc(ui.imp.msg)}</p>` : ''}
      <button class="btn block" data-act="doImport">${T.me.import}</button></div>
  </main>`;
}

function viewLock() {
  const dots = [0, 1, 2, 3].map((i) => `<i class="${ui.pinEntry.length > i ? 'f' : ''}"></i>`).join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
    .map((k) => (k === '' ? '<span></span>' : `<button data-act="pinKey" data-v="${k}" aria-label="${k === '⌫' ? 'Borrar' : k}">${k}</button>`)).join('');
  return `<main class="lock"><h1 style="text-align:center">${T.lock.title}</h1>
    <div class="dots" aria-live="polite">${dots}</div>
    <p class="error" style="text-align:center;min-height:20px">${ui.pinError ? T.lock.wrong : ''}</p>
    <div class="keypad">${keys}</div></main>`;
}

function plansCard(p) {
  if (!has('plans')) return `<div class="card row"><span class="grow"><b>Planes cerca</b><br><span class="small muted">Ideas reales de tu ciudad</span></span>${SOON}</div>`;
  const c = S.settings.plans;
  const city = S.settings.city;
  const items = c && city && c.city === city.name && c.group === STAGE_GROUP[p.stage] ? c.items : null;
  return `<div class="stack"><span class="label">Planes cerca</span><div class="card">
    ${!location() ? '<p class="muted">Elige tu ciudad en Yo para ver planes cerca de ti.</p>'
      : items && items.length ? `<div class="list">${plansForToday(items, p, today()).map((i) => {
        const msg = planMessage(i, { name: p.name, band: bandOf(p), group: STAGE_GROUP[p.stage] });
        return `<div class="item" style="padding:8px 0;min-height:44px;flex-wrap:wrap"><div class="grow"><b>${esc(i.text)}</b><br><span class="small muted">${esc(i.label)} · ${i.km} km</span></div>
          <button class="btn small" data-act="copy" data-text="${esc(msg)}" data-mid="${esc(i.id)}">Proponer</button>
          <a class="btn small" data-track="whatsapp" data-mid="${esc(i.id)}" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${T.write.whatsapp}</a></div>`;
      }).join('')}</div><p class="small muted">Los que propongas descansan unas semanas para que no se repitan.</p>`
      : '<p class="muted">Lugares reales de tu ciudad (OpenStreetMap) para proponerle un plan.</p>'}
    ${ui.plansMsg ? `<p class="small error">${esc(ui.plansMsg)}</p>` : ''}
    ${location() ? `<button class="btn small" data-act="findPlans" ${ui.busy === 'plans' ? 'disabled' : ''}>${ui.busy === 'plans' ? 'Buscando…' : items ? 'Actualizar' : 'Buscar planes'}</button>
    <p class="small muted">Solo se envía la ciudad elegida, nunca datos de ella.</p>` : ''}
  </div></div>`;
}

function viewHoy(p) {
  const r = hookData(p);
  const comp = esc(S.settings.companion);
  const msgHooks = r.hooks.filter((h) => h.message);
  const hero = msgHooks.find((h) => h.daysAhead === 0) || null;
  // Cuatro gestos: el primero es la jugada del día (si no hay dato especial) y los otros tres van a la lista, sin repetirse.
  const picks = dailyGestures(p, today(), 4);
  const lead = picks[0];
  const gest = picks.length > 3 ? picks.slice(1) : picks;
  const done = (p.done && p.done[today()]) || [];
  const care = cycleCare(p, today());
  const dates = upcoming(p, today(), 120, S.settings.country).slice(0, 4);
  const reminders = r.hooks.filter((h) => h.reminder && h.daysAhead > 0).slice(0, 2);
  const unlocks = r.unlocks.slice(0, 2);

  return `<main class="screen">
    <div><span class="small muted">${esc(cap(longDate(today())))}</span>
    <h1>${esc(p.name)}</h1></div>

    <section class="card hero" aria-label="${T.today.play}">
      <span class="label" style="padding:0">${T.today.play} · ${comp}</span>
      ${hero
        ? `<p class="big">${esc(hero.message)}</p>
           <p class="source"><b>${T.write.realData}</b> · ${esc(hero.source.label)}</p>
           <p class="small muted"><b>${comp}</b>: ${esc(companionLine(S.settings.companionStyle, 'hook', today(), has('companions_pro')))}</p>
           <button class="btn primary block" data-act="goWrite">${T.tabs.escribele}</button>`
        : `<p class="big">${esc(lead.t)}</p>
           <p class="source">${T.today.emptyHook}</p>
           <p class="small muted"><b>${comp}</b>: ${esc(companionLine(S.settings.companionStyle, 'nodata', today(), has('companions_pro')))}</p>
           <button class="btn block" data-act="goWrite">${T.tabs.escribele}</button>`}
    </section>

    ${care ? `<section class="card"><h3>${T.today.care}</h3><p>${esc(care.text)}</p></section>` : ''}

    <div class="stack"><span class="label">${T.today.gestures}</span>
      <div class="card flat list">${gest.map((g) => `<button class="gesture" aria-pressed="${done.includes(g.id)}" data-act="toggleGesture" data-v="${g.id}"><span class="tick">${done.includes(g.id) ? '✓' : ''}</span><span>${esc(g.t)}</span></button>`).join('')}</div></div>

    <div class="stack"><span class="label">${T.today.dates}</span>
      ${dates.length || reminders.length
        ? `<div class="card flat list">${dates.map((d) => `<div class="item"><span class="grow">${esc(d.label)}</span><span class="badge">${T.today.days(d.daysAhead)}</span></div>`).join('')}</div>`
        : `<div class="card"><p class="muted">${T.today.noDates}</p></div>`}</div>

    ${unlocks.length ? `<div class="stack"><span class="label">${T.today.unlock}</span>
      <div class="card flat list">${unlocks.map((u) => `<div class="item"><span class="grow small">${esc(u.text)}</span></div>`).join('')}</div></div>` : ''}

    ${plansCard(p)}

    ${!aiConfigured(S.settings) ? `<button class="card row" style="text-align:left;background:var(--surface)" data-act="goJoin"><span class="grow"><b>${T.join.title}</b><br><span class="small muted">Prueba antes que nadie las funciones nuevas.</span></span><span aria-hidden="true">›</span></button>` : ''}

    <button class="card row" style="text-align:left;background:var(--surface)" data-act="goSos"><span class="grow"><b>${T.today.sosRow}</b></span><span aria-hidden="true">›</span></button>
  </main>`;
}

function viewWrite(p) {
  const r = hookData(p);
  const hooks = r.hooks.filter((h) => h.message);
  const basics = genericMessages(p, r.band, r.group, today());
  const traits = S.settings.style?.traits;
  // mid: id del banco (solo mensajes sencillos) para que descansen tras usarlos.
  const card = (msg, src, mid = '') => {
    const shown = ui.alt[msg] || msg;
    return `<div class="card">
      <div class="msg">${esc(shown)}</div>
      ${ui.alt[msg] ? '<p class="small muted">Versión adaptada. <button class="chip" style="min-height:32px" data-act="revertMsg" data-text="' + esc(msg) + '">Ver original</button></p>' : ''}
      ${src ? `<p class="source"><b>${T.write.realData}</b> · ${esc(src.label)}${src.urls ? ` · ${src.urls.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener" style="color:inherit">fuente</a>`).join(' ')}` : ''}</p>` : ''}
      <div class="row wrap">
        <button class="btn primary small" data-act="copy" data-text="${esc(shown)}" data-mid="${mid}">${T.write.copy}</button>
        <a class="btn small" data-track="whatsapp" data-mid="${mid}" href="https://wa.me/?text=${encodeURIComponent(shown)}" target="_blank" rel="noopener">${T.write.whatsapp}</a>
        ${has('my_style') && traits ? `<button class="btn small" data-act="styleMsg" data-text="${esc(msg)}">Con mi estilo</button>` : ''}
        ${has('ai_rewrite') && aiConfigured(S.settings) ? `<button class="btn small" data-act="aiMsg" data-text="${esc(msg)}" ${ui.busy === 'ai:' + msg ? 'disabled' : ''}>${ui.busy === 'ai:' + msg ? 'Escribiendo…' : 'Reescribir con IA'}</button>` : ''}
      </div></div>`;
  };
  return `<main class="screen">
    <div class="row"><button class="btn small ghost" data-act="back" aria-label="Volver">‹</button><h1>${T.write.title}</h1></div>
    ${hooks.length ? hooks.map((h) => card(h.message, h.source, h.mid)).join('') : ''}
    <span class="label">${T.write.basics}</span>
    ${basics.map((m) => card(m.text, null, m.id)).join('')}
    ${!has('my_style') && !has('ai_rewrite') ? `<div class="card row"><span class="grow">${T.write.proRewrite}</span><span class="badge pro">${T.write.pro}</span></div>`
      : `<div class="card"><b>${T.write.proRewrite}</b><p class="small muted">${!has('my_style') ? '' : traits ? 'Usa «Con mi estilo» en cualquier mensaje.' : 'Añade unos mensajes tuyos en Yo > Tu estilo y los adapto a cómo escribes.'}${has('ai_rewrite') ? ' Toca «Reescribir con IA» para otra versión.' : ''}</p></div>`}
  </main>`;
}

function sizeLine(p) {
  const e = Object.entries(p.sizes);
  return e.length ? e.map(([k, v]) => `${esc(k)} ${esc(v)}`).join(' · ') : '';
}

function viewElla(p) {
  const pct = Store.completeness(p);
  const rank = Store.stageRank(p.stage);
  const tiles = [
    ['gustos', p.tastes.length], ['evitar', p.avoid.length], ['tallas', Object.keys(p.sizes).length],
    ['regalos', p.gifts.length], ['eventos', p.events.length], ['recordar', p.remember.length]
  ];
  return `<main class="screen">
    <div class="chips">${S.profiles.map((x) => `<button class="chip" aria-pressed="${x.id === p.id}" data-act="pickProfile" data-v="${x.id}">${esc(x.name)}</button>`).join('')}
      <button class="chip" data-act="newProfileSheet" ${canAddProfile() ? '' : 'style="opacity:.7"'}>+ Añadir${canAddProfile() ? '' : ' <span class="badge pro" style="padding:1px 5px">Pronto</span>'}</button></div>
    <div class="row"><h1 class="grow">${esc(p.name)}</h1><button class="btn small" data-act="editSheet">Editar</button></div>

    <div class="stack"><span class="label">${T.profile.stage}</span>
      <div class="chips">${STAGES.map((s) => `<button class="chip" aria-pressed="${p.stage === s}" data-act="stageSheet" data-v="${s}">${T.stages[s]}</button>`).join('')}</div>
      <p class="small muted">${T.profile.upgradeNote}</p></div>

    <div class="card"><div class="row"><h3 class="grow">Ficha</h3><b>${pct}%</b></div>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      ${pct < 100 ? '<p class="small muted">Cuanto más sepas de ella, mejores serán los mensajes. Usa Apuntar.</p>' : ''}</div>

    <div class="card flat list">${tiles.map(([k, n]) => `<button class="item" data-act="openSection" data-v="${k}"><span class="grow"><b>${T.dest[k]}</b>${k === 'tallas' && n ? `<br><span class="small muted">${sizeLine(p)}</span>` : ''}</span><span class="badge">${n}</span></button>`).join('')}</div>

    ${rank >= Store.stageRank('citas') ? `<div class="card"><div class="row"><span class="grow"><b>Cuidado según su ciclo</b><br><span class="small muted">Opcional y orientativo. Tú decides.</span></span>${switchHtml(p.cycle.enabled, 'toggleCycle')}</div>
      ${p.cycle.enabled ? `<div class="field"><label for="c-last">Primer día de su última regla</label><input id="c-last" class="input" type="date" data-bind="edit.cycleLast" data-change="cycleLast" value="${esc(p.cycle.lastStart || '')}" max="${today()}"></div>` : ''}</div>` : ''}
  </main>`;
}

function viewCapture(p) {
  const pend = ui.pending;
  const inbox = S.inbox;
  const photo = pend?.photo;
  const allowed = photo ? ['regalos', 'recordar', 'bandeja'] : DESTINATIONS;
  return `<main class="screen">
    <h1>${T.capture.title}</h1>
    ${pend ? `<div class="card">
        ${photo ? `<img class="thumb" src="${photo}" alt="Foto a clasificar"><p class="small muted">${T.capture.photoNote}</p>
          ${has('photo_ai') ? `<button class="btn small" data-act="aiPhoto" ${ui.busy === 'photo' ? 'disabled' : ''}>${ui.busy === 'photo' ? 'Mirando…' : 'Reconocer con IA'}</button>` : `<p class="small muted">Reconocer fotos con IA ${SOON}</p>`}` : ''}
        <span class="label" style="padding:0">${T.capture.sendTo}</span>
        <div class="chips">${allowed.map((d) => `<button class="chip" aria-pressed="${pend.c.dest === d}" data-act="pickDest" data-v="${d}">${T.dest[d]}</button>`).join('')}</div>
        ${pend.c.dest === 'tallas' ? `<div class="field"><label for="p-field">¿De qué prenda?</label><input id="p-field" class="input" data-bind="pending.c.field" value="${esc(pend.c.field || '')}" placeholder="anillo, calzado, camiseta…"></div>` : ''}
        ${pend.c.dest !== 'bandeja' ? `<div class="field"><label for="p-val">${pend.c.dest === 'tallas' ? 'Talla' : 'Texto'}</label><input id="p-val" class="input" data-bind="pending.c.value" value="${esc(pend.c.value)}"></div>` : ''}
        ${pend.c.dest === 'eventos' ? `<div class="field"><label for="p-date">Fecha</label><input id="p-date" class="input" type="date" data-bind="pending.dateISO" value="${esc(pend.dateISO || '')}"></div>` : ''}
        ${pend.c.confidence === 'baja' && pend.c.dest === 'bandeja' ? `<p class="small muted">No tengo claro dónde va. Elige un destino o déjalo en la Bandeja.</p>` : ''}
        <div class="row wrap"><button class="btn primary" data-act="savePending">${pend.c.dest === 'bandeja' ? T.capture.toInbox : T.capture.confirm}</button>
          <button class="btn ghost" data-act="cancelPending">Cancelar</button></div>
      </div>`
    : `<div class="card">
        <textarea id="cap-text" class="textarea" data-bind="draft" placeholder="${esc(T.capture.placeholder)}">${esc(ui.draft)}</textarea>
        <button class="btn primary block" data-act="classify">${T.capture.classify}</button>
        <div class="row">
          <label class="btn grow" style="cursor:pointer">${T.capture.camera}<input type="file" accept="image/*" capture="environment" hidden data-change="photo"></label>
          <label class="btn grow" style="cursor:pointer">${T.capture.gallery}<input type="file" accept="image/*" hidden data-change="photo"></label>
        </div></div>`}

    <div class="stack"><span class="label">${T.capture.inbox} · ${inbox.length}</span>
      ${inbox.length ? `<div class="card flat list">${inbox.map((it) => `<div class="item"><div class="grow">${it.photo ? `<img class="thumb" style="max-height:90px;width:auto" src="${it.photo}" alt="">` : ''}${it.text ? esc(it.text) : '<span class="muted">Foto</span>'}</div>
        <button class="btn small" data-act="inboxClassify" data-v="${it.id}">${T.capture.classifyLater}</button>
        <button class="btn small ghost" data-act="inboxDiscard" data-v="${it.id}" aria-label="${T.capture.discard}">✕</button></div>`).join('')}</div>`
        : `<div class="card"><p class="muted">${T.capture.inboxEmpty}</p></div>`}</div>
  </main>`;
}

function viewSos(p) {
  const group = STAGE_GROUP[p.stage];
  const phases = { in: T.sos.inhale, hold: T.sos.hold, out: T.sos.exhale };
  return `<main class="screen">
    <div class="row"><button class="btn small ghost" data-act="back" aria-label="Volver">‹</button><h1>${T.sos.title}</h1></div>
    <div class="card" style="align-items:center;text-align:center">
      <h3>${T.sos.breathe}</h3>
      <div class="breath ${ui.breath.on ? ui.breath.phase : ''}" id="breath" aria-live="polite">${ui.breath.on ? phases[ui.breath.phase] : ''}</div>
      <button class="btn small" data-act="toggleBreath">${ui.breath.on ? T.sos.stop : T.sos.start}</button></div>
    <span class="label">${T.sos.situations}</span>
    <div class="stack">${SOS.map((s) => {
      const open = ui.open === s.id;
      return `<div class="card"><button class="row" style="background:none;border:0;text-align:left;min-height:44px" data-act="openSos" data-v="${s.id}" aria-expanded="${open}"><b class="grow">${s.title}</b><span aria-hidden="true">${open ? '−' : '+'}</span></button>
        ${open ? `<span class="label" style="padding:0">${T.sos.steps}</span><ol style="margin:0;padding-left:20px">${s.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
          <span class="label" style="padding:0">${T.sos.script}</span><div class="msg">${esc(s.scripts[group])}</div>
          <div class="row wrap"><button class="btn primary small" data-act="copy" data-text="${esc(s.scripts[group])}">${T.write.copy}</button>
          <a class="btn small" data-track="whatsapp" href="https://wa.me/?text=${encodeURIComponent(s.scripts[group])}" target="_blank" rel="noopener">${T.write.whatsapp}</a></div>` : ''}</div>`;
    }).join('')}</div>
    ${!has('sos_chat') ? `<div class="card row"><span class="grow">${T.sos.proChat}</span><span class="badge pro">${T.sos.pro}</span></div>`
      : `<div class="card"><h3>${T.sos.proChat}</h3>
            ${ui.chat.map((m) => `<div class="msg" style="${m.role === 'user' ? 'background:var(--surface)' : ''}"><span class="small muted">${m.role === 'user' ? 'Tú' : 'Clutch'}</span><br>${esc(fillName(m.text, p.name))}</div>`).join('')}
            <textarea id="chat-in" class="textarea" data-bind="chatDraft" placeholder="Cuéntame qué ha pasado">${esc(ui.chatDraft)}</textarea>
            <button class="btn primary block" data-act="aiChat" ${ui.busy === 'chat' ? 'disabled' : ''}>${ui.busy === 'chat' ? 'Pensando…' : 'Enviar'}</button></div>`}
  </main>`;
}

function viewMe() {
  const s = S.settings;
  return `<main class="screen">
    <h1>${T.me.title}</h1>
    <div class="card"><div class="row"><b class="grow">${T.me.plan}</b><span class="badge">${T.me.beta}</span></div><p class="small muted">${T.me.planBody}</p></div>

    <div class="stack"><span class="label">${T.me.discretion}</span><div class="card flat list">
      <div class="item"><div class="grow"><b>${T.me.pin}</b><br><span class="small muted">${T.me.pinHint}</span></div>${switchHtml(!!s.pinHash, 'togglePin')}</div>
      <div class="item"><div class="grow"><b>${T.me.lockLeave}</b><br><span class="small muted">${T.me.lockLeaveHint}</span></div>${switchHtml(s.lockOnLeave, 'toggleSetting', `data-v="lockOnLeave" ${s.pinHash ? '' : 'disabled'}`)}</div>
    </div></div>

    <div class="stack"><span class="label">Avisos</span><div class="card">
      <p class="small muted">Clutch aún no envía notificaciones (llegarán más adelante). Para que te avise tu móvil, añade sus fechas a tu calendario: te avisará el día antes y el mismo día a las 9:00.</p>
      <div class="row"><div class="grow"><b>${T.me.discreetNotifs}</b><br><span class="small muted">${T.me.discreetNotifsHint}</span></div>${switchHtml(s.discreetNotifs, 'toggleSetting', 'data-v="discreetNotifs"')}</div>
      <button class="btn block" data-act="exportCalendar">Añadir fechas a mi calendario</button>
      <p class="small muted">Si cambias o añades fechas, vuelve a pulsarlo.</p></div></div>

    <div class="stack"><span class="label">${T.me.where}</span><div class="card flat list">
      <div class="item"><div class="grow"><b>${T.me.country}: ${esc(s.country || '—')}</b><br><span class="small muted">Se detecta por la zona horaria.</span></div></div>
      <div class="item"><div class="grow"><b>${T.me.city}: ${esc(s.city?.name || '—')}</b><br><span class="small muted">Para la hora del atardecer y el inicio de estación.</span></div><button class="btn small" data-act="gps">${T.me.useGps}</button></div>
      <div class="item"><select id="city-sel" class="select" data-change="city" aria-label="${T.me.city}"><option value="">Elegir ciudad…</option>${CITIES.map((c) => `<option value="${esc(c.name)}" ${s.city?.name === c.name ? 'selected' : ''}>${esc(c.name)} (${esc(c.country)})</option>`).join('')}</select></div>
    </div></div>

    <div class="stack"><span class="label">${T.me.companion}</span><div class="card">
      <div class="field"><label for="comp">${T.me.companionHint}</label><input id="comp" class="input" data-bind="edit.companion" data-change="companion" value="${esc(s.companion)}" maxlength="24"></div>
      <div class="chips">${COMPANION_IDS.map((id) => `<button class="chip" aria-pressed="${s.companionStyle === id}" data-act="companionStyle" data-v="${id}" ${isAvailable(id, has('companions_pro')) ? '' : 'style="opacity:.55"'}>${esc(COMPANIONS[id].label)}${isAvailable(id, has('companions_pro')) ? '' : ' <span class="badge pro" style="padding:1px 5px">Pronto</span>'}</button>`).join('')}</div></div></div>

    <div class="stack"><span class="label">Tu estilo</span><div class="card">
      <p class="small muted">Pega 3 o más mensajes que hayas escrito tú (uno por línea). Se analiza en este móvil y no se envía a ningún sitio.</p>
      <textarea id="style-in" class="textarea" data-bind="styleDraft" ${has('my_style') ? '' : 'disabled'} placeholder="jaja vale, nos vemos luego&#10;oye q tal el finde">${esc(ui.styleDraft || (s.style?.samples || []).join('\n'))}</textarea>
      ${s.style?.traits ? `<p class="small ok">Aprendido: ${esc(describeStyle(s.style.traits))}</p>` : ''}
      ${has('my_style') ? '<button class="btn small" data-act="saveStyle">Aprender mi estilo</button>' : '<span class="badge pro" style="align-self:flex-start">Pronto</span>'}</div></div>

    <div class="stack"><span class="label">${T.me.theme}</span><div class="chips">
      ${[['auto', T.me.themeAuto], ['dark', T.me.themeDark], ['light', T.me.themeLight]].map(([k, l]) => `<button class="chip" aria-pressed="${s.theme === k}" data-act="theme" data-v="${k}">${l}</button>`).join('')}</div></div>

    <div class="stack"><span class="label">${T.me.data}</span><div class="card">
      <button class="btn block" data-act="exportData">${T.me.export}</button>
      <div class="field"><label for="pass-in">Contraseña para copia cifrada (mínimo 6 caracteres)</label><input id="pass-in" class="input" type="password" autocomplete="off" data-bind="pass.value" value="${esc(ui.pass.value)}"></div>
      <button class="btn block" data-act="exportEnc" ${has('encrypted_backup') ? '' : 'disabled'}>Copia cifrada ${has('encrypted_backup') ? '' : '(pronto)'}</button>
      ${ui.exp.text ? `<textarea id="exp-text" class="textarea" readonly>${esc(ui.exp.text)}</textarea><button class="btn small" data-act="copy" data-text="${esc(ui.exp.text)}">${T.write.copy}</button>` : `<p class="small muted">${T.me.exportHint}</p>`}
      <hr style="border:0;border-top:1px solid var(--line);width:100%">
      <p class="small muted">${T.me.importHint}</p>
      <textarea id="imp-text" class="textarea" data-bind="imp.text" placeholder="{ ... }">${esc(ui.imp.text)}</textarea>
      ${ui.imp.msg ? `<p class="small ${ui.imp.msg.startsWith('Listo') ? 'ok' : 'error'}">${esc(ui.imp.msg)}</p>` : ''}
      <button class="btn block" data-act="doImport">${T.me.import}</button>
      <button class="btn danger block" data-act="wipe">${ui.ask === 'wipe' ? '¿Seguro? Toca otra vez para borrar todo' : 'Borrar todos mis datos'}</button>
    </div></div>

    ${betaCard()}

    <div class="stack"><span class="label">${T.me.beta}</span><div class="card">
      <div class="field"><label for="fb">${T.me.feedback}</label><textarea id="fb" class="textarea" data-bind="fb.text" placeholder="Qué falla, qué falta, qué te gustó…">${esc(ui.fb.text)}</textarea></div>
      <p class="small muted">${aiConfigured(S.settings) ? 'Se envía con tu alias para poder responderte.' : 'Se envía sin nombre.'} No pongas datos de ella.</p>
      <button class="btn small" data-act="sendFeedback" ${ui.busy === 'fb' ? 'disabled' : ''}>${ui.busy === 'fb' ? 'Enviando…' : 'Enviar'}</button>
      <p class="small muted">${T.me.version}</p></div></div>
  </main>`;
}


// ---------- beta: alta, estado y funciones abiertas ----------
function joinForm() {
  const j = ui.join;
  return `<div class="card" id="join"><h3>${T.join.title}</h3><p class="small muted">${T.join.pitch}</p>
    <div class="field"><label for="j-alias">${T.join.alias}</label><input id="j-alias" class="input" data-bind="join.alias" value="${esc(j.alias)}" maxlength="24" autocomplete="nickname"></div>
    <div class="field"><label for="j-email">${T.join.email}</label><input id="j-email" class="input" type="email" data-bind="join.email" value="${esc(j.email)}" autocomplete="email" inputmode="email"></div>
    <label class="row small" style="align-items:flex-start;gap:10px"><input type="checkbox" data-act="joinCheck" data-v="terms" ${j.terms ? 'checked' : ''} style="margin-top:3px"><span>${T.join.terms}<br><button class="chip" style="min-height:28px" data-act="legalSheet">${T.join.readLegal}</button></span></label>
    <label class="row small" style="align-items:flex-start;gap:10px"><input type="checkbox" data-act="joinCheck" data-v="metrics" ${j.metrics ? 'checked' : ''} style="margin-top:3px"><span>${T.join.metrics}</span></label>
    ${j.error ? `<p class="small error" role="alert">${esc(j.error)}</p>` : ''}
    <button class="btn primary block" data-act="joinBeta" ${ui.busy === 'join' ? 'disabled' : ''}>${ui.busy === 'join' ? 'Enviando…' : T.join.send}</button></div>`;
}

function betaCard() {
  const s = S.settings;
  const st = aiConfigured(s) ? s.betaStatus : null;
  const codeField = `<div class="field"><label for="ai-code">${st ? 'Tu código de tester' : T.join.haveCode}</label><input id="ai-code" class="input" type="password" data-change="aiCode" value="${esc(s.testerCode || '')}" autocomplete="off"></div>`;
  const featureList = `<div class="list">${Object.entries(FEATURES).map(([f, label]) => `<div class="item" style="min-height:36px;padding:4px 0"><span class="grow small">${esc(label)}</span>${has(f) ? '<span class="small ok">Activa</span>' : SOON}</div>`).join('')}</div>`;
  const check = `<button class="btn small" data-act="refreshAccess" ${ui.busy === 'access' ? 'disabled' : ''}>${ui.busy === 'access' ? 'Comprobando…' : 'Comprobar acceso'}</button>`;
  let body;
  if (!st) body = `${joinForm()}<div class="card">${codeField}<p class="small muted">Sin apuntarte la app funciona igual, con lo básico.</p></div>`;
  else if (st === 'pending') body = `<div class="card"><p class="small">${T.join.pending}</p>${check}${codeField}</div>`;
  else if (st === 'blocked') body = `<div class="card"><p class="small error">${T.join.blocked}</p>${codeField}</div>`;
  else if (st === 'anon') body = `<div class="card"><p class="small error">Código no reconocido. Revísalo o apúntate de nuevo.</p>${codeField}${check}</div>${joinForm()}`;
  else body = `<div class="card"><p class="small ok">Acceso activo. Funciones abiertas para ti:</p>${featureList}${check}
    <div class="row"><div class="grow small"><b>Estadísticas anónimas</b><br><span class="muted">Qué funciones usas; nunca textos ni datos de ella.</span></div>${switchHtml(!!s.metrics, 'toggleSetting', 'data-v="metrics"')}</div>
    ${codeField}<p class="small muted">Las funciones nuevas se irán abriendo durante la beta. Lo que escribes de ella nunca sale del móvil.</p></div>`;
  return `<div class="stack"><span class="label">Beta</span>${body}</div>`;
}

// ---------- hojas modales ----------
function sheetHtml() {
  const sh = ui.sheet;
  if (!sh) return '';
  const p = prof();
  let body = '';
  if (sh.type === 'newProfile') {
    body = `<h2>Añadir perfil</h2>${profileForm()}<button class="btn primary block" data-act="createProfile">${T.profile.save}</button><button class="btn ghost block" data-act="closeSheet">Cancelar</button>`;
  } else if (sh.type === 'stage') {
    body = `<h2>${T.profile.upgrade}</h2><p>De <b>${T.stages[p.stage]}</b> a <b>${T.stages[sh.to]}</b>.</p><p class="muted">${T.profile.upgradeNote}</p>
      ${STAGES_WITH_MILESTONES.includes(sh.to) ? `<div class="field"><label for="st-since">${T.profile.since}</label><input id="st-since" class="input" type="date" data-bind="edit.since" value="${esc(p.since || '')}" max="${today()}"><span class="small muted">${T.profile.sinceHint}</span></div>` : ''}
      <button class="btn primary block" data-act="confirmStage">Cambiar a ${T.stages[sh.to]}</button><button class="btn ghost block" data-act="closeSheet">Cancelar</button>`;
  } else if (sh.type === 'edit') {
    body = `<h2>Editar</h2>
      <div class="field"><label for="e-name">${T.profile.name}</label><input id="e-name" class="input" data-bind="edit.name" value="${esc(ui.edit.name ?? p.name)}" maxlength="40"></div>
      <div class="field"><label for="e-since">${T.profile.since}</label><input id="e-since" class="input" type="date" data-bind="edit.since" value="${esc(ui.edit.since ?? p.since ?? '')}" max="${today()}"></div>
      <button class="btn primary block" data-act="saveEdit">${T.profile.save}</button>
      <button class="btn danger block" data-act="deleteProfile">${ui.ask === 'delProfile' ? '¿Seguro? Toca otra vez' : 'Eliminar perfil'}</button>
      <button class="btn ghost block" data-act="closeSheet">Cerrar</button>`;
  } else if (sh.type === 'section') {
    const k = sh.kind;
    let rows = [];
    if (k === 'gustos') rows = p.tastes.map((t, i) => ({ id: String(i), text: t }));
    if (k === 'evitar') rows = p.avoid.map((t, i) => ({ id: String(i), text: t }));
    if (k === 'tallas') rows = Object.entries(p.sizes).map(([a, b]) => ({ id: a, text: `${a}: ${b}` }));
    if (k === 'regalos') rows = p.gifts.map((g) => ({ id: g.id, text: g.text, photo: g.photo }));
    if (k === 'eventos') rows = p.events.map((e) => ({ id: e.id, text: `${e.text} · ${String(e.day).padStart(2, '0')}/${String(e.month).padStart(2, '0')}${e.year ? '/' + e.year : ''}` }));
    if (k === 'recordar') rows = p.remember.map((r) => ({ id: r.id, text: r.text, photo: r.photo }));
    body = `<h2>${T.dest[k]}</h2>${rows.length ? `<div class="card flat list">${rows.map((r) => `<div class="item"><div class="grow">${r.photo ? `<img class="thumb" style="max-height:120px;width:auto" src="${r.photo}" alt="">` : ''}${esc(r.text)}</div><button class="btn small ghost" data-act="delItem" data-kind="${k}" data-v="${esc(r.id)}" aria-label="Quitar">✕</button></div>`).join('')}</div>` : '<p class="muted">Aún no hay nada. Usa Apuntar para añadirlo.</p>'}
      <button class="btn ghost block" data-act="closeSheet">Cerrar</button>`;
  } else if (sh.type === 'legal') {
    body = `<h2>Condiciones y privacidad</h2><p class="small muted">Actualizado: ${UPDATED}</p>
      ${LEGAL.map((sec) => `<h3>${esc(sec.h)}</h3>${sec.p.map((x) => `<p class="small">${esc(x)}</p>`).join('')}`).join('')}
      <button class="btn primary block" data-act="closeSheet">Cerrar</button>`;
  } else if (sh.type === 'pin') {
    body = `<h2>${T.me.pin}</h2><div class="field"><label for="pin-new">Elige 4 números</label><input id="pin-new" class="input" type="password" inputmode="numeric" maxlength="4" autocomplete="off" data-bind="pin.value" value="${esc(ui.pin.value)}"></div>
      ${ui.pin.error ? `<p class="error">${esc(ui.pin.error)}</p>` : ''}<button class="btn primary block" data-act="savePin">${T.profile.save}</button><button class="btn ghost block" data-act="closeSheet">Cancelar</button>`;
  }
  return `<div class="sheet-back" data-act="closeSheetBack"><div class="sheet" role="dialog" aria-modal="true">${body}</div></div>`;
}

function navHtml() {
  const tabs = [['hoy', T.tabs.hoy, ICON.hoy], ['ella', T.tabs.ella, ICON.ella], ['apuntar', T.tabs.apuntar, `<span class="plus">${ICON.plus}</span>`], ['yo', T.tabs.yo, ICON.yo]];
  return `<nav class="nav" aria-label="Principal"><div class="nav-in">${tabs.map(([k, l, ic]) => `<button data-act="tab" data-v="${k}" ${ui.tab === k && !ui.screen ? 'aria-current="page"' : ''}>${ic}${l}</button>`).join('')}</div></nav>`;
}

// ---------- render ----------
function render() {
  applyTheme();
  const app = $('#app');
  const focusId = document.activeElement?.id;
  const sel = document.activeElement && 'selectionStart' in document.activeElement ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  let html;
  if (ui.locked) html = viewLock();
  else if (!S.profiles.length) html = viewOnboarding();
  else {
    const p = prof();
    let main;
    if (ui.screen === 'write') main = viewWrite(p);
    else if (ui.screen === 'sos') main = viewSos(p);
    else if (ui.tab === 'ella') main = viewElla(p);
    else if (ui.tab === 'apuntar') main = viewCapture(p);
    else if (ui.tab === 'yo') main = viewMe();
    else main = viewHoy(p);
    html = main + navHtml();
  }
  app.innerHTML = html + sheetHtml() + (ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : '');
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus();
      if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch { /* tipos sin selección */ }
    }
  }
}

// ---------- acciones ----------
// Mensaje del banco copiado o enviado: descansa unos días antes de volver a salir (engine/rotation.js).
// En los ganchos (mid = "gancho:versión") se apunta también el gancho, para los que descansan enteros (el atardecer).
function recordUse(mid) {
  if (!mid || prof()?.used?.[mid] === today()) return;
  const family = mid.includes(':') ? mid.split(':')[0] : null;
  updateProfile((p) => { const n = markUsed(p, mid, today()); return family ? markUsed(n, family, today()) : n; });
}

// Sin «Varias personas», un solo perfil. Las fichas que ya existan (importadas o de antes) nunca se borran.
const canAddProfile = () => !S.profiles.length || has('multi_profile');

function tryCreateProfile() {
  if (!canAddProfile()) { showToast('Tener varias personas llegará pronto'); return; }
  const f = ui.form;
  const r = Store.newProfile({ name: f.name, birth: f.birth, stage: f.stage, since: STAGES_WITH_MILESTONES.includes(f.stage) ? f.since : null }, today());
  if (!r.ok) {
    f.error = T.profile.errors[r.reason] || 'Revisa los datos.';
    render();
    return;
  }
  S.profiles.push(r.profile);
  S.activeId = r.profile.id;
  persist();
  ui.form = { name: '', birth: '', stage: 'pareja', since: '', error: '' };
  ui.sheet = null;
  ui.tab = 'hoy';
  render();
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 720;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen')); };
    img.src = url;
  });
}

function savePending() {
  const pend = ui.pending;
  const c = { ...pend.c };
  const id = Store.newId('x');
  if (c.dest === 'bandeja') {
    S.inbox.unshift({ id, text: pend.raw, photo: pend.photo || null, at: today() });
    showToast(`${T.capture.saved} ${T.dest.bandeja}`);
  } else {
    if (c.dest === 'eventos' && !c.date) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pend.dateISO || '');
      if (!m) { showToast('Elige una fecha para el evento'); return; }
      c.date = { year: +m[1], month: +m[2], day: +m[3] };
    }
    if (!String(c.value || '').trim()) { showToast('Escribe qué quieres guardar'); return; }
    updateProfile((p) => {
      const next = applyToProfile(p, c, id, today());
      if (pend.photo) {
        const list = c.dest === 'regalos' ? next.gifts : next.remember;
        if (list.length) list[list.length - 1].photo = pend.photo;
      }
      return next;
    });
    showToast(`${T.capture.saved} ${T.dest[c.dest]}`);
  }
  if (pend.fromInbox) S.inbox = S.inbox.filter((i) => i.id !== pend.fromInbox);
  persist();
  ui.pending = null;
  ui.draft = '';
  render();
}

const ACTS = {
  tab(el) { ui.tab = el.dataset.v; ui.screen = null; ui.sheet = null; render(); },
  back() { ui.screen = null; stopBreath(); render(); },
  goWrite() { ui.screen = 'write'; render(); },
  goSos() { ui.screen = 'sos'; render(); },
  formStage(el) { ui.form.stage = el.dataset.v; render(); },
  createProfile() { tryCreateProfile(); },
  newProfileSheet() {
    if (!canAddProfile()) { showToast('Tener varias personas llegará pronto'); return; }
    ui.form = { name: '', birth: '', stage: 'pareja', since: '', error: '' }; ui.sheet = { type: 'newProfile' }; render();
  },
  pickProfile(el) { S.activeId = el.dataset.v; persist(); render(); },
  stageSheet(el) { if (el.dataset.v !== prof().stage) { ui.edit = {}; ui.sheet = { type: 'stage', to: el.dataset.v }; render(); } },
  confirmStage() {
    const to = ui.sheet.to;
    const needs = STAGES_WITH_MILESTONES.includes(to);
    const since = ui.edit.since ?? prof().since;
    updateProfile((p) => ({ ...Store.setStage(p, to, today()), since: needs ? since || p.since : p.since }));
    ui.sheet = null; ui.edit = {}; render();
  },
  editSheet() { ui.edit = {}; ui.sheet = { type: 'edit' }; render(); },
  saveEdit() {
    const name = String(ui.edit.name ?? prof().name).trim();
    if (!name) { showToast(T.profile.errors['nombre-vacio']); return; }
    updateProfile((p) => ({ ...p, name, since: (ui.edit.since ?? p.since) || null }));
    ui.sheet = null; ui.edit = {}; render();
  },
  deleteProfile() {
    if (ui.ask !== 'delProfile') { ui.ask = 'delProfile'; render(); return; }
    const id = prof().id;
    S.profiles = S.profiles.filter((p) => p.id !== id);
    S.activeId = S.profiles[0]?.id || null;
    persist(); ui.sheet = null; ui.ask = null; render();
  },
  closeSheet() { ui.sheet = null; ui.ask = null; ui.edit = {}; render(); },
  closeSheetBack(el, ev) { if (ev.target === el) ACTS.closeSheet(); },
  openSection(el) { ui.sheet = { type: 'section', kind: el.dataset.v }; render(); },
  delItem(el) {
    const { kind, v } = el.dataset;
    updateProfile((p) => {
      const n = structuredClone(p);
      if (kind === 'gustos') n.tastes.splice(+v, 1);
      else if (kind === 'evitar') n.avoid.splice(+v, 1);
      else if (kind === 'tallas') delete n.sizes[v];
      else if (kind === 'regalos') n.gifts = n.gifts.filter((x) => x.id !== v);
      else if (kind === 'eventos') n.events = n.events.filter((x) => x.id !== v);
      else if (kind === 'recordar') n.remember = n.remember.filter((x) => x.id !== v);
      return n;
    });
    render();
  },
  toggleCycle() { updateProfile((p) => ({ ...p, cycle: { ...p.cycle, enabled: !p.cycle.enabled } })); render(); },
  toggleGesture(el) {
    const id = el.dataset.v;
    updateProfile((p) => {
      const cur = new Set((p.done && p.done[today()]) || []);
      const on = !cur.has(id);
      on ? cur.add(id) : cur.delete(id);
      const next = { ...p, done: { [today()]: [...cur] } };
      return on ? markUsed(next, id, today()) : unmarkUsedToday(next, id, today());
    });
    render();
  },
  copy(el) { copyText(el.dataset.text); recordUse(el.dataset.mid); },
  classify() {
    const text = ui.draft.trim();
    if (!text) { showToast('Escribe algo o haz una foto'); return; }
    const c = classify(text);
    ui.pending = { c, raw: text, photo: null, dateISO: c.date ? `${c.date.year || new Date().getFullYear()}-${String(c.date.month).padStart(2, '0')}-${String(c.date.day).padStart(2, '0')}` : '' };
    render();
  },
  pickDest(el) {
    const d = el.dataset.v;
    ui.pending.c = { ...ui.pending.c, dest: d, value: ui.pending.c.value || ui.pending.raw || '' };
    render();
  },
  savePending() { savePending(); },
  cancelPending() { ui.pending = null; render(); },
  inboxClassify(el) {
    const it = S.inbox.find((i) => i.id === el.dataset.v);
    if (!it) return;
    const c = it.text ? classify(it.text) : { dest: 'recordar', value: '', confidence: 'baja' };
    if (it.photo && !['regalos', 'recordar', 'bandeja'].includes(c.dest)) c.dest = 'recordar';
    ui.pending = { c, raw: it.text, photo: it.photo, fromInbox: it.id, dateISO: '' };
    render();
  },
  inboxDiscard(el) { S.inbox = S.inbox.filter((i) => i.id !== el.dataset.v); persist(); render(); },
  toggleBreath() { ui.breath.on ? stopBreath() : startBreath(); render(); },
  openSos(el) { ui.open = ui.open === el.dataset.v ? null : el.dataset.v; render(); },
  toggleSetting(el) {
    const k = el.dataset.v;
    if (el.disabled) return;
    S.settings[k] = !S.settings[k];
    if (k === 'metrics') metrics.consent(S.settings, S.settings.metrics);
    persist(); render();
  },
  togglePin() {
    if (S.settings.pinHash) { S.settings.pinHash = null; S.settings.pinSalt = null; S.settings.lockOnLeave = false; persist(); render(); }
    else { ui.pin = { value: '', error: '' }; ui.sheet = { type: 'pin' }; render(); }
  },
  async savePin() {
    if (!/^\d{4}$/.test(ui.pin.value)) { ui.pin.error = 'Usa exactamente 4 números.'; render(); return; }
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const hash = await Store.hashPin(ui.pin.value, salt);
    if (!hash) { ui.pin.error = 'Este navegador no permite crear un PIN seguro.'; render(); return; }
    S.settings.pinSalt = salt; S.settings.pinHash = hash;
    persist(); ui.sheet = null; ui.pin = { value: '', error: '' }; showToast('PIN activado');
  },
  async pinKey(el) {
    const k = el.dataset.v;
    ui.pinError = false;
    if (k === '⌫') ui.pinEntry = ui.pinEntry.slice(0, -1);
    else if (ui.pinEntry.length < 4) ui.pinEntry += k;
    if (ui.pinEntry.length === 4) {
      const h = await Store.hashPin(ui.pinEntry, S.settings.pinSalt);
      if (h === S.settings.pinHash) ui.locked = false;
      else ui.pinError = true;
      ui.pinEntry = '';
    }
    render();
  },
  theme(el) { S.settings.theme = el.dataset.v; persist(); render(); },
  gps() {
    if (!navigator.geolocation) { showToast('Tu navegador no permite ubicación. Elige tu ciudad en la lista.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const near = nearestCity(pos.coords.latitude, pos.coords.longitude);
        S.settings.city = { name: near.name, lat: pos.coords.latitude, lon: pos.coords.longitude, tz: detectTimezone() || near.tz };
        S.settings.country = countryFromTimezone(S.settings.city.tz) || near.country;
        persist(); showToast(`Ubicación: ${near.name}`);
      },
      () => showToast('No se pudo obtener la ubicación. Elige tu ciudad en la lista.'),
      { timeout: 8000, maximumAge: 600000 }
    );
  },
  exportData() { ui.exp.text = Store.exportBackup(S); render(); },
  async doImport() {
    let text = ui.imp.text;
    if (Store.isEncryptedBackup(text)) {
      const d = await Store.decryptBackup(text, ui.pass.value);
      if (!d.ok) { ui.imp.msg = d.reason === 'contrasena-incorrecta' ? 'Contraseña incorrecta o copia dañada.' : 'No se pudo descifrar en este navegador.'; render(); return; }
      text = d.text;
    }
    const r = Store.importBackup(text);
    if (!r.ok) { ui.imp.msg = r.reason === 'no-es-json' ? 'Eso no parece una copia válida.' : 'No reconozco ese formato.'; render(); return; }
    if (r.source === 'barney-v1') {
      if (r.demoOnly || !r.state.profiles.length) {
        ui.imp.msg = r.state.profiles.length ? 'Solo hay datos de demostración de Barney: no se ha importado nada.' : 'No hay perfiles de adultos que importar.';
        render(); return;
      }
      S.profiles.push(...r.state.profiles);
      if (!S.activeId) S.activeId = r.state.profiles[0].id;
      if (!S.settings.city && r.state.settings.city) S.settings.city = r.state.settings.city;
      ui.imp = { text: '', msg: `Listo: ${r.state.profiles.length} perfil(es) importado(s) desde Barney.` };
    } else {
      S = r.state;
      ui.imp = { text: '', msg: `Listo: copia restaurada (${S.profiles.length} perfil(es)).` };
    }
    persist(); render(); showToast(ui.imp.msg.replace(/^Listo: /, ''));
  },
  wipe() {
    if (ui.ask !== 'wipe') { ui.ask = 'wipe'; render(); return; }
    S = Store.emptyState(); persist();
    Object.assign(ui, { ask: null, tab: 'hoy', screen: null, locked: false, exp: { text: '' } });
    render();
  },
  importBarney() {
    const r = readBarney();
    if (!r) return;
    S.profiles.push(...r.state.profiles);
    S.activeId = S.activeId || r.state.profiles[0].id;
    if (!S.settings.city && r.state.settings.city) S.settings.city = r.state.settings.city;
    persist(); render();
    showToast(`Importados ${r.state.profiles.length} perfil(es) de Barney`);
  },
  companionStyle(el) {
    const id = el.dataset.v;
    if (!isAvailable(id, has('companions_pro'))) { showToast('Ese acompañante llegará pronto'); return; }
    S.settings.companionStyle = id; persist(); render();
  },
  saveStyle() {
    const samples = ui.styleDraft.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12);
    const traits = analyzeStyle(samples);
    if (!traits) { showToast('Pega al menos 2 mensajes tuyos'); return; }
    S.settings.style = { samples, traits };
    persist(); showToast('Estilo aprendido'); render();
  },
  styleMsg(el) { ui.alt[el.dataset.text] = applyStyle(el.dataset.text, S.settings.style?.traits); render(); },
  revertMsg(el) { delete ui.alt[el.dataset.text]; render(); },
  async aiMsg(el) {
    const p = prof(), msg = el.dataset.text;
    ui.busy = 'ai:' + msg; render();
    const facts = hookData(p).hooks.filter((h) => h.message).map((h) => h.message.replaceAll(p.name, '{n}'));
    const r = await aiRewrite(S.settings, { message: msg.replaceAll(p.name, '{n}'), band: bandOf(p), group: STAGE_GROUP[p.stage], stage: p.stage, facts, traits: S.settings.style?.traits });
    ui.busy = null;
    if (r.ok && r.text) ui.alt[msg] = fillName(r.text, p.name);
    else showToast(AI_ERR[r.ok ? r.reason : r.reason] || 'No se pudo reescribir');
    render();
  },
  async aiChat() {
    const text = ui.chatDraft.trim();
    if (!text) return;
    const p = prof();
    ui.chat.push({ role: 'user', text: text.replaceAll(p.name, '{n}') });
    ui.chatDraft = ''; ui.busy = 'chat'; render();
    const r = await aiSos(S.settings, { history: ui.chat, band: bandOf(p), group: STAGE_GROUP[p.stage], stage: p.stage });
    ui.busy = null;
    if (r.ok && r.text) ui.chat.push({ role: 'assistant', text: r.text });
    else showToast(AI_ERR[r.reason] || 'No se pudo responder');
    render();
  },
  async aiPhoto() {
    const p = prof();
    ui.busy = 'photo'; render();
    const r = await aiPhoto(S.settings, { photo: ui.pending.photo, band: bandOf(p) });
    ui.busy = null;
    if (r.ok && r.dest) {
      // Con foto solo se guarda en Regalos o Recordar; si la IA sugiere otro sitio, el campo va dentro del texto («anillo: talla 14»).
      const fits = ['regalos', 'recordar'].includes(r.dest);
      const value = r.value ? (!fits && r.field ? `${r.field}: ${r.value}` : r.value) : ui.pending.raw || '';
      ui.pending.c = { dest: fits ? r.dest : 'recordar', field: fits ? r.field || null : null, value, confidence: r.confidence || 'baja' };
      showToast('Sugerencia lista. Revísala antes de guardar.');
    } else showToast(AI_ERR[r.reason] || 'No se pudo reconocer la foto');
    render();
  },
  async findPlans() {
    const p = prof(), loc = location();
    if (!loc) return;
    ui.busy = 'plans'; ui.plansMsg = ''; render();
    const group = STAGE_GROUP[p.stage];
    const r = await fetchPlans({ lat: loc.lat, lon: loc.lon, group, settings: S.settings });
    ui.busy = null;
    if (r.ok && r.plans.length) { S.settings.plans = { city: S.settings.city.name, group, items: r.plans, at: today() }; persist(); }
    else ui.plansMsg = r.ok ? 'No encontré planes cerca. Prueba con otra ciudad.' : 'No se pudo consultar ahora. Prueba más tarde o desde la app instalada.';
    render();
  },
  async exportEnc() {
    const r = await Store.encryptBackup(Store.exportBackup(S), ui.pass.value);
    if (!r.ok) { showToast(r.reason === 'contrasena-corta' ? 'Usa una contraseña de 6 caracteres o más' : 'Este navegador no permite cifrar'); return; }
    ui.exp.text = r.text; render();
  },
  async sendFeedback() {
    const text = ui.fb.text.trim();
    if (text.length < 3) { showToast('Escribe tu comentario'); return; }
    ui.busy = 'fb'; render();
    const r = await sendFeedback(S.settings, { text, screen: ui.screen || ui.tab, version: T.me.version });
    ui.busy = null;
    if (r.ok) { ui.fb.text = ''; track('feedback_send'); showToast('¡Gracias! Lo leemos todo.'); }
    else showToast(r.reason === 'limite' ? 'Has enviado muchos seguidos. Prueba en un rato.' : 'No se pudo enviar. Prueba más tarde.');
    render();
  },
  refreshAccess() { refreshAccess(true); },
  // Archivo .ics con las fechas de todas las fichas; al abrirlo el móvil ofrece añadirlas al calendario.
  exportCalendar() {
    const { text, count } = buildICS(S.profiles, today(), { discreet: S.settings.discreetNotifs });
    if (!count) { showToast('Aún no hay fechas que añadir'); return; }
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'agenda.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    showToast(`${count} fecha(s) listas: ábrelas para añadirlas a tu calendario`);
  },
  goJoin() { ui.tab = 'yo'; ui.screen = null; render(); setTimeout(() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' }), 0); },
  legalSheet(el, ev) { ev?.preventDefault(); ui.sheet = { type: 'legal' }; render(); },
  joinCheck(el) { ui.join[el.dataset.v] = el.checked; },
  async joinBeta() {
    const j = ui.join;
    j.error = '';
    if (!j.terms) { j.error = T.join.errors.condiciones; render(); return; }
    ui.busy = 'join'; render();
    const r = await registerBeta({ alias: j.alias.trim(), email: j.email.trim(), terms: j.terms, metrics: j.metrics });
    ui.busy = null;
    if (!r.ok) { j.error = T.join.errors[r.reason] || T.join.errors.servidor; render(); return; }
    Object.assign(S.settings, { testerCode: r.code, betaStatus: r.status, metrics: j.metrics, features: [], group: null, configAt: Date.now() });
    persist();
    ui.join = { alias: '', email: '', terms: false, metrics: false, error: '' };
    render(); showToast('¡Apuntado! Te avisaremos al aprobarte.');
  }
};

// ---------- acceso beta: funciones abiertas para este tester ----------
// Se consulta al arrancar y al volver a la app (como mucho una vez por hora); sin red se usa lo último guardado.
async function refreshAccess(force = false) {
  const s = S.settings;
  if (!aiConfigured(s)) {
    if (s.features.length || s.group || s.betaStatus) { Object.assign(s, { features: [], group: null, betaStatus: null, configAt: null }); persist(); render(); }
    return;
  }
  if (ui.busy === 'access' || (!force && s.configAt && Date.now() - s.configAt < 3600e3)) return;
  ui.busy = 'access'; if (force) render();
  const r = await fetchConfig(s);
  ui.busy = null;
  if (!r.ok) { if (force) showToast('No se pudo comprobar el acceso. Sigues con lo último guardado.'); else render(); return; }
  const was = S.settings.betaStatus;
  Object.assign(S.settings, { features: r.features, group: r.group, betaStatus: r.status, configAt: Date.now() });
  persist(); render();
  if (was === 'pending' && r.status === 'active') showToast('¡Ya estás dentro de la beta!');
  else if (force) showToast({ active: 'Acceso actualizado', pending: 'Aún pendiente de aprobación', blocked: 'Acceso desactivado' }[r.status] || 'Código no reconocido');
}

const CHANGES = {
  async photo(el) {
    const f = el.files && el.files[0];
    if (!f) return;
    try {
      const photo = await readPhoto(f);
      track('photo_add');
      ui.pending = { c: { dest: 'bandeja', value: '', confidence: 'baja' }, raw: ui.draft.trim(), photo, dateISO: '' };
      render();
    } catch { showToast('No se pudo leer la foto'); }
  },
  city(el) {
    const c = CITIES.find((x) => x.name === el.value);
    if (c) {
      S.settings.city = { name: c.name, lat: c.lat, lon: c.lon, tz: c.tz };
      S.settings.country = c.country;
      persist(); render();
    }
  },
  aiCode(el) { S.settings.testerCode = el.value.trim(); persist(); refreshAccess(true); },
  companion(el) { S.settings.companion = el.value.trim().slice(0, 24) || 'Gym Bro'; persist(); },
  cycleLast(el) { updateProfile((p) => ({ ...p, cycle: { ...p.cycle, lastStart: el.value || null } })); }
};

// ---------- respiración ----------
let breathTimer = null;
function startBreath() {
  ui.breath = { on: true, phase: 'in' };
  const order = ['in', 'hold', 'out', 'hold'];
  let i = 0;
  clearInterval(breathTimer);
  breathTimer = setInterval(() => {
    i = (i + 1) % order.length;
    ui.breath.phase = order[i];
    const b = $('#breath');
    if (!b) return;
    b.className = `breath ${order[i]}`;
    b.textContent = { in: T.sos.inhale, hold: T.sos.hold, out: T.sos.exhale }[order[i]];
  }, 4000);
}
function stopBreath() {
  clearInterval(breathTimer);
  ui.breath = { on: false, phase: 'in' };
}

// ---------- eventos ----------
document.addEventListener('click', (ev) => {
  const link = ev.target.closest('a[data-track]');
  if (link) { track(link.dataset.track); recordUse(link.dataset.mid); return; }
  const el = ev.target.closest('[data-act]');
  if (!el || el.tagName === 'A') return;
  const fn = ACTS[el.dataset.act];
  if (!fn) return;
  if (el.dataset.act === 'tab') track(`tab_${el.dataset.v}`);
  else if (el.dataset.act === 'toggleBreath' && !ui.breath.on) track('breath');
  else if (ACT_EVENT[el.dataset.act]) track(ACT_EVENT[el.dataset.act]);
  fn(el, ev);
});
document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.bind) setPath(ui, el.dataset.bind, el.value);
});
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.bind) setPath(ui, el.dataset.bind, el.value);
  if (el.dataset && el.dataset.change && CHANGES[el.dataset.change]) CHANGES[el.dataset.change](el);
  if (el.type === 'date' && el.dataset.bind && !el.dataset.change) render();
});
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); metrics.flush(S.settings, { keepalive: true }); return; }
  refreshAccess();
  if (S.settings.pinHash && S.settings.lockOnLeave && hiddenAt && Date.now() - hiddenAt > 60000) {
    ui.locked = true; ui.pinEntry = ''; render();
  }
});

// ---------- arranque ----------
if (!S.settings.country) {
  const tz = detectTimezone();
  S.settings.country = countryFromTimezone(tz);
  if (!S.settings.city && tz) {
    const c = CITIES.find((x) => x.tz === tz);
    if (c && S.settings.country) { /* solo país: la ciudad la elige la persona */ }
  }
}
if (globalThis.CLUTCH_SW && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
render();
refreshAccess().then(() => { track('open'); metrics.flush(S.settings); });
setInterval(() => metrics.flush(S.settings), 60000);
// Avisos de error técnicos (solo con permiso de estadísticas; sin datos personales).
const reportError = (message, where) => metrics.error(S.settings, { message, where, screen: ui.screen || ui.tab, version: T.me.version });
window.addEventListener('error', (e) => reportError(e.message, `${String(e.filename || '').split('/').pop()}:${e.lineno}:${e.colno}`));
window.addEventListener('unhandledrejection', (e) => reportError(String(e.reason?.message || e.reason), String(e.reason?.stack || '').split('\n')[1]?.trim()));
export { render };
