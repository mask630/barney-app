// Contenido que no depende de datos concretos: gestos, mensajes genéricos, SOS, fechas próximas y su ciclo.

import { parseISO, daysBetween, addDays } from '../core/dates.js';
import { STAGES_WITH_MILESTONES, STAGE_GROUP } from '../core/stages.js';
import { compose } from './voice.js';
import { mothersDay } from '../data/worldDays.js';
import { MESSAGES, GESTURES } from '../data/bank.js';
import { pickRotating } from './rotation.js';

// Gestos y mensajes sencillos salen del banco y rotan con descanso según su esfuerzo (engine/rotation.js).

// Un elemento con `st` solo sale en esas etapas; sin `st`, en todas las de su registro.
const forStage = (pool, stage) => pool.filter((it) => !it.st || it.st.includes(stage));

// Tres gestos para hoy, estables durante el día. Devuelve elementos del banco: { id, e, t }.
export function dailyGestures(profile, todayISO, count = 3) {
  return pickRotating(forStage(GESTURES[STAGE_GROUP[profile.stage]], profile.stage), profile, todayISO, count, 'g');
}

// Tres mensajes sencillos para hoy, ya con saludo y despedida. Devuelve { id, text }.
export function genericMessages(profile, band, group, todayISO, count = 3) {
  return pickRotating(forStage(MESSAGES[group], profile.stage), profile, todayISO, count, 'm')
    .map((it) => ({ id: it.id, text: compose({ text: it.t, name: profile.name, band, group }) }))
    .filter((m) => m.text);
}

