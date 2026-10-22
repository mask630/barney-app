// Panel del dueño (la página /admin llama aquí). Clave en la cabecera X-Admin-Key.
// GET: testers, grupos y ajustes. POST { action: 'tester' | 'groups' | 'settings', ... }: cambios.

import { isAdmin, groups, betaSettings, FEATURES, DEFAULT_SETTINGS, readBody } from './_lib/access.js';
import { getJson, setJson, setMembers, getMany, del, removeFromSet } from './_lib/db.js';

const STATUSES = ['pending', 'active', 'blocked'];

export async function listTesters() {
  const codes = await setMembers('testers');
  const all = (await getMany(codes.map((c) => `tester:${c}`))).filter(Boolean);
  return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAdmin(req)) return res.status(401).json({ error: 'clave' });
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ testers: await listTesters(), groups: await groups(), settings: await betaSettings(), features: FEATURES });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'metodo' });
    const body = readBody(req);

    if (body.action === 'tester') {
      const t = await getJson(`tester:${body.code}`);
      if (!t) return res.status(404).json({ error: 'no-existe' });
      const g = await groups();
      if (body.status !== undefined && !STATUSES.includes(body.status)) return res.status(400).json({ error: 'estado' });
      if (body.group !== undefined && !(body.group in g)) return res.status(400).json({ error: 'grupo' });
      const next = { ...t, ...(body.status !== undefined && { status: body.status }), ...(body.group !== undefined && { group: body.group }) };
      if (next.status === 'active' && t.status !== 'active' && !t.approvedAt) next.approvedAt = new Date().toISOString().slice(0, 10);
      await setJson(`tester:${t.code}`, next);
      return res.status(200).json({ tester: next });
    }

    // Borrado completo (derecho de supresión): datos, email y plaza.
    if (body.action === 'delete') {
      const t = await getJson(`tester:${body.code}`);
      if (!t) return res.status(404).json({ error: 'no-existe' });
      await del(`tester:${t.code}`, `email:${t.email}`);
      await removeFromSet('testers', t.code);
      return res.status(200).json({ deleted: t.code });
    }

    if (body.action === 'groups') {
      const g = body.groups;
      if (!g || typeof g !== 'object' || Array.isArray(g)) return res.status(400).json({ error: 'grupos' });
      const clean = {};
      for (const [name, list] of Object.entries(g)) {
        if (!/^[a-z0-9-]{2,20}$/.test(name) || !Array.isArray(list)) return res.status(400).json({ error: 'grupos' });
        clean[name] = [...new Set(list.filter((f) => FEATURES.includes(f)))];
      }
      if (!clean.base) clean.base = [];
      await setJson('groups', clean);
      return res.status(200).json({ groups: clean });
    }

    if (body.action === 'settings') {
      const cur = await betaSettings();
      const s = body.settings || {};
      const next = {
        open: typeof s.open === 'boolean' ? s.open : cur.open,
        maxTesters: Number.isInteger(s.maxTesters) && s.maxTesters >= 0 && s.maxTesters <= 10000 ? s.maxTesters : cur.maxTesters,
        aiPerDay: Number.isInteger(s.aiPerDay) && s.aiPerDay >= 0 && s.aiPerDay <= 1000 ? s.aiPerDay : cur.aiPerDay
      };
      await setJson('beta:settings', { ...DEFAULT_SETTINGS, ...next });
      return res.status(200).json({ settings: next });
    }

    return res.status(400).json({ error: 'accion' });
  } catch {
    return res.status(503).json({ error: 'db' });
  }
}
