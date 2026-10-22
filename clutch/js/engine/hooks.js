// Motor de ganchos: solo devuelve datos REALES y verificables, y solo con los datos disponibles.
// Cada gancho: { id, kind, priority, usedData[], source, daysAhead, reminder, message }.

import { parseISO, daysBetween, addDays } from '../core/dates.js';
import { checkAdult, STAGES_WITH_MILESTONES, isValidStage } from '../core/stages.js';
import { moonSign, moonPhase, sunSignFromBirth, sunTimes, seasonStartingOn, moonLongitude, signName } from '../core/astro.js';
import { worldDaysOn } from '../data/worldDays.js';
import { compose, groupOf } from './voice.js';

const MILESTONE_DAYS = [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000];
const SINCE_LABEL = {
  citas: 'de nuestra primera cita',
  pareja: 'desde que estamos juntos',
  matrimonio: 'desde que nos casamos'
};

const SRC_USER = 'Fecha que tú registraste';
const SRC_ASTRO = 'Cálculo astronómico propio (efemérides de Meeus)';

function fmtTime(date, tz) {
  return new Intl.DateTimeFormat('es', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

// Minúsculas y sin tildes, para que "Café" y "cafe" coincidan.
function norm(s) {
  return String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// La Luna se mueve ~13° al día: solo afirmamos "hoy está en X" si el signo no cambia en todo el día.
function stableMoonSign(todayISO) {
  const noon = parseISO(todayISO).getTime();
  const a = signName(moonLongitude(new Date(noon - 14 * 3600e3)));
  const b = signName(moonLongitude(new Date(noon + 14 * 3600e3)));
  return a === b ? a : null;
}

function nextMilestone(sinceISO, todayISO) {
  const elapsed = daysBetween(sinceISO, todayISO);
  if (elapsed < 0) return null;
  for (const n of MILESTONE_DAYS) {
    const ahead = n - elapsed;
    if (ahead >= 0 && ahead <= 7) return { n, daysAhead: ahead };
  }
  return null;
}

function nextAnniversary(sinceISO, todayISO) {
  const since = parseISO(sinceISO);
  const today = parseISO(todayISO);
  for (const y of [today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
    const iso = `${y}-${sinceISO.slice(5)}`;
    const d = parseISO(iso); // 29-feb en año no bisiesto => null: se omite ese año
    if (!d) continue;
    const years = y - since.getUTCFullYear();
    const ahead = daysBetween(todayISO, iso);
    if (years >= 1 && ahead >= 0 && ahead <= 14) return { years, daysAhead: ahead };
  }
  return null;
}

function nextBirthday(birthISO, todayISO) {
  const today = parseISO(todayISO);
  for (const y of [today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
    const iso = `${y}-${birthISO.slice(5)}`;
    if (!parseISO(iso)) continue;
    const ahead = daysBetween(todayISO, iso);
    if (ahead >= 0 && ahead <= 14) return { daysAhead: ahead };
  }
  return null;
}

/**
 * profile: { name, birth, stage, since?, tastes?: string[], location?: {lat,lon,tz,city} }
 * Devuelve { ok:false, reason } o { ok:true, band, group, hooks, unlocks }.
 */
export function generateHooks(profile, todayISO) {
  if (!profile || !isValidStage(profile.stage)) return { ok: false, reason: 'etapa-invalida' };
  const adult = checkAdult(profile.birth, todayISO);
  if (!adult.ok) return { ok: false, reason: adult.reason };

  const { band } = adult;
  const group = groupOf(profile.stage);
  const tastes = (profile.tastes || []).map(norm).filter(Boolean);
  const loc = profile.location && Number.isFinite(profile.location.lat) && Number.isFinite(profile.location.lon) ? profile.location : null;
  const hooks = [];
  const unlocks = [];

  const add = (h, texts) => {
    const reminderOnly = typeof texts === 'object' && Object.keys(texts).length === 0;
    if (reminderOnly) {
      hooks.push({ daysAhead: 0, reminder: null, ...h, message: null });
      return;
    }
    const text = typeof texts === 'string' ? texts : texts[group];
    if (!text) return;
    const message = compose({ text, name: profile.name, band, group });
    if (message) hooks.push({ daysAhead: 0, reminder: null, ...h, message });
  };

  // 1. Cumpleaños de ella
  const bd = nextBirthday(profile.birth, todayISO);
  if (bd) {
    add(
      {
        id: 'birthday', kind: 'birthday', priority: bd.daysAhead === 0 ? 100 : 80, usedData: ['birth'], source: { label: SRC_USER },
        daysAhead: bd.daysAhead,
        reminder: bd.daysAhead === 0 ? 'Hoy es su cumpleaños' : `Su cumpleaños es en ${bd.daysAhead} días`
      },
      bd.daysAhead === 0
        ? {
            amiga: 'feliz cumpleaños. Que sea un día de los buenos.',
            flirt: 'feliz cumpleaños. Hoy tienes permiso para que te mimen.',
            pareja: 'feliz cumpleaños, mi vida. Hoy el plan eres tú.'
          }
        : {}
    );
  }

  // 2. Hitos y aniversario (solo citas / pareja / matrimonio con fecha de inicio)
  if (STAGES_WITH_MILESTONES.includes(profile.stage)) {
    if (profile.since && parseISO(profile.since)) {
      const label = SINCE_LABEL[profile.stage];
      const ms = nextMilestone(profile.since, todayISO);
      if (ms) {
        const phrase = profile.stage === 'citas' ? `hoy hace ${ms.n} días ${label}.` : `hoy se cumplen ${ms.n} días ${label}.`;
        const tail = profile.stage === 'matrimonio' ? ' Gracias por cada uno.' : profile.stage === 'pareja' ? ' Cada uno ha valido la pena.' : ' Y me acuerdo bien.';
        add(
          {
            id: `milestone-${ms.n}`, kind: 'milestone', priority: ms.daysAhead === 0 ? 95 : 70, usedData: ['since'], source: { label: SRC_USER },
            daysAhead: ms.daysAhead,
            reminder: ms.daysAhead === 0 ? `Hoy: ${ms.n} días` : `${ms.n} días en ${ms.daysAhead} días`
          },
          ms.daysAhead === 0 ? { flirt: phrase + tail, pareja: phrase + tail } : {}
        );
      }
      const an = nextAnniversary(profile.since, todayISO);
      if (an) {
        const yrs = an.years === 1 ? 'un año' : `${an.years} años`;
        add(
          {
            id: 'anniversary', kind: 'anniversary', priority: an.daysAhead === 0 ? 98 : 85, usedData: ['since'], source: { label: SRC_USER },
            daysAhead: an.daysAhead,
            reminder: an.daysAhead === 0 ? 'Hoy es vuestro aniversario' : `Aniversario en ${an.daysAhead} días`
          },
          an.daysAhead === 0
            ? {
                flirt: `hoy hace ${yrs} ${SINCE_LABEL.citas}. No se me ha olvidado.`,
                pareja: `hoy hace ${yrs} ${profile.stage === 'matrimonio' ? 'que nos casamos' : 'que empezamos'}. Gracias por quedarte.`
              }
            : {}
        );
      }
    } else {
      unlocks.push({ id: 'since', need: 'since', text: 'Añade la fecha de inicio para desbloquear hitos (100 días…) y aniversarios.' });
    }
  }

  // 3. Días mundiales verificados (por país; los que suponen un gusto solo salen si ella lo tiene)
  for (const wd of worldDaysOn(todayISO, profile.country || null)) {
    const match = wd.tags.some((t) => tastes.includes(norm(t)));
    if (wd.needsTaste && !match) continue;
    add(
      {
        id: `world-${wd.id}`, kind: 'worldday', priority: match ? 75 : 40,
        usedData: match ? ['tastes'] : [],
        source: { label: wd.name.es, urls: wd.sources, verifiedAt: wd.verifiedAt }
      },
      wd.ideas
    );
  }
  if (!tastes.length) unlocks.push({ id: 'tastes', need: 'tastes', text: 'Añade sus gustos para que los días especiales sean los que a ella le tocan.' });

  // 4. Astro: Luna en su signo (según los astros)
  const her = sunSignFromBirth(profile.birth);
  const sign = stableMoonSign(todayISO);
  if (her && !her.cusp && sign && sign === her.sign) {
    add(
      { id: 'moon-in-sign', kind: 'astro', priority: 60, usedData: ['birth'], source: { label: SRC_ASTRO } },
      {
        amiga: `según los astros, hoy la Luna está en ${sign}, tu signo. Que te sea leve.`,
        flirt: `la Luna está hoy en ${sign}, tu signo. Según los astros, hoy brillas más de lo normal.`,
        pareja: `según los astros, la Luna pasa hoy por ${sign}, tu signo. Hoy te toca mimo extra.`
      }
    );
  }

  // 5. Fase lunar (llena / nueva)
  const phase = moonPhase(parseISO(todayISO));
  if (phase.name === 'llena') {
    add(
      { id: 'full-moon', kind: 'astro', priority: 45, usedData: [], source: { label: SRC_ASTRO } },
      {
        amiga: 'hay luna llena esta noche. Mírala un momento, que vale la pena.',
        flirt: 'hay luna llena esta noche. Mírala un momento y me cuentas.',
        pareja: 'hay luna llena esta noche. Salimos un momento a mirarla.'
      }
    );
  } else if (phase.name === 'nueva') {
    add(
      { id: 'new-moon', kind: 'astro', priority: 35, usedData: [], source: { label: SRC_ASTRO } },
      { amiga: 'hoy es luna nueva, buen día para empezar algo.', flirt: 'hoy es luna nueva, buen día para empezar algo.', pareja: 'hoy es luna nueva, buen día para empezar algo juntos.' }
    );
  }

  // 6. Con ubicación: estación y puesta de sol
  if (loc) {
    const season = seasonStartingOn(todayISO, loc.lat);
    if (season) {
      add(
        { id: `season-${season}`, kind: 'season', priority: 50, usedData: ['location'], source: { label: SRC_ASTRO } },
        {
          amiga: `hoy empieza el ${season}. Buen momento para quedar a tomar algo.`,
          flirt: `hoy empieza el ${season}. Excusa perfecta para un plan nuevo.`,
          pareja: `hoy empieza el ${season}. Excusa perfecta para un plan los dos.`
        }
      );
    }
    const t = sunTimes(loc.lat, loc.lon, parseISO(todayISO));
    if (t.sunset && loc.tz) {
      const hhmm = fmtTime(t.sunset, loc.tz);
      add(
        { id: 'sunset', kind: 'sunset', priority: 30, usedData: ['location'], source: { label: SRC_ASTRO } },
        {
          flirt: `hoy el sol se pone a las ${hhmm}. Plan: verlo juntos.`,
          pareja: `hoy el sol se pone a las ${hhmm}. Plan: verlo los dos.`
        }
      );
    }
  } else {
    unlocks.push({ id: 'location', need: 'location', text: 'Añade tu ciudad para desbloquear la hora del atardecer y el inicio de estación.' });
  }

  hooks.sort((a, b) => b.priority - a.priority);
  return { ok: true, band, group, hooks, unlocks };
}

export { addDays };
