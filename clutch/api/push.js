// Activar o quitar los avisos en un móvil. Solo con cuenta (el aviso se calcula con los datos de la cuenta).
// POST   { subscription }  → guarda la suscripción de este móvil (hasta 5 móviles por cuenta)
// DELETE { endpoint }      → la quita
// Siempre con Authorization: Bearer <sesión>.

import { cors, readBody } from './_lib/access.js';
import { getJson, setJson, addToSet, removeFromSet } from './_lib/db.js';
import { sessionFrom } from './_lib/account.js';
import { pushConfigured, validSubscription } from './_lib/push.js';

export default async function handler(req, res) {
  cors(req, res, 'POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!pushConfigured()) return res.status(503).json({ error: 'sin-avisos' });
  try {
    const s = await sessionFrom(req);
    if (!s) return res.status(401).json({ error: 'sesion' });
    const body = readBody(req);
    const key = `push:${s.code}`;
    const list = (await getJson(key)) || [];
    if (req.method === 'POST') {
      const sub = body.subscription;
      if (!validSubscription(sub)) return res.status(400).json({ error: 'suscripcion' });
      const next = [...list.filter((x) => x.endpoint !== sub.endpoint), { endpoint: sub.endpoint }].slice(-5);
      await setJson(key, next);
      await addToSet('push-users', s.code);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      const next = list.filter((x) => x.endpoint !== body.endpoint);
      await setJson(key, next);
      if (!next.length) await removeFromSet('push-users', s.code);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'metodo' });
  } catch {
    return res.status(503).json({ error: 'db' });
  }
}
