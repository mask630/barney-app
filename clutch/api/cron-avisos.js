// Aviso diario (lo lanza Vercel cada mañana, ver vercel.json): a cada cuenta con avisos activados y algo pendiente hoy
// (pensar o comprar un regalo, un cumpleaños, un aniversario…) le llega «Agenda: tienes algo pendiente hoy».
// Se calcula con los mismos avisos de la pantalla Hoy; lo marcado como «Hecho» ya no avisa. Una vez al día como mucho.
// Protegido con CRON_SECRET (Vercel lo manda solo en sus llamadas programadas).

import { getJson, setJson, setJsonEx, setMembers, removeFromSet } from './_lib/db.js';
import { hasDataKey, decrypt } from './_lib/account.js';
import { pushConfigured, sendPush } from './_lib/push.js';
import { reminders, agenda } from '../js/engine/agenda.js';

const TODAY_KINDS = ['birthday', 'anniversary', 'milestone', 'event'];

export function todayIn(tz, now = new Date()) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Europe/Madrid' }).format(now); } catch { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(now); }
}

// Cuántas cosas tiene pendientes hoy esa cuenta.
export function pendingToday(state, now = new Date()) {
  const today = todayIn(state.settings?.city?.tz, now);
  const country = state.settings?.country || null;
  let n = 0;
  for (const p of state.profiles || []) {
    try {
      n += reminders(p, today, { country }).length;
      n += agenda(p, today, { country, horizon: 0 }).filter((d) => TODAY_KINDS.includes(d.kind)).length;
    } catch { /* una ficha rara no para el resto */ }
  }
  return { today, n };
}

export default async function handler(req, res, { now = new Date(), send = sendPush } = {}) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'no' });
  if (!pushConfigured() || !hasDataKey()) return res.status(200).json({ skipped: 'sin-configurar' });
  let sent = 0, users = 0;
  for (const code of await setMembers('push-users')) {
    const subs = (await getJson(`push:${code}`)) || [];
    const box = await getJson(`data:${code}`);
    if (!subs.length || !box) continue;
    users++;
    const { today, n } = pendingToday(decrypt(box.data), now);
    if (!n || (await getJson(`pushed:${code}`)) === today) continue;
    const alive = [];
    for (const sub of subs) {
      const r = await send(sub);
      if (r !== 'gone') alive.push(sub);
      if (r === 'ok') sent++;
    }
    if (alive.length !== subs.length) {
      await setJson(`push:${code}`, alive);
      if (!alive.length) await removeFromSet('push-users', code);
    }
    await setJsonEx(`pushed:${code}`, today, 2 * 86400);
  }
  return res.status(200).json({ users, sent });
}
