// Datos de la cuenta, cifrados en el servidor: las fichas de cada usuario, para tenerlas en cualquier móvil.
// GET              → { state, rev }  (state null si aún no hay nada)
// PUT { state, baseRev } → { rev }   · 409 { state, rev } si otro móvil guardó antes: la app mezcla y vuelve a enviar
// DELETE           → borra la cuenta entera (datos, tester y email). Las sesiones de otros móviles dejan de valer.
// Siempre con Authorization: Bearer <sesión>.

import { cors, readBody } from './_lib/access.js';
import { getJson, setJson, del, removeFromSet } from './_lib/db.js';
import { sessionFrom, hasDataKey, encrypt, decrypt, endSession } from './_lib/account.js';

export const MAX_STATE = 900_000; // caracteres del JSON (las fotos no se suben)

export default async function handler(req, res) {
  cors(req, res, 'GET, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!hasDataKey()) return res.status(503).json({ error: 'sin-clave' });
  let s;
  try {
    s = await sessionFrom(req);
  } catch {
    return res.status(503).json({ error: 'db' });
  }
  if (!s) return res.status(401).json({ error: 'sesion' });
  const key = `data:${s.code}`;

  try {
    if (req.method === 'GET') {
      const box = await getJson(key);
      return res.status(200).json(box ? { state: decrypt(box.data), rev: box.rev } : { state: null, rev: 0 });
    }
    if (req.method === 'PUT') {
      const body = readBody(req);
      if (!body.state || typeof body.state !== 'object' || !Array.isArray(body.state.profiles)) return res.status(400).json({ error: 'datos' });
      if (JSON.stringify(body.state).length > MAX_STATE) return res.status(413).json({ error: 'grande' });
      const box = await getJson(key);
      const rev = box?.rev || 0;
      if (Number(body.baseRev) !== rev) return res.status(409).json({ state: decrypt(box.data), rev });
      await setJson(key, { rev: rev + 1, at: new Date().toISOString(), data: encrypt(body.state) });
      return res.status(200).json({ rev: rev + 1 });
    }
    if (req.method === 'DELETE') {
      await del(key, `tester:${s.code}`, `email:${s.tester.email}`);
      await removeFromSet('testers', s.code);
      await endSession(s.token);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'metodo' });
  } catch (e) {
    console.error('data', e.message);
    return res.status(503).json({ error: 'db' });
  }
}
