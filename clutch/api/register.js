// Alta en la beta: alias + email + aceptar condiciones. Queda pendiente hasta que el dueño la aprueba en /admin.
// Devuelve el código personal; la app lo guarda sola.

import { randomBytes } from 'node:crypto';
import { cors, betaSettings, readBody } from './_lib/access.js';
import { hasDb, getJson, setJson, incr, addToSet, setMembers } from './_lib/db.js';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

// Código fácil de dictar: 12 letras/números en minúscula, sin confusiones (0/o, 1/l).
export function newCode() {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(randomBytes(12), (b) => abc[b % abc.length]).join('');
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'metodo' });
  if (process.env.VERCEL && !hasDb()) return res.status(503).json({ error: 'sin-db' });

  const body = readBody(req);
  const alias = String(body.alias || '').trim().replace(/\s+/g, ' ');
  const email = String(body.email || '').trim().toLowerCase();
  if (alias.length < 2 || alias.length > 24) return res.status(400).json({ error: 'alias' });
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'email' });
  if (body.terms !== true) return res.status(400).json({ error: 'condiciones' });

  try {
    // Freno a abusos: 5 altas por hora desde la misma IP.
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
    if ((await incr(`reg-ip:${ip}`, 3600)) > 5) return res.status(429).json({ error: 'limite' });

    const settings = await betaSettings();
    if (!settings.open) return res.status(403).json({ error: 'cerrado' });
    if (await getJson(`email:${email}`)) return res.status(409).json({ error: 'ya-registrado' });
    if ((await setMembers('testers')).length >= settings.maxTesters) return res.status(403).json({ error: 'completo' });

    const code = newCode();
    const today = new Date().toISOString().slice(0, 10);
    const tester = { code, alias, email, group: 'base', status: 'pending', metrics: body.metrics === true, createdAt: today, lastSeen: today };
    await setJson(`tester:${code}`, tester);
    await setJson(`email:${email}`, code);
    await addToSet('testers', code);
    return res.status(200).json({ code, status: 'pending' });
  } catch {
    return res.status(503).json({ error: 'db' });
  }
}
