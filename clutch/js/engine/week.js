// Resumen de la semana: cuántos detalles ha tenido y cuántos mensajes le ha mandado desde la app.
// Se guarda por día en la ficha (`log: { 'AAAA-MM-DD': { g, m } }`) y solo se conservan 14 días.

import { addDays } from '../core/dates.js';

// kind: 'g' (gesto hecho) o 'm' (mensaje copiado o enviado). delta: +1 o -1 (desmarcar un gesto).
export function logAction(profile, kind, todayISO, delta = 1) {
  const from = addDays(todayISO, -13);
  const log = Object.fromEntries(Object.entries(profile.log || {}).filter(([d]) => d >= from));
  const day = { g: 0, m: 0, ...(log[todayISO] || {}) };
  day[kind] = Math.max(0, (day[kind] || 0) + delta);
  log[todayISO] = day;
  return { ...profile, log };
}

export function weekStats(profile, todayISO) {
  const from = addDays(todayISO, -6);
  let g = 0;
  let m = 0;
  for (const [d, v] of Object.entries(profile.log || {})) {
    if (d >= from && d <= todayISO) { g += v.g || 0; m += v.m || 0; }
  }
  return { g, m };
}

export function weekLine({ g, m }) {
  const parts = [];
  if (g) parts.push(`${g} ${g === 1 ? 'detalle' : 'detalles'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'mensaje' : 'mensajes'}`);
  return parts.length ? `Esta semana: ${parts.join(' · ')}` : '';
}
