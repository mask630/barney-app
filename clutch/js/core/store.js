// Datos de Clutch v2. Todo vive en el dispositivo. Sin dependencias del DOM (el almacenamiento se inyecta).

import { checkAdult, STAGES, isValidStage, LEGACY_STAGE, AGE_BANDS } from './stages.js';

export const STORE_KEY = 'clutch_v2';
export const SCHEMA = 2;

export function emptyState() {
  return {
    v: SCHEMA,
    settings: {
      lang: 'es',
      country: null,
      city: null, // { name, lat, lon, tz }
      pinHash: null,
      pinSalt: null,
      lockOnLeave: false,
      theme: 'auto',
      companionStyle: 'cordial',
      style: null,
      testerCode: '',
      features: [], // funciones abiertas para este tester (las manda el servidor)
      group: null,
      betaStatus: null, // null (sin apuntar) · pending · active · blocked · anon (código no reconocido)
      metrics: false, // estadísticas anónimas: solo si la persona las acepta
      configAt: null,
      plans: null
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

// La fecha de nacimiento es opcional: sin ella hace falta la edad aproximada (band), que también garantiza 18+.
export function newProfile({ name, birth = null, band = null, stage = 'pareja', since = null, tastes = [] }, todayISO) {
  if (birth) {
    const adult = checkAdult(birth, todayISO);
    if (!adult.ok) return { ok: false, reason: adult.reason };
  } else if (!AGE_BANDS.includes(band)) return { ok: false, reason: 'sin-edad' };
  if (!isValidStage(stage)) return { ok: false, reason: 'etapa-invalida' };
  const clean = String(name || '').trim().slice(0, 40);
  if (!clean) return { ok: false, reason: 'nombre-vacio' };
  return {
    ok: true,
    profile: {
      id: newId('p'),
      name: clean,
      birth: birth || null,
      band: birth ? null : band, // edad aproximada si no se sabe la fecha
      stage,
      since: since || null,
      tastes: [...new Set(tastes.map((t) => String(t).trim().toLowerCase()).filter(Boolean))],
      sizes: {}, // anillo, camiseta, calzado...
      gifts: [], // { id, text, at }
      events: [], // { id, text, month, day, year|null, yearly }
      remember: [], // { id, text, at }
      avoid: [], // lo que no le gusta
      cycle: { enabled: false, lastStart: null, length: 28, starts: [] },
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
    !!p.since
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function load(storage) {
  try {
    const raw = storage.getItem(STORE_KEY);
    if (!raw) return emptyState();
    const s = JSON.parse(raw);
    if (!s || s.v !== SCHEMA || !Array.isArray(s.profiles)) return emptyState();
    return upgradeStages({ ...emptyState(), ...s, settings: { ...emptyState().settings, ...s.settings } });
  } catch {
    return emptyState();
  }
}

// Fichas de etapas retiradas (Amiga, Objetivo): pasan a Rollo conservando todo su historial.
export function upgradeStages(state, todayISO = new Date().toISOString().slice(0, 10)) {
  const profiles = state.profiles.map((p) => (LEGACY_STAGE[p.stage] ? { ...p, stage: LEGACY_STAGE[p.stage], history: [...(p.history || []), { stage: LEGACY_STAGE[p.stage], at: todayISO }] } : p));
  return { ...state, profiles };
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
    return { ok: true, state: upgradeStages({ ...emptyState(), ...rest, settings: { ...emptyState().settings, ...rest.settings } }), source: 'clutch' };
  }
  return { ok: false, reason: 'formato-desconocido' };
}

// --- PIN (SHA-256 con sal). El PIN bloquea la interfaz, no cifra los datos. ---

export async function hashPin(pin, salt, subtle = globalThis.crypto?.subtle) {
  if (!subtle) return null;
  const buf = new TextEncoder().encode(`${salt}:${pin}`);
  const out = new Uint8Array(await subtle.digest('SHA-256', buf));
  return Array.from(out, (b) => b.toString(16).padStart(2, '0')).join('');
}

// --- Copia cifrada (AES-GCM, clave derivada de una contraseña con PBKDF2). Todo en el dispositivo. ---

const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(pass, salt, subtle, iterations) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptBackup(text, pass, subtle = globalThis.crypto?.subtle, iterations = 250000) {
  if (!subtle) return { ok: false, reason: 'sin-crypto' };
  if (!pass || pass.length < 6) return { ok: false, reason: 'contrasena-corta' };
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt, subtle, iterations);
  const data = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)));
  return { ok: true, text: JSON.stringify({ clutchEnc: 1, it: iterations, salt: b64(salt), iv: b64(iv), data: b64(data) }) };
}

export function isEncryptedBackup(text) {
  try { return JSON.parse(text)?.clutchEnc === 1; } catch { return false; }
}

export async function decryptBackup(text, pass, subtle = globalThis.crypto?.subtle) {
  if (!subtle) return { ok: false, reason: 'sin-crypto' };
  try {
    const o = JSON.parse(text);
    if (o.clutchEnc !== 1) return { ok: false, reason: 'formato-desconocido' };
    const key = await deriveKey(pass, unb64(o.salt), subtle, o.it);
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, key, unb64(o.data));
    return { ok: true, text: new TextDecoder().decode(plain) };
  } catch {
    return { ok: false, reason: 'contrasena-incorrecta' };
  }
}
