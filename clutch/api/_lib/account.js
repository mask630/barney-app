// Cuentas de usuario: cada email es una cuenta y, a la vez, un tester de la beta (mismo código de siempre).
// Sesiones: session:<token> = { code, email } con caducidad. Datos: data:<código> = ficha cifrada (AES-256-GCM).
// CLUTCH_DATA_KEY (32 bytes en base64) cifra los datos de todos: NUNCA se cambia, o los datos guardados no se podrán leer.

import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { getJson, setJson, setJsonEx, addToSet, del } from './db.js';
import { newCode } from '../register.js';

export const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
export const SESSION_DAYS = 180;

export const normEmail = (e) => String(e || '').trim().toLowerCase();
export const sha = (s) => createHash('sha256').update(s).digest('hex');

// Busca la cuenta del email o la crea (tester pendiente de aprobación, grupo base). Las cuentas nuevas aceptan las condiciones.
export async function accountFor(email, { terms = false, metrics = false } = {}, todayISO = new Date().toISOString().slice(0, 10)) {
  const known = await getJson(`email:${email}`);
  if (known) {
    const tester = await getJson(`tester:${known}`);
    if (tester) return { ok: true, tester, created: false };
  }
  if (terms !== true) return { ok: false, reason: 'condiciones' };
  const code = newCode();
  const alias = email.split('@')[0].slice(0, 24);
  const tester = { code, alias, email, group: 'base', status: 'pending', metrics: metrics === true, account: true, createdAt: todayISO, lastSeen: todayISO };
  await setJson(`tester:${code}`, tester);
  await setJson(`email:${email}`, code);
  await addToSet('testers', code);
  return { ok: true, tester, created: true };
}

export async function newSession(tester) {
  const token = randomBytes(24).toString('base64url');
  await setJsonEx(`session:${sha(token)}`, { code: tester.code, email: tester.email }, SESSION_DAYS * 86400);
  return token;
}

// Sesión válida y con su tester aún existente (si se borró la cuenta, deja de valer en todos los móviles).
export async function sessionFrom(req) {
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,64})$/.exec(String(req.headers.authorization || ''));
  if (!m) return null;
  const s = await getJson(`session:${sha(m[1])}`);
  if (!s) return null;
  const tester = await getJson(`tester:${s.code}`);
  return tester ? { ...s, token: m[1], tester } : null;
}

export const endSession = (token) => del(`session:${sha(token)}`);

function dataKey() {
  const k = Buffer.from((process.env.CLUTCH_DATA_KEY || '').trim(), 'base64');
  return k.length === 32 ? k : null;
}
export const hasDataKey = () => !!dataKey();

export function encrypt(obj) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', dataKey(), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') };
}

export function decrypt(box) {
  const d = createDecipheriv('aes-256-gcm', dataKey(), Buffer.from(box.iv, 'base64'));
  d.setAuthTag(Buffer.from(box.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(box.ct, 'base64')), d.final()]).toString('utf8'));
}
