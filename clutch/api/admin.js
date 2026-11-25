// Panel del dueño (la página /admin llama aquí). Clave en la cabecera X-Admin-Key.
// GET: testers, grupos y ajustes. POST { action: 'tester' | 'groups' | 'settings', ... }: cambios.

import { isAdmin, cors, clientIp, groups, betaSettings, FEATURES, DEFAULT_SETTINGS, readBody } from './_lib/access.js';
import { getJson, setJson, setMembers, getMany, del, incr, hgetall, listAll, setList } from './_lib/db.js';
import { purgeAccount } from './_lib/account.js';
import { mailConfigured, sendMail } from './_lib/mail.js';

const STATUSES = ['pending', 'active', 'blocked'];
let _aiCache = null; // { cacheKey, at, res }

export async function listTesters() {
  const codes = await setMembers('testers');
  const all = (await getMany(codes.map((c) => `tester:${c}`))).filter(Boolean);
  return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

// Estado de la clave de IA: consulta la lista de modelos (no gasta saldo, cacheado 10 min). Caducidad: CLUTCH_KEY_EXPIRES (AAAA-MM-DD), opcional.
export async function aiKeyStatus(fetchFn = globalThis.fetch) {
  const key = (process.env.ANTHROPIC_API_KEY || '').trim();
  const expires = /^\d{4}-\d{2}-\d{2}$/.test(process.env.CLUTCH_KEY_EXPIRES || '') ? process.env.CLUTCH_KEY_EXPIRES : null;
  if (!key) return { ok: false, reason: 'sin-clave', expires };
  const cacheKey = `${key}|${expires || ''}`;
  if (fetchFn === globalThis.fetch && _aiCache && _aiCache.cacheKey === cacheKey && Date.now() - _aiCache.at < 600_000) return _aiCache.res;
  let out;
  try {
    const r = await fetchFn('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, signal: AbortSignal.timeout(5000) });
    out = { ok: r.ok, reason: r.ok ? null : r.status === 401 || r.status === 403 ? 'clave' : 'servicio', expires };
  } catch {
    out = { ok: false, reason: 'red', expires };
  }
  if (fetchFn === globalThis.fetch) _aiCache = { cacheKey, at: Date.now(), res: out };
  return out;
}

const dayISO = (d) => d.toISOString().slice(0, 10);
const addDays = (iso, n) => dayISO(new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5));

// Actividad de los últimos `days` días, uso por función y retención (sigue usando la app N días después de entrar).
export async function stats(testers, today = dayISO(new Date()), days = 14) {
  const dates = Array.from({ length: days }, (_, i) => addDays(today, -(days - 1 - i)));
  const daily = [];
  for (const d of dates) daily.push({ date: d, active: (await setMembers(`seen:${d}`)).length, events: await hgetall(`m:${d}`) });
  const totals7 = {};
  for (const day of daily.slice(-7)) for (const [k, n] of Object.entries(day.events)) totals7[k] = (totals7[k] || 0) + n;
  const retention = {};
  for (const n of [1, 7, 30]) {
    const eligible = testers.filter((t) => t.status !== 'pending' && (t.approvedAt || t.createdAt) && addDays(t.approvedAt || t.createdAt, n) <= today);
    const kept = eligible.filter((t) => t.lastSeen && t.lastSeen >= addDays(t.approvedAt || t.createdAt, n));
    retention[`d${n}`] = { eligible: eligible.length, kept: kept.length };
  }
  return { daily, totals7, retention, metricsOn: testers.filter((t) => t.metrics).length };
}

export default async function handler(req, res) {
  cors(req, res, 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!isAdmin(req)) {
    const n = await incr(`admin-fail:${clientIp(req)}`, 3600).catch(() => 1);
    return res.status(n > 10 ? 429 : 401).json({ error: n > 10 ? 'limite' : 'clave' });
  }
  try {
    if (req.method === 'GET') {
      const testers = await listTesters();
      return res.status(200).json({
        testers, groups: await groups(), settings: await betaSettings(), features: FEATURES,
        stats: await stats(testers), feedback: await listAll('feedback'), errors: await listAll('errors'), aiKey: await aiKeyStatus()
      });
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
      if (t.status === 'pending' && next.status === 'active' && t.email && mailConfigured()) {
        sendMail({ to: t.email, subject: 'Ya tienes acceso a Clutch', text: `Hola,\n\nTu acceso a Clutch ya está activo (${next.group}). Abre la app y entra con tu correo.\n\nClutch` }).catch(() => {});
      }
      return res.status(200).json({ tester: next });
    }

    // Borrado completo (derecho de supresión): datos, email, avisos y plaza.
    if (body.action === 'delete') {
      const t = await getJson(`tester:${body.code}`);
      if (!t) return res.status(404).json({ error: 'no-existe' });
      await purgeAccount(t.code, t.email);
      return res.status(200).json({ deleted: t.code });
    }

    // Opiniones y errores: marcar como leído o borrar uno; vaciar todos los errores.
    if (body.action === 'feedback' || body.action === 'errors') {
      const key = body.action;
      let list = await listAll(key);
      if (body.op === 'read') list = list.map((x) => (x.id === body.id ? { ...x, read: true } : x));
      else if (body.op === 'delete') list = list.filter((x) => x.id !== body.id);
      else if (body.op === 'clear') list = [];
      else return res.status(400).json({ error: 'accion' });
      await setList(key, list);
      return res.status(200).json({ [key]: list });
    }

    // Empezar de cero (p. ej. antes de lanzar): borra recuentos y días de uso de los últimos 120 días.
    if (body.action === 'reset-stats') {
      const today = dayISO(new Date());
      const keys = Array.from({ length: 120 }, (_, i) => addDays(today, -i)).flatMap((d) => [`m:${d}`, `seen:${d}`]);
      for (let i = 0; i < keys.length; i += 60) await del(...keys.slice(i, i + 60));
      return res.status(200).json({ ok: true });
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
