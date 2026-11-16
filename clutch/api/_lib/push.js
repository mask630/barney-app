// Avisos push (Web Push) sin dependencias: firma VAPID (ES256) y envío SIN contenido.
// El móvil muestra siempre el mismo texto discreto (lo pone sw.js), así no viaja ningún dato por los servidores de avisos.
// Variables: VAPID_PUBLIC (clave pública, base64url, 65 bytes) y VAPID_PRIVATE (clave privada PKCS8 en PEM, en base64).

import { createPrivateKey, sign } from 'node:crypto';

const pub = () => (process.env.VAPID_PUBLIC || '').trim();
const priv = () => (process.env.VAPID_PRIVATE || '').trim();
export const pushConfigured = () => !!(pub() && priv());
export const vapidPublic = () => pub() || null;

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// JWT ES256 para el servicio de avisos de ese móvil (Google, Apple, Mozilla…).
export function vapidAuth(endpoint, now = Math.floor(Date.now() / 1000)) {
  const aud = new URL(endpoint).origin;
  const head = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64url(JSON.stringify({ aud, exp: now + 12 * 3600, sub: 'mailto:clutch.app.2026@gmail.com' }));
  const key = createPrivateKey(Buffer.from(priv(), 'base64').toString('utf8'));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${body}.${b64url(sig)}, k=${pub()}`;
}

export const validSubscription = (s) => !!s && typeof s.endpoint === 'string' && /^https:\/\/[^\s]+$/.test(s.endpoint) && s.endpoint.length < 1000;

// Devuelve 'ok', 'gone' (la suscripción ya no existe: hay que borrarla) o 'error'.
export async function sendPush(sub, fetchFn = globalThis.fetch) {
  try {
    const r = await fetchFn(sub.endpoint, { method: 'POST', headers: { TTL: '43200', Urgency: 'normal', Authorization: vapidAuth(sub.endpoint), 'Content-Length': '0' } });
    if (r.status === 404 || r.status === 410) return 'gone';
    return r.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}
