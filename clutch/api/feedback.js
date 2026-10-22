// Opiniones y avisos de error que llegan al panel.
// POST { kind: 'opinion' | 'error', text, screen, version }. Con código de tester activo va con su alias; sin código, anónimo.

import { cors, findTester, isActive, readBody } from './_lib/access.js';
import { pushCapped, incr } from './_lib/db.js';

const KINDS = ['opinion', 'error'];
const clip = (s, n) => String(s || '').replace(/\s+\n/g, '\n').trim().slice(0, n);

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'metodo' });
  const body = readBody(req);
  const kind = KINDS.includes(body.kind) ? body.kind : 'opinion';
  const text = clip(body.text, kind === 'error' ? 1500 : 2000);
  if (text.length < 3) return res.status(400).json({ error: 'vacio' });
  try {
    const tester = await findTester(req.headers['x-clutch-code']);
    if (tester?.status === 'blocked') return res.status(401).json({ error: 'codigo' });
    const who = isActive(tester) || tester?.status === 'pending' ? tester : null;
    // Freno: 20 por hora por tester (o por IP si no hay código).
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
    if ((await incr(`fb-rate:${who?.code || ip}`, 3600)) > 20) return res.status(429).json({ error: 'limite' });
    const item = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      kind, text,
      screen: clip(body.screen, 40),
      version: clip(body.version, 40),
      alias: who ? who.alias : null,
      code: who && !who.owner ? who.code : null,
      read: false
    };
    await pushCapped(kind === 'error' ? 'errors' : 'feedback', item, kind === 'error' ? 300 : 1000);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).json({ error: 'db' });
  }
}