// Fechas próximas para la pantalla Hoy. Solo con datos reales del perfil.
export function upcoming(profile, todayISO, horizonDays = 200, country = null) {
  const out = [];
  const today = parseISO(todayISO);
  const y = today.getUTCFullYear();
  const push = (label, month, day, kind, yearly = true, year = null, key = kind) => {
    const candidates = yearly ? [y, y + 1] : [year];
    for (const yy of candidates) {
      const iso = `${yy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!parseISO(iso)) continue;
      const ahead = daysBetween(todayISO, iso);
      if (ahead >= 0 && ahead <= horizonDays) {
        out.push({ key, label, kind, daysAhead: ahead, iso });
        return;
      }
    }
  };
  if (profile.birth) push('Su cumpleaños', +profile.birth.slice(5, 7), +profile.birth.slice(8, 10), 'birthday');
  if (profile.since && STAGES_WITH_MILESTONES.includes(profile.stage)) {
    push('Vuestro aniversario', +profile.since.slice(5, 7), +profile.since.slice(8, 10), 'anniversary');
  }
  if (country) {
    for (const yy of [y, y + 1]) {
      const m = mothersDay(yy, country);
      if (!m) continue;
      const iso = `${yy}-${String(m.month).padStart(2, '0')}-${String(m.day).padStart(2, '0')}`;
      const ahead = daysBetween(todayISO, iso);
      if (ahead >= 0 && ahead <= horizonDays) { out.push({ key: 'mothers', label: 'Día de la Madre (la tuya y la suya)', kind: 'mothers', daysAhead: ahead, iso }); break; }
    }
  }
  for (const e of profile.events) push(e.text, e.month, e.day, 'event', e.yearly || !e.year, e.year, `event-${e.id}`);
  return out.sort((a, b) => a.daysAhead - b.daysAhead);
}

// Su ciclo: fase calculada y lo que suele pasar en ella según los estudios (tendencias de la mayoría, no de cada mujer).
// Opcional, en todas las etapas. Sirve para acertar (chocolate antes de la regla, una cita especial en sus mejores días);
// nunca para presionar. No es un método anticonceptivo.
export const CYCLE_MIN = 21;
export const CYCLE_MAX = 40;

const PHASES = {
  regla: {
    name: 'Tiene la regla',
    mood: 'Suele haber menos energía y a veces dolor. Es muy normal tener antojo de dulce.',
    tip: 'Chocolate, algo calentito y un plan tranquilo. Que no tenga que pensar en nada.',
    desire: 'El deseo cambia mucho estos días: a unas les baja y a otras les sube. Que lo marque ella.'
  },
  folicular: {
    name: 'Después de la regla',
    mood: 'La energía y el buen humor suelen ir subiendo día a día.',
    tip: 'Buen momento para proponer algo nuevo o un plan activo.',
    desire: 'El deseo suele ir en aumento.'
  },
  ovulacion: {
    name: 'Sus días de más energía',
    mood: 'Estadísticamente son los días con más ganas de salir, arreglarse y ver gente.',
    tip: 'Buen momento para una cita especial o un plan que le haga ilusión.',
    desire: 'Según los estudios, es cuando muchas mujeres sienten más deseo.'
  },
  lutea: {
    name: 'Segunda mitad del ciclo',
    mood: 'Suele apetecer más calma y estar en casa.',
    tip: 'Planes tranquilos: peli, cena en casa, un paseo.',
    desire: 'El deseo suele bajar un poco respecto a los días anteriores.'
  },
  premenstrual: {
    name: 'Antes de la regla',
    mood: 'Muchas mujeres están más sensibles, cansadas o con antojos estos días.',
    tip: 'Paciencia y mimos. Ten chocolate a mano: puede venirle en {d}.',
    desire: 'Varía mucho de una mujer a otra: no lo des por hecho.'
  }
};

// Duración media a partir de los inicios que se han ido marcando (si hay al menos dos).
export function cycleLength(cycle) {
  const starts = [...new Set(cycle?.starts || [])].sort();
  const gaps = starts.slice(1).map((s, i) => daysBetween(starts[i], s)).filter((g) => g >= CYCLE_MIN && g <= CYCLE_MAX).slice(-6);
  if (gaps.length) return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  const l = +cycle?.length;
  return l >= CYCLE_MIN && l <= CYCLE_MAX ? l : 28;
}

export function cycleInfo(profile, todayISO) {
  const c = profile.cycle;
  if (!c?.enabled || !c.lastStart) return null;
  const len = cycleLength(c);
  const elapsed = daysBetween(c.lastStart, todayISO);
  if (elapsed < 0) return null;
  const day = (elapsed % len) + 1;
  const nextStart = addDays(c.lastStart, (Math.floor(elapsed / len) + 1) * len);
  const toNext = daysBetween(todayISO, nextStart);
  const ovu = len - 14; // la ovulación suele caer unos 14 días antes de la siguiente regla
  const phase = day <= 5 ? 'regla' : day < ovu - 2 ? 'folicular' : day <= ovu + 1 ? 'ovulacion' : toNext <= 5 ? 'premenstrual' : 'lutea';
  const when = toNext === 1 ? 'un día' : `unos ${toNext} días`;
  const ph = PHASES[phase];
  return { phase, day, len, nextStart, toNext, name: ph.name, mood: ph.mood, desire: ph.desire, tip: ph.tip.replace('{d}', when) };
}

// Próximos inicios estimados (para el calendario de la app).
export function nextPeriods(profile, todayISO, count = 3) {
  const info = cycleInfo(profile, todayISO);
  if (!info) return [];
  return Array.from({ length: count }, (_, i) => addDays(info.nextStart, i * info.len));
}

export const SOS = [
  {
    id: 'enfadada',
    title: 'Está enfadada',
    tip: 'No te defiendas aún: reconoce cómo se siente y pide perdón por lo concreto.',
    steps: ['Respira antes de escribir.', 'No te defiendas todavía: primero reconoce lo que ella siente.', 'Pide perdón por lo concreto, no en general.'],
    scripts: {
      flirt: 'Oye, sé que te ha sentado mal y no era mi intención. ¿Lo hablamos cuando te venga bien?',
      pareja: 'Siento lo de antes. Entiendo que te haya molestado. Cuando quieras lo hablamos, sin excusas.'
    }
  },
  {
    id: 'visto',
    title: 'Me ha dejado en visto',
    tip: 'Nada de mensajes seguidos. Espera medio día y escribe algo ligero.',
    steps: ['No mandes cinco mensajes seguidos.', 'Espera, mínimo, medio día.', 'Escribe algo ligero que no exija respuesta.'],
    scripts: {
      flirt: 'Veo que andas liada. Cuando respires, me cuentas.',
      pareja: 'Sé que vas a tope. Cuando puedas me dices algo. Un beso.'
    }
  },
  {
    id: 'liada',
    title: 'La he liado',
    tip: 'Reconócelo pronto, sin excusas, y ofrece una forma de arreglarlo.',
    steps: ['Reconócelo pronto, sin adornos.', 'Di qué has hecho mal, con tus palabras.', 'Ofrece una forma concreta de arreglarlo.'],
    scripts: {
      flirt: 'La he liado y lo sé. Perdóname. ¿Me dejas compensártelo?',
      pareja: 'Me equivoqué y lo sé. Lo siento de verdad. Dime cómo lo arreglamos.'
    }
  },
  {
    id: 'fecha',
    title: 'Se me olvidó una fecha',
    tip: 'Dilo tú antes que ella, sin inventar excusas, y compénsalo en 24 horas.',
    steps: ['No inventes una excusa.', 'Dilo tú antes de que lo diga ella.', 'Haz algo concreto en las próximas 24 horas.'],
    scripts: {
      flirt: 'Se me pasó y no tengo excusa, lo siento. Déjame compensártelo: el plan lo eliges tú.',
      pareja: 'Se me pasó, y no hay excusa que valga. Perdóname. Esta semana me lo curro yo.'
    }
  },
  {
    id: 'discusion',
    title: 'Estamos discutiendo',
    tip: 'Propón una pausa con hora para retomarlo, y cúmplela.',
    steps: ['Baja la voz, o deja el chat: dilo con respeto.', 'Propón una pausa con hora para retomar.', 'Vuelve a la hora que dijiste.'],
    scripts: {
      flirt: 'Ahora mismo estoy muy alterado para hablarlo bien. ¿Paramos un rato y luego seguimos?',
      pareja: 'Necesito parar un poco para hablarlo bien. Esta noche lo retomamos, te lo prometo. Te quiero.'
    }
  }
];
