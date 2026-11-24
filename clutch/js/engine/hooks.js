// Motor de ganchos: solo devuelve datos REALES y verificables, y solo con los datos disponibles.
// Cada gancho: { id, kind, priority, usedData[], source, daysAhead, reminder, message, mid }.
// Los textos pueden tener varias versiones: sale la que más tiempo lleva sin usarse (mid = "gancho:versión"),
// para que ni la luna llena ni el cumpleaños suenen igual cada vez. Lo usado vive en profile.used (en el móvil).

import { parseISO, daysBetween, addDays } from '../core/dates.js';
import { checkAdult, STAGES_WITH_MILESTONES, isValidStage, profileBand } from '../core/stages.js';
import { moonSign, moonPhase, sunSignFromBirth, sunTimes, seasonStartingOn, moonLongitude, signName } from '../core/astro.js';
import { worldDaysOn } from '../data/worldDays.js';
import { compose, groupOf } from './voice.js';
import { leastUsed, restedOrToday } from './rotation.js';

const MILESTONE_DAYS = [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000];
const SINCE_LABEL = {
  rollo: 'desde que nos conocimos',
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

// ---------- seguimiento de sus eventos ----------
const LUCK = /examen|entrevista|medic|dentista|operacion|presentacion|oposicion|prueba|juicio|analisis|revision|selectividad|evau|ebau|defensa|tfg|tfm/;
const FUN = /concierto|viaje|boda|fiesta|festival|despedida|partido|escapada|vacaciones|cena|comida|bautizo|comunion|cumple/;

// «Entrevista» → «la entrevista»; «Viaje a Roma» → «el viaje a Roma»; «Boda de su prima» → «la boda de tu prima».
export function eventPhrase(text) {
  let s = String(text || '').trim().replace(/[.!]+$/, '');
  if (!s) return null;
  s = s.replace(/\bsus\b/gi, 'tus').replace(/\bsu\b/gi, 'tu');
  if (/^(el|la|los|las|tu|tus|mi|mis)\s/i.test(s)) return s.charAt(0).toLowerCase() + s.slice(1);
  const first = norm(s.split(/\s+/)[0]);
  const fem = /(a|cion|sion|dad|tud)$/.test(first) && !/^(dia|mapa|planeta|tema|problema|programa|sistema)$/.test(first);
  const plural = /s$/.test(first) && !/^(analisis|tfgs?|tesis|crisis)$/.test(first);
  const art = plural ? (fem || /as$/.test(first) ? 'las' : 'los') : fem ? 'la' : 'el';
  return `${art} ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
}
const loDe = (ph) => (ph.startsWith('el ') ? `lo del ${ph.slice(3)}` : `lo de ${ph}`);

// Para un evento apuntado: ayer → «¿qué tal…?», hoy → suerte o que disfrute, mañana → suerte (solo si es algo que da nervios).
function eventFollowUp(ev, todayISO) {
  if (!ev || !ev.month || !ev.day) return null;
  const t = norm(ev.text || '');
  if (/^(su |tu )?(cumple|cumpleanos|aniversario)\b/.test(t)) return null; // los de ella ya salen por su lado
  const years = ev.year && !ev.yearly ? [ev.year] : [+todayISO.slice(0, 4) - 1, +todayISO.slice(0, 4), +todayISO.slice(0, 4) + 1];
  let diff = null;
  for (const y of years) {
    const iso = `${y}-${String(ev.month).padStart(2, '0')}-${String(ev.day).padStart(2, '0')}`;
    if (!parseISO(iso)) continue;
    const d = daysBetween(todayISO, iso);
    if (d >= -1 && d <= 1) { diff = d; break; }
  }
  if (diff == null) return null;
  const ph = eventPhrase(ev.text);
  if (!ph) return null;
  const luck = LUCK.test(t), fun = FUN.test(t);
  if (diff === -1) {
    return { when: 'ayer', texts: fun
      ? [`¿qué tal ayer ${loDe(ph)}? Quiero detalles.`, `bueno, cuéntame qué tal ${loDe(ph)}.`]
      : [`¿qué tal fue ${loDe(ph)}?`, `oye, al final ¿qué tal ${loDe(ph)}?`] };
  }
  if (diff === 0 && luck) return { when: 'hoy', texts: [`mucha suerte hoy con ${ph}. Vas a ir genial.`, `hoy es ${ph}, ¿no? Mucha suerte. Luego me cuentas.`] };
  if (diff === 0 && fun) return { when: 'hoy', texts: [`disfruta mucho hoy ${loDe(ph)}.`, `¡pásalo genial hoy! Y luego me cuentas qué tal ${loDe(ph)}.`] };
  if (diff === 1 && luck) return { when: 'manana', texts: [`mañana es ${ph}, ¿no? Lo vas a hacer genial.`, `mucho ánimo para mañana con ${ph}. Cualquier cosa, aquí estoy.`] };
  return null;
}

/**
 * profile: { id?, used?, name, birth?, band?, stage, since?, tastes?: string[], events?: [], location?: {lat,lon,tz,city} }
 * Devuelve { ok:false, reason } o { ok:true, band, group, hooks, unlocks }.
 */
export function generateHooks(profile, todayISO) {
  if (!profile || !isValidStage(profile.stage)) return { ok: false, reason: 'etapa-invalida' };
  const band = profileBand(profile, todayISO);
  if (!band) return { ok: false, reason: profile.birth ? checkAdult(profile.birth, todayISO).reason : 'sin-edad' };

  const group = groupOf(profile.stage);
  const tastes = (profile.tastes || []).map(norm).filter(Boolean);
  const loc = profile.location && Number.isFinite(profile.location.lat) && Number.isFinite(profile.location.lon) ? profile.location : null;
  const hooks = [];
  const unlocks = [];
  const rot = { id: profile.id || profile.name, used: profile.used || {} };

  const add = (h, texts) => {
    const reminderOnly = typeof texts === 'object' && Object.keys(texts).length === 0;
    if (reminderOnly) {
      hooks.push({ daysAhead: 0, reminder: null, ...h, message: null });
      return;
    }
    const raw = typeof texts === 'string' ? texts : texts[group];
    if (!raw) return;
    const versions = (Array.isArray(raw) ? raw : [raw]).map((t, i) => ({ id: `${h.id}:${i}`, t }));
    const pick = leastUsed(versions, rot, todayISO, h.id);
    const message = compose({ text: pick.t, name: profile.name, band, group });
    if (message) hooks.push({ daysAhead: 0, reminder: null, ...h, message, mid: pick.id });
  };

  // 1. Cumpleaños de ella
  const bd = profile.birth ? nextBirthday(profile.birth, todayISO) : null;
  if (!profile.birth) unlocks.push({ id: 'birth', need: 'birth', text: 'Añade su fecha de nacimiento (en Ella > Editar) para no olvidar su cumpleaños.' });
  if (bd) {
    add(
      {
        id: 'birthday', kind: 'birthday', priority: bd.daysAhead === 0 ? 100 : 80, usedData: ['birth'], source: { label: SRC_USER },
        daysAhead: bd.daysAhead,
        reminder: bd.daysAhead === 0 ? 'Hoy es su cumpleaños' : `Su cumpleaños es en ${bd.daysAhead} días`
      },
      bd.daysAhead === 0
        ? {
            flirt: ['¡feliz cumple! Hoy déjate mimar, que te toca.', '¡feliz cumpleaños! Espero que hoy te traten como te mereces.', '¡feliz cumple! Disfruta mucho hoy, y luego me cuentas.'],
            pareja: ['¡feliz cumpleaños, mi vida! Hoy el plan eres tú.', '¡feliz cumple! Otro año más aguantándome, gracias.', '¡feliz cumpleaños! Hoy todo lo eliges tú.']
          }
        : {}
    );
  }

  // 2. Hitos y aniversario (con fecha de inicio)
  if (STAGES_WITH_MILESTONES.includes(profile.stage)) {
    if (profile.since && parseISO(profile.since)) {
      const label = SINCE_LABEL[profile.stage];
      const ms = nextMilestone(profile.since, todayISO);
      if (ms) {
        const phrase = profile.stage === 'rollo' ? `hoy hace ${ms.n} días ${label}.` : `hoy se cumplen ${ms.n} días ${label}.`;
        const tails = {
          rollo: [' Y me acuerdo bien.', ' Y se me han pasado volando.', ' Y los que quedan.'],
          pareja: [' Cada uno ha valido la pena.', ' Y quiero muchos más.', ' Y cada día me alegro más.'],
          matrimonio: [' Gracias por cada uno.', ' Y seguimos sumando.', ' Volvería a elegirte en cada uno.']
        }[profile.stage];
        const withTails = tails.map((t) => phrase + t);
        add(
          {
            id: `milestone-${ms.n}`, kind: 'milestone', priority: ms.daysAhead === 0 ? 95 : 70, usedData: ['since'], source: { label: SRC_USER },
            daysAhead: ms.daysAhead,
            reminder: ms.daysAhead === 0 ? `Hoy: ${ms.n} días` : `${ms.n} días en ${ms.daysAhead} días`
          },
          ms.daysAhead === 0 ? { flirt: withTails, pareja: withTails } : {}
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
                flirt: [`hoy hace ${yrs} ${SINCE_LABEL.rollo}. No se me ha olvidado.`, `hoy hace ${yrs} ${SINCE_LABEL.rollo}. Qué buena decisión fue.`],
                pareja: [`hoy hace ${yrs} ${profile.stage === 'matrimonio' ? 'que nos casamos' : 'que empezamos'}. Gracias por quedarte.`, `hoy hace ${yrs} ${profile.stage === 'matrimonio' ? 'que nos casamos' : 'que empezamos'}. Lo mejor que me ha pasado.`]
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

  // 3b. Sus planes y citas apuntados: suerte el día antes y el mismo día, y preguntar qué tal al día siguiente.
  //     Es lo que más humano suena, porque demuestra que él se acuerda de lo que ella le contó.
  for (const ev of profile.events || []) {
    const f = eventFollowUp(ev, todayISO);
    if (!f) continue;
    add(
      { id: `ev-${ev.id}-${f.when}`, kind: 'event', priority: f.when === 'hoy' ? 92 : f.when === 'ayer' ? 88 : 72, usedData: ['events'], source: { label: SRC_USER } },
      { flirt: f.texts, pareja: f.texts }
    );
  }

  // 4. Astro: Luna en su signo (según los astros)
  const her = profile.birth ? sunSignFromBirth(profile.birth) : null;
  const sign = stableMoonSign(todayISO);
  if (her && !her.cusp && sign && sign === her.sign) {
    add(
      { id: 'moon-in-sign', kind: 'astro', priority: 60, usedData: ['birth'], source: { label: SRC_ASTRO } },
      {
        flirt: [`dicen los astros que hoy la Luna está en ${sign}, tu signo. Yo de esto no sé mucho, pero te pega.`, `según los astros, hoy la Luna está en ${sign}, tu signo. Ya decía yo que hoy tenías algo.`, `la Luna está hoy en ${sign}, tu signo. Si lo dicen los astros, será verdad: hoy es tu día.`],
        pareja: [`según los astros, la Luna pasa hoy por ${sign}, tu signo. Hoy te toca mimo extra.`, `según los astros, hoy la Luna está en ${sign}, tu signo. Así que hoy mandas tú.`, `hoy la Luna pasa por ${sign}, tu signo. Según los astros te toca un día bonito; yo me encargo del resto.`]
      }
    );
  }

  // 5. Fase lunar (llena / nueva)
  const phase = moonPhase(parseISO(todayISO));
  if (phase.name === 'llena') {
    add(
      { id: 'full-moon', kind: 'astro', priority: 45, usedData: [], source: { label: SRC_ASTRO } },
      {
        flirt: ['hay luna llena esta noche. Mírala un momento y me cuentas.', 'esta noche hay luna llena. Te reto a asomarte y decirme si la ves.', 'luna llena esta noche. Buena excusa para dar un paseo, ¿no?'],
        pareja: ['hay luna llena esta noche. Salimos un momento a mirarla.', 'esta noche hay luna llena. ¿Paseo después de cenar?', 'luna llena esta noche. Asómate un momento, que merece la pena.']
      }
    );
  } else if (phase.name === 'nueva') {
    add(
      { id: 'new-moon', kind: 'astro', priority: 35, usedData: [], source: { label: SRC_ASTRO } },
      {
        flirt: ['hoy es luna nueva, buen día para empezar algo.', 'luna nueva hoy. Buen día para planes nuevos, ¿no crees?'],
        pareja: ['hoy es luna nueva, buen día para empezar algo juntos.', 'hoy hay luna nueva. ¿Empezamos algo nuevo los dos? Tú eliges qué.']
      }
    );
  }

  // 6. Con ubicación: estación y puesta de sol
  if (loc) {
    const season = seasonStartingOn(todayISO, loc.lat);
    if (season) {
      add(
        { id: `season-${season}`, kind: 'season', priority: 50, usedData: ['location'], source: { label: SRC_ASTRO } },
        {
          flirt: [`hoy empieza el ${season}. Excusa perfecta para un plan nuevo.`, `hoy empieza el ${season}. Tengo un par de planes en mente para estrenarlo.`, `arranca el ${season}. ¿Lo estrenamos con algo?`],
          pareja: [`hoy empieza el ${season}. Excusa perfecta para un plan los dos.`, `hoy empieza el ${season}. Propongo estrenarlo con una cena los dos.`, `arranca el ${season}. Que sea el mejor que pasemos juntos.`]
        }
      );
    }
    const t = sunTimes(loc.lat, loc.lon, parseISO(todayISO));
    // El atardecer sale cada día: tras usarlo descansa como un mensaje ligero (~10 días, con variación).
    if (t.sunset && loc.tz && restedOrToday({ id: 'sunset', e: 'ligero' }, rot, todayISO)) {
      const hhmm = fmtTime(t.sunset, loc.tz);
      add(
        { id: 'sunset', kind: 'sunset', priority: 30, usedData: ['location'], source: { label: SRC_ASTRO } },
        {
          flirt: [`hoy el sol se pone a las ${hhmm}. Plan: verlo juntos.`, `hoy el sol se pone a las ${hhmm}. ¿Te apetece verlo conmigo?`, `atardecer hoy a las ${hhmm}. ¿Lo vemos juntos desde algún sitio bonito?`],
          pareja: [`hoy el sol se pone a las ${hhmm}. Plan: verlo los dos.`, `hoy el sol se pone a las ${hhmm}. ¿Lo vemos juntos?`, `atardecer a las ${hhmm}. Te paso a buscar un rato antes.`]
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
