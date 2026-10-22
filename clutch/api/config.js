// Estado del tester que llama y funciones abiertas. Sin código válido: ninguna función extra (la app funciona igual, en modo base).

import { cors, findTester, featuresFor, touchSeen } from './_lib/access.js';

export default async function handler(req, res) {
  cors(req, res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'metodo' });
  res.setHeader('Cache-Control', 'no-store');
  let tester;
  try {
    tester = await findTester(req.headers['x-clutch-code']);
  } catch {
    return res.status(503).json({ error: 'db' });
  }
  if (!tester) return res.status(200).json({ status: 'anon', group: null, features: [] });
  await touchSeen(tester);
  // A un bloqueado no se le dice el grupo; a uno pendiente, tampoco (aún no tiene).
  if (tester.status !== 'active') return res.status(200).json({ status: tester.status, group: null, features: [] });
  return res.status(200).json({ status: 'active', group: tester.group, features: await featuresFor(tester) });
}
