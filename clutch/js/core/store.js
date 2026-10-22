// Datos de Clutch v2. Todo vive en el dispositivo. Sin dependencias del DOM (el almacenamiento se inyecta).

import { checkAdult, STAGES, isValidStage } from './stages.js';

export const STORE_KEY = 'clutch_v2';
export const SCHEMA = 2;

export function emptyState() {
  return {
    v: SCHEMA,
    settings: {
      lang: 'es',
      country: null,
      city: null, // { name, lat, lon, tz }
      companion: 'Gym Bro',
      pinHash: null,
      pinSalt: null,
      lockOnLeave: false,
      discreetNotifs: true,
      theme: 'auto'
    },
    profiles: [],
    activeId: null,
    inbox: []
  };
}

let seq = 0;
export function newId(prefix = 'p') {
  seq = (seq + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function newProfile({ name, birth, stage = 'amiga', since = null, tastes = [] }, todayISO) {
  const adult = checkAdult(birth, todayISO);
  if (!adult.ok) return { ok: false, reason: adult.reason };
  if (!isValidStage(stage)) return { ok: false, reason: 'etapa-invalida' };
  const clean = String(name || '').trim().slice(0, 40);
  if (!clean) return { ok: false, reason: 'nombre-vacio' };
  return {
    ok: true,
    profile: {
      id: newId('p'),
      name: clean,
      birth,
      stage,
      since: since || null,
      tastes: [...new Set(tastes.map((t) => String(t).trim().toLowerCase()).filter(Boolean))],
      sizes: {}, // anillo, camiseta, calzado...
      gifts: [], // { id, text, at }
      events: [], // { id, text, month, day, year|null, yearly }
      remember: [], // { id, text, at }
      avoid: [], // lo que no le gusta
      cycle: { enabled: false, lastStart: null, length: 28 },
      history: [{ stage, at: todayISO }],
      createdAt: todayISO
    }
  };
}

// Subir (o cambiar) de etapa conserva todo el historial.
export function setStage(profile, stage, todayISO) {
  if (!isValidStage(stage) || profile.stage === stage) return profile;
  return { ...profile, stage, history: [...profile.history, { stage, at: todayISO }] };
}

export function stageRank(stage) {
  return STAGES.indexOf(stage);
}

// Completitud de la ficha (para el empujón "62 %"): solo cuenta campos reales.
export function completeness(p) {
  const checks = [
    !!p.birth,
    p.tastes.length > 0,
    Object.keys(p.sizes).length > 0,
    p.gifts.length > 0,
    p.events.length > 0,
    !!p.since || stageRank(p.stage) < stageRank('citas')
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function load(storage) {
  try {
    const raw = storage.getItem(STORE_KEY);
    if (!raw) return emptyState();
    const s = JSON.parse(raw);
    if (!s || s.v !== SCHEMA || !Array.isArray(s.profiles)) return emptyState();
    return { ...emptyState(), ...s, settings: { ...emptyState().settings, ...s.settings } };
  } catch {
    return emptyState();
  }
}

export function save(storage, state) {
  try {
    storage.setItem(STORE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function activeProfile(state) {
  return state.profiles.find((p) => p.id === state.activeId) || state.profiles[0] || null;
}

// --- Copia de seguridad ---

export function exportBackup(state) {
  return JSON.stringify({ app: 'clutch', ...state }, null, 2);
}

export function importBackup(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'no-es-json' };
  }
  if (o && o.app === 'clutch' && o.v === SCHEMA && Array.isArray(o.profiles)) {
    const { app, ...rest } = o;
    return { ok: true, state: { ...emptyState(), ...rest, settings: { ...emptyState().settings, ...rest.settings } }, source: 'clutch' };
  }
  if (o && Array.isArray(o.girls)) return migrateFromBarney(o);
  return { ok: false, reason: 'formato-desconocido' };
}

// --- Migración desde Barney v1 (clave barney_v9) ---

const V1_STAGE = { crush: 'objetivo', casual: 'rollo', dating: 'citas', partner: 'pareja' };
const V1_DEMO_NAMES = new Set(['Claudia']); // el seed de demostración de v1 no se importa como datos reales

export function migrateFromBarney(v1, todayISO = new Date().toISOString().slice(0, 10)) {
  const state = emptyState();
  const skipped = [];
  for (const g of v1.girls || []) {
    const r = newProfile({ name: g.name, birth: g.bday, stage: V1_STAGE[g.stage] || 'amiga' }, todayISO);
    if (!r.ok) {
      skipped.push({ name: g.name, reason: r.reason });
      continue;
    }
    const p = r.profile;
    for (const [k, val] of Object.entries(g.sizes || {})) p.sizes[String(k).toLowerCase()] = String(val);
    for (const [k, val] of Object.entries(g.favs || {})) if (val) p.tastes.push(String(val).toLowerCase());
    p.tastes = [...new Set(p.tastes)];
    for (const w of g.wish || []) p.gifts.push({ id: newId('g'), text: w.tag ? `${w.t} (${w.tag})` : String(w.t), at: todayISO });
    for (const e of g.events || []) p.remember.push({ id: newId('r'), text: e.tag ? `${e.t} · ${e.tag}` : String(e.t), at: todayISO });
    for (const d of g.dates || []) {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.d || '');
      if (m) p.events.push({ id: newId('e'), text: d.t, month: +m[2], day: +m[3], year: +m[1], yearly: false });
    }
    if (g.cycleEnabled && g.last) p.cycle = { enabled: true, lastStart: String(g.last).slice(0, 10), length: g.cycle || 28 };
    state.profiles.push(p);
  }
  state.activeId = state.profiles[0]?.id || null;
  if (v1.city) state.settings.city = { name: v1.city, lat: null, lon: null, tz: null };
  const demoOnly = state.profiles.length > 0 && state.profiles.every((p) => V1_DEMO_NAMES.has(p.name));
  return { ok: true, state, source: 'barney-v1', skipped, demoOnly };
}

// --- PIN (SHA-256 con sal). El PIN bloquea la interfaz, no cifra los datos. ---

export async function hashPin(pin, salt, subtle = globalThis.crypto?.subtle) {
  if (!subtle) return null;
  const buf = new TextEncoder().encode(`${salt}:${pin}`);
  const out = new Uint8Array(await subtle.digest('SHA-256', buf));
  return Array.from(out, (b) => b.toString(16).padStart(2, '0')).join('');
}
