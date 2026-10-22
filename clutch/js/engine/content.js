// Contenido que no depende de datos concretos: gestos, mensajes genéricos, SOS, fechas próximas y cuidado del ciclo.

import { parseISO, daysBetween } from '../core/dates.js';
import { STAGES_WITH_MILESTONES, STAGE_GROUP } from '../core/stages.js';
import { stageRank } from '../core/store.js';
import { compose } from './voice.js';
import { mothersDay } from '../data/worldDays.js';
import { MESSAGES, GESTURES } from '../data/bank.js';
import { pickRotating } from './rotation.js';

// Gestos y mensajes sencillos salen del banco y rotan con descanso según su esfuerzo (engine/rotation.js).

// Un elemento con `st` solo sale en esas etapas (p. ej. lo intenso no sale en Objetivo).
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
  const push = (label, month, day, kind, yearly = true, year = null) => {
    const candidates = yearly ? [y, y + 1] : [year];
    for (const yy of candidates) {
      const iso = `${yy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!parseISO(iso)) continue;
      const ahead = daysBetween(todayISO, iso);
      if (ahead >= 0 && ahead <= horizonDays) {
        out.push({ label, kind, daysAhead: ahead, iso });
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
      if (ahead >= 0 && ahead <= horizonDays) { out.push({ label: 'Día de la Madre (la tuya y la suya)', kind: 'mothers', daysAhead: ahead, iso }); break; }
    }
  }
  for (const e of profile.events) push(e.text, e.month, e.day, 'event', e.yearly || !e.year, e.year);
  return out.sort((a, b) => a.daysAhead - b.daysAhead);
}

// Cuidado orientativo según el ciclo. Solo si ella lo activa, solo desde Citas, siempre como tendencia.
export function cycleCare(profile, todayISO) {
  const c = profile.cycle;
  if (!c?.enabled || !c.lastStart || stageRank(profile.stage) < stageRank('citas')) return null;
  const elapsed = daysBetween(c.lastStart, todayISO);
  if (elapsed < 0) return null;
  const day = (elapsed % c.length) + 1;
  if (day <= 5) {
    return { phase: 'regla', day, text: 'Por el cálculo, puede estar en sus días. Chocolate, un abrazo y cero presión.' };
  }
  if (day >= c.length - 4) {
    return { phase: 'previos', day, text: 'Por el cálculo, pueden ser días previos y estar más sensible. Paciencia y un detalle dulce.' };
  }
  return null;
}

export const SOS = [
  {
    id: 'enfadada',
    title: 'Está enfadada conmigo',
    steps: ['Respira antes de escribir.', 'No te defiendas todavía: primero reconoce lo que ella siente.', 'Pide perdón por lo concreto, no en general.'],
    scripts: {
      amiga: 'Siento que te haya sentado mal. Dime qué ha pasado y lo hablamos con calma.',
      flirt: 'Veo que te ha molestado y no era mi intención. ¿Hablamos cuando te venga bien?',
      pareja: 'Siento haberte hecho sentir así. Te escucho cuando quieras, sin prisa y sin excusas.'
    }
  },
  {
    id: 'visto',
    title: 'Me ha dejado en visto',
    steps: ['No mandes cinco mensajes seguidos.', 'Espera, mínimo, medio día.', 'Escribe algo ligero que no exija respuesta.'],
    scripts: {
      amiga: 'Sin prisa con lo de antes. Cuando tengas un rato, me cuentas.',
      flirt: 'Veo que estás liada. Cuando respires, me cuentas.',
      pareja: 'Sé que andas a tope. Cuando puedas, me escribes. Un abrazo.'
    }
  },
  {
    id: 'liada',
    title: 'La he liado',
    steps: ['Reconócelo pronto, sin adornos.', 'Di qué has hecho mal, con tus palabras.', 'Ofrece una forma concreta de arreglarlo.'],
    scripts: {
      amiga: 'La he liado y lo sé. Perdóname. ¿Cómo puedo arreglarlo?',
      flirt: 'Me he equivocado y quiero arreglarlo. Perdóname. ¿Me dejas compensártelo?',
      pareja: 'Me equivoqué y lo sé. Perdóname. Dime cómo lo arreglamos, estoy dispuesto.'
    }
  },
  {
    id: 'fecha',
    title: 'Se me olvidó una fecha',
    steps: ['No inventes una excusa.', 'Dilo tú antes de que lo diga ella.', 'Haz algo concreto en las próximas 24 horas.'],
    scripts: {
      amiga: 'Se me pasó por completo y me fastidia. Perdón. Déjame invitarte a algo para compensarlo.',
      flirt: 'Se me pasó, y lo siento. Déjame compensártelo con un plan, tú eliges.',
      pareja: 'Se me pasó y no tengo excusa. Perdóname. Esta semana me lo curro yo, tú solo disfruta.'
    }
  },
  {
    id: 'discusion',
    title: 'Estamos en plena discusión',
    steps: ['Baja la voz, o deja el chat: dilo con respeto.', 'Propón una pausa con hora para retomar.', 'Vuelve a la hora que dijiste.'],
    scripts: {
      amiga: 'Prefiero parar un momento para no decir algo que no siento. ¿Lo retomamos mañana?',
      flirt: 'Ahora mismo estoy acalorado. Paramos un rato y lo hablamos luego, ¿vale?',
      pareja: 'Necesito parar un poco para hablarlo bien. Te prometo que lo retomamos esta noche. Te quiero.'
    }
  }
];
