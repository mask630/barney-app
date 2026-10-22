// Fechas importantes al calendario del móvil (.ics). Mientras no haya notificaciones push, es el móvil quien avisa:
// el día antes y el mismo día a las 9:00. Con títulos discretos no aparece ningún nombre («Agenda · evento»).

import { STAGES_WITH_MILESTONES } from '../core/stages.js';
import { addDays, daysBetween, parseISO } from '../core/dates.js';

const MILESTONES = [100, 200, 300, 500, 1000, 1500, 2000, 2500, 3000, 5000];

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const ymd = (iso) => iso.replaceAll('-', '');
const pad = (n) => String(n).padStart(2, '0');

function vevent({ uid, date, title, yearly, stamp }) {
  const next = ymd(addDays(date, 1));
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@clutch`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(date)}`,
    `DTEND;VALUE=DATE:${next}`,
    ...(yearly ? ['RRULE:FREQ=YEARLY'] : []),
    `SUMMARY:${esc(title)}`,
    'TRANSP:TRANSPARENT',
    // 9:00 del día anterior y 9:00 del mismo día (el evento empieza a las 0:00)
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'TRIGGER:-PT15H', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'TRIGGER:PT9H', 'END:VALARM',
    'END:VEVENT'
  ];
}

// Lista de fechas por perfil: { key, date, label, yearly }. date = primera aparición (ISO).
export function importantDates(profile, todayISO) {
  const out = [];
  const year = +todayISO.slice(0, 4);
  if (profile.birth && parseISO(profile.birth)) {
    const md = profile.birth.slice(5);
    const first = parseISO(`${year}-${md}`) ? `${year}-${md}` : `${year}-03-01`; // 29-feb fuera de bisiesto
    out.push({ key: 'birthday', date: first, label: `Cumpleaños de ${profile.name}`, yearly: true });
  }
  if (STAGES_WITH_MILESTONES.includes(profile.stage) && profile.since && parseISO(profile.since)) {
    const anniv = `${+profile.since.slice(0, 4) + 1}${profile.since.slice(4)}`;
    if (parseISO(anniv)) out.push({ key: 'anniversary', date: anniv, label: `Aniversario con ${profile.name}`, yearly: true });
    const elapsed = daysBetween(profile.since, todayISO);
    for (const n of MILESTONES) {
      if (n >= elapsed && n - elapsed <= 400) out.push({ key: `milestone-${n}`, date: addDays(profile.since, n), label: `${profile.name} · ${n} días`, yearly: false });
    }
  }
  for (const e of profile.events || []) {
    if (!e.month || !e.day) continue;
    const y = e.yearly || !e.year ? year : e.year;
    const iso = `${y}-${pad(e.month)}-${pad(e.day)}`;
    if (!parseISO(iso) || (!e.yearly && e.year && iso < todayISO)) continue;
    out.push({ key: `event-${e.id}`, date: iso, label: `${profile.name} · ${e.text}`, yearly: !!e.yearly || !e.year });
  }
  return out;
}

export function buildICS(profiles, todayISO, { discreet = true, now = new Date() } = {}) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Clutch//Agenda//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  let count = 0;
  for (const p of profiles) {
    for (const d of importantDates(p, todayISO)) {
      lines.push(...vevent({ uid: `${p.id}-${d.key}`, date: d.date, title: discreet ? 'Agenda · evento' : d.label, yearly: d.yearly, stamp }));
      count++;
    }
  }
  lines.push('END:VCALENDAR');
  return { text: lines.join('\r\n') + '\r\n', count };
}
