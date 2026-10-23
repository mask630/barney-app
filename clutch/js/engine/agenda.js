// Agenda de la propia app (sustituye a exportar al calendario del móvil): todas sus fechas del año
// y los avisos con lo que toca hacer antes de cada una (pensar el regalo, comprarlo, preparar el plan).
// Los avisos marcados como hechos se guardan en la ficha (`agendaDone: { id: 'AAAA-MM-DD' }`), solo en el móvil.

import { upcoming, nextPeriods } from './content.js';
import { addDays, daysBetween, parseISO } from '../core/dates.js';
import { STAGES_WITH_MILESTONES } from '../core/stages.js';

const MILESTONES = [100, 200, 300, 500, 1000, 1500, 2000, 2500, 3000, 5000];
const GIFT_KINDS = ['birthday', 'anniversary'];

export const when = (n) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);

// Todas las fechas en el horizonte, ordenadas: { key, iso, daysAhead, label, kind }.
export function agenda(profile, todayISO, { country = null, horizon = 366 } = {}) {
  const out = upcoming(profile, todayISO, horizon, country);
  if (profile.since && parseISO(profile.since) && STAGES_WITH_MILESTONES.includes(profile.stage)) {
    const elapsed = daysBetween(profile.since, todayISO);
    for (const n of MILESTONES) {
      const ahead = n - elapsed;
      if (ahead >= 0 && ahead <= horizon) out.push({ key: `milestone-${n}`, iso: addDays(profile.since, n), daysAhead: ahead, label: `${n} días juntos`, kind: 'milestone' });
    }
  }
  for (const iso of nextPeriods(profile, todayISO)) {
    const ahead = daysBetween(todayISO, iso);
    if (ahead >= 0 && ahead <= horizon) out.push({ key: `period-${iso}`, iso, daysAhead: ahead, label: 'Le puede venir la regla (aprox.)', kind: 'period' });
  }
  return out.sort((a, b) => a.daysAhead - b.daysAhead);
}

// Ideas de regalo con lo que ya sabes de ella; nada inventado.
export function giftIdeas(profile) {
  const gifts = (profile.gifts || []).slice(-3).reverse().map((g) => g.text);
  if (gifts.length) return gifts;
  return (profile.tastes || []).slice(0, 3).map((t) => `algo de ${t}`);
}

// Lo que toca hacer hoy por cada fecha cercana. Solo sale el paso de la ventana actual.
export function reminders(profile, todayISO, opts = {}) {
  const done = profile.agendaDone || {};
  const ideas = giftIdeas(profile);
  const out = [];
  for (const d of agenda(profile, todayISO, { ...opts, horizon: 30 })) {
    const n = d.daysAhead;
    let step = null;
    if (GIFT_KINDS.includes(d.kind)) {
      if (n > 14) step = { k: 'pensar', title: 'Piensa qué regalarle', ideas };
      else if (n > 3) step = { k: 'comprar', title: 'Compra el regalo', ideas };
      else if (n > 0) step = { k: 'preparar', title: 'Prepara el plan y escribe la tarjeta' };
      // El mismo día ya sale en «La jugada de hoy» con el mensaje listo.
    } else if (d.kind === 'period' && n <= 2) step = { k: 'aviso', title: 'Ten chocolate a mano' };
    else if (d.kind === 'mothers' && n <= 3) step = { k: 'aviso', title: 'Felicita a tu madre y a la suya' };
    else if (d.kind === 'milestone' && n <= 3 && n > 0) step = { k: 'aviso', title: 'Prepara un detalle' };
    else if (d.kind === 'event' && n <= 2) step = { k: 'aviso', title: n ? 'Pregúntale o deséale suerte' : 'Escríbele hoy por esto' };
    if (!step) continue;
    const id = `${d.key}:${d.iso.slice(0, 4)}:${step.k}`;
    if (done[id]) continue;
    out.push({ id, title: step.title, label: d.label, daysAhead: n, kind: d.kind, ideas: step.ideas || null });
  }
  return out;
}

export function markDone(profile, id, todayISO) {
  return { ...profile, agendaDone: { ...(profile.agendaDone || {}), [id]: todayISO } };
}
