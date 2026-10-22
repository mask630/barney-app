// Quién es cada tester y qué funciones tiene. Las funciones van por grupos para poder abrirlas por fases.

import { getJson } from './db.js';

export const FEATURES = ['ai_rewrite', 'my_style', 'companions_pro', 'sos_chat', 'photo_ai', 'plans', 'encrypted_backup'];

export const DEFAULT_GROUPS = {
  base: [],
  'pro-1': ['ai_rewrite', 'my_style', 'companions_pro'],
  'pro-2': FEATURES,
  admin: FEATURES
};

export async function groups() {
  return (await getJson('groups')) || DEFAULT_GROUPS;
}

// Los códigos de CLUTCH_CODES (variable de Vercel) son del dueño: grupo admin, siempre activos.
export async function findTester(code) {
  code = String(code || '').trim();
  if (!code) return null;
  const owners = (process.env.CLUTCH_CODES || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (owners.includes(code)) return { code, group: 'admin', status: 'active' };
  const t = await getJson(`tester:${code}`);
  return t && t.status === 'active' ? t : null;
}

export async function featuresFor(tester) {
  if (!tester) return [];
  const g = await groups();
  return (g[tester.group] || []).filter((f) => FEATURES.includes(f));
}

export function cors(req, res, methods = 'POST, OPTIONS') {
  const allowed = (process.env.CLUTCH_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', allowed.length ? (allowed.includes(origin) ? origin : allowed[0]) : '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Clutch-Code');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Vary', 'Origin');
}
