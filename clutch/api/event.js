// Estadísticas anónimas (solo testers que las aceptan; la app no envía nada sin permiso).
// Se guardan recuentos por día y evento, sin enlazarlos a ningún tester: m:<día> = { evento: veces }.
// POST { events: { evento: veces } } y/o { consent: true|false } (para que el panel sepa quién las acepta).

import { cors, findTester, isActive, readBody } from './_lib/access.js';
import { hincrby, setJson, incr } from './_lib/db.js';

export const EVENTS = [
  'open', 'tab_hoy', 'tab_ella', 'tab_apuntar', 'tab_yo',
  'write_open', 'copy', 'whatsapp', 'style_apply', 'ai_rewrite',
  'sos_open', 'sos_script', 'sos_chat', 'breath',
  'capture_save', 'photo_add', 'photo_ai', 'plans_search',
  'profile_create', 'stage_change', 'gesture_done', 'backup_export', 'feedback_send'
];
const MAX_PER_EVENT = 200; // por envío
const TTL = 400 * 86400; // poco más de un año

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'metodo' });
  let tester;
  try {
    tester = await findTester(req.headers['x-clutch-code']);
  } catch {
    return res.status(503).json({ error: 'db' });
  }
  if (!isActive(tester)) return res.status(401).json({ error: 'codigo' });
  const body = readBody(req);
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (typeof body.consent === 'boolean' && !tester.owner && tester.metrics !== body.consent) {
      await setJson(`tester:${tester.code}`, { ...tester, metrics: body.consent });
    }
    const events = body.events && typeof body.events === 'object' ? body.events : {};
    const valid = Object.entries(events).filter(([k, n]) => EVENTS.includes(k) && Number.isInteger(n) && n > 0);
    if (valid.length) {
      // Freno: 60 envíos por tester y día.
      if ((await incr(`ev-rate:${tester.code}:${today}`, 2 * 86400)) > 60) return res.status(429).json({ error: 'limite' });
      for (const [k, n] of valid) await hincrby(`m:${today}`, k, Math.min(n, MAX_PER_EVENT), TTL);
    }
    return res.status(200).json({ ok: true, counted: valid.length });
  } catch {
    return res.status(503).json({ error: 'db' });
  }
}
