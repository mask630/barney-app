// Entrar o crear cuenta: con email + código de 6 cifras, o con Google. Devuelve una sesión y el código de tester.
// GET  → { email: bool, google: clientId|null } (qué formas de entrar están listas)
// POST { action: 'start', email }                          → envía el código
// POST { action: 'verify', email, code, terms, metrics }   → { token, code, status, email }
// POST { action: 'google', credential, terms, metrics }    → { token, code, status, email }
// POST { action: 'logout' } (con Authorization)            → cierra esa sesión
// Variables: GMAIL_APP_PASSWORD (correo), GOOGLE_CLIENT_ID (botón de Google).

import { randomInt, timingSafeEqual } from 'node:crypto';
import { cors, readBody } from './_lib/access.js';
import { hasDb, getJson, setJsonEx, incr, del } from './_lib/db.js';
import { mailConfigured, sendMail } from './_lib/mail.js';
import { EMAIL, normEmail, sha, accountFor, newSession, sessionFrom, endSession } from './_lib/account.js';

const CODE_MIN = 10;
// Envío del correo: se puede cambiar en las pruebas.
let mailer = sendMail;
export const _setMailer = (fn) => { mailer = fn || sendMail; };
const MAX_TRIES = 5;
const googleId = () => (process.env.GOOGLE_CLIENT_ID || '').trim();
const ipOf = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';

export const mailText = (code) => `Tu código para entrar en Clutch es: ${code}\n\nCaduca en ${CODE_MIN} minutos. Si no lo has pedido tú, ignora este correo.\n\nClutch`;

async function login(res, email, body) {
  const acc = await accountFor(email, { terms: body.terms === true, metrics: body.metrics === true });
  if (!acc.ok) return res.status(400).json({ error: acc.reason });
  const token = await newSession(acc.tester);
  return res.status(200).json({ token, code: acc.tester.code, status: acc.tester.status, email, created: acc.created });
}

// Comprueba el token de Google con Google (sin librerías): firma, caducidad, que es para nuestra app y email verificado.
export async function verifyGoogle(credential, fetchFn = globalThis.fetch) {
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(credential || ''))) return null;
  const r = await fetchFn(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!r.ok) return null;
  const t = await r.json();
  const okIss = ['accounts.google.com', 'https://accounts.google.com'].includes(t.iss);
  if (!okIss || t.aud !== googleId() || String(t.email_verified) !== 'true' || !EMAIL.test(t.email || '')) return null;
  return normEmail(t.email);
}

export default async function handler(req, res) {
  cors(req, res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ email: mailConfigured(), google: googleId() || null });
  if (req.method !== 'POST') return res.status(405).json({ error: 'metodo' });
  if (process.env.VERCEL && !hasDb()) return res.status(503).json({ error: 'sin-db' });
  const body = readBody(req);

  try {
    if (body.action === 'logout') {
      const s = await sessionFrom(req);
      if (s) await endSession(s.token);
      return res.status(200).json({ ok: true });
    }
    // Freno a abusos: 20 intentos por hora desde la misma IP.
    if ((await incr(`auth-ip:${ipOf(req)}`, 3600)) > 20) return res.status(429).json({ error: 'limite' });

    if (body.action === 'start') {
      const email = normEmail(body.email);
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'email' });
      if (!mailConfigured()) return res.status(503).json({ error: 'sin-correo' });
      if ((await incr(`auth-mail:${sha(email)}`, 3600)) > 5) return res.status(429).json({ error: 'limite' });
      const code = String(randomInt(0, 1e6)).padStart(6, '0');
      await setJsonEx(`otp:${sha(email)}`, { h: sha(`${email}:${code}`), tries: 0 }, CODE_MIN * 60);
      try {
        await mailer({ to: email, subject: `Tu código de Clutch: ${code}`, text: mailText(code) });
      } catch (e) {
        console.error('correo', e.message);
        return res.status(502).json({ error: 'correo' });
      }
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'verify') {
      const email = normEmail(body.email);
      const code = String(body.code || '').replace(/\D/g, '');
      const key = `otp:${sha(email)}`;
      const otp = await getJson(key);
      if (!otp) return res.status(400).json({ error: 'caducado' });
      const good = code.length === 6 && timingSafeEqual(Buffer.from(otp.h), Buffer.from(sha(`${email}:${code}`)));
      if (!good) {
        if (otp.tries + 1 >= MAX_TRIES) await del(key);
        else await setJsonEx(key, { ...otp, tries: otp.tries + 1 }, CODE_MIN * 60);
        return res.status(400).json({ error: otp.tries + 1 >= MAX_TRIES ? 'caducado' : 'codigo' });
      }
      await del(key);
      return login(res, email, body);
    }

    if (body.action === 'google') {
      if (!googleId()) return res.status(503).json({ error: 'sin-google' });
      const email = await verifyGoogle(body.credential);
      if (!email) return res.status(401).json({ error: 'google' });
      return login(res, email, body);
    }
    return res.status(400).json({ error: 'accion' });
  } catch (e) {
    console.error('auth', e.message);
    return res.status(503).json({ error: 'db' });
  }
}
