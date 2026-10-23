// Quién es cada tester y qué funciones tiene. Las funciones van por grupos para poder abrirlas por fases.
// Tester en la base de datos: tester:<código> = { code, alias, email, group, status, metrics, createdAt, lastSeen }
// status: pending (espera tu aprobación) · active · blocked

import { getJson, setJson, incr, addToSet, expire } from './db.js';

// multi_profile: más de una persona. Sin ella, un solo perfil.
export const FEATURES = ['multi_profile', 'ai_rewrite', 'my_style', 'companions_pro', 'sos_chat', 'photo_ai', 'profile_ai', 'plans', 'encrypted_backup'];

export const DEFAULT_GROUPS = {
  base: [],
  'pro-1': ['multi_profile', 'ai_rewrite', 'my_style', 'companions_pro'],
  'pro-2': FEATURES,
  admin: FEATURES
};

// open: se aceptan altas · maxTesters: plazas · aiPerDay: peticiones de IA por tester y día
export const DEFAULT_SETTINGS = { open: true, maxTesters: 50, aiPerDay: 30 };

export async function groups() {
  return (await getJson('groups')) || DEFAULT_GROUPS;
}

export async function betaSettings() {
  return { ...DEFAULT_SETTINGS, ...((await getJson('beta:settings')) || {}) };
}

const ownerCodes = () => (process.env.CLUTCH_CODES || '').split(',').map((s) => s.trim()).filter(Boolean);

// Los códigos de CLUTCH_CODES (variable de Vercel) son del dueño: grupo admin, siempre activos.
// Devuelve el tester sea cual sea su estado; quien llama decide qué hacer con pending/blocked.
export async function findTester(code) {
  code = String(code || '').trim();
  if (!code) return null;
  if (ownerCodes().includes(code)) return { code, alias: 'Dueño', group: 'admin', status: 'active', owner: true };
  return getJson(`tester:${code}`);
}

export const isActive = (t) => t?.status === 'active';

export async function featuresFor(tester) {
  if (!isActive(tester)) return [];
  // El dueño lo tiene siempre todo, también las funciones nuevas que aún no estén en los grupos guardados.
  if (tester.group === 'admin') return FEATURES;
  const g = await groups();
  return (g[tester.group] || []).filter((f) => FEATURES.includes(f));
}

// Marca el día de uso: último día en la ficha y el código en seen:<día> (para activos diarios y retención; dura 120 días).
// Una vez al día como mucho por tester. Es dato de gestión de la beta, no de las estadísticas opcionales.
// lastSeen: último uso de cualquier tester · activeDay: último día contado como activo (solo aprobados).
export async function touchSeen(tester, todayISO = new Date().toISOString().slice(0, 10)) {
  if (!tester || tester.owner) return;
  const countActive = tester.status === 'active' && tester.activeDay !== todayISO;
  if (tester.lastSeen === todayISO && !countActive) return;
  try {
    await setJson(`tester:${tester.code}`, { ...tester, lastSeen: todayISO, ...(countActive && { activeDay: todayISO }) });
    if (countActive) {
      await addToSet(`seen:${todayISO}`, tester.code);
      await expire(`seen:${todayISO}`, 120 * 86400);
    }
  } catch { /* no bloquea la app */ }
}

// Límite diario de IA por tester (el dueño no tiene límite).
export async function aiQuotaOk(tester, todayISO = new Date().toISOString().slice(0, 10)) {
  if (tester.owner) return true;
  const { aiPerDay } = await betaSettings();
  return (await incr(`ai:${tester.code}:${todayISO}`, 2 * 86400)) <= aiPerDay;
}

// Panel: CLUTCH_ADMIN si existe; si no, cualquier código del dueño.
export function isAdmin(req) {
  const key = String(req.headers['x-admin-key'] || '').trim();
  if (!key) return false;
  const admin = (process.env.CLUTCH_ADMIN || '').trim();
  return admin ? key === admin : ownerCodes().includes(key);
}

export function cors(req, res, methods = 'POST, OPTIONS') {
  const allowed = (process.env.CLUTCH_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', allowed.length ? (allowed.includes(origin) ? origin : allowed[0]) : '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Clutch-Code');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Vary', 'Origin');
}

export const readBody = (req) => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {});
