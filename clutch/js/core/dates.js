// Utilidades de fechas. Todo el motor trabaja con cadenas ISO "AAAA-MM-DD"
// y fija las fechas a las 12:00 UTC para evitar saltos por cambios de hora.

export const DAY = 86400000;

export function parseISO(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d, 12));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

export function toISO(dt) {
  return dt.toISOString().slice(0, 10);
}

// Fecha de hoy en la zona horaria del dispositivo.
export function localISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso, n) {
  return toISO(new Date(parseISO(iso).getTime() + n * DAY));
}

export function daysBetween(fromISO, toISOstr) {
  return Math.round((parseISO(toISOstr) - parseISO(fromISO)) / DAY);
}

export function sameMonthDay(aISO, bISO) {
  return aISO.slice(5) === bISO.slice(5);
}
