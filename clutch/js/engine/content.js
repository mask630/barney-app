// Contenido que no depende de datos concretos: gestos, mensajes genéricos, SOS, fechas próximas y cuidado del ciclo.

import { parseISO, daysBetween } from '../core/dates.js';
import { STAGES_WITH_MILESTONES, STAGE_GROUP } from '../core/stages.js';
import { stageRank } from '../core/store.js';
import { compose } from './voice.js';
import { mothersDay } from '../data/worldDays.js';

const GESTURES = {
  amiga: [
    'Pregúntale cómo le fue ese plan del que te habló.',
    'Mándale una canción que te recordó a una conversación vuestra.',
    'Ofrécete a acompañarla a algo que tenga pendiente.',
    'Comparte un meme o vídeo que sepas que le hará gracia.',
    'Felicítala por algo que haya logrado, aunque sea pequeño.',
    'Propón un café sin motivo, a la hora que a ella le venga bien.'
  ],
  flirt: [
    'Hazle un cumplido concreto, no genérico: algo que hayas notado de verdad.',
    'Propón un plan con fecha y hora, no un "a ver cuándo quedamos".',
    'Recuerda algo que te contó y pregúntale cómo fue.',
    'Mándale una foto de algo que te hizo pensar en lo que le gusta.',
    'Deja que ella elija el sitio y ofrécete a reservar tú.',
    'Termina la conversación en un momento bueno, sin alargarla.',
    'Sé claro con lo que quieres. La claridad atrae más que el misterio.'
  ],
  pareja: [
    'Haz tú algo de la casa que normalmente hace ella, sin avisar.',
    'Prepara su bebida favorita sin que la pida.',
    'Escríbele una nota corta con algo concreto que valoras de ella.',
    'Pregúntale cómo está de verdad y escucha sin buscar solución.',
    'Planifica un rato a solas sin móviles, aunque sean veinte minutos.',
    'Reserva algo para el fin de semana y no se lo digas hasta el último momento.',
    'Dale un abrazo largo al llegar a casa, antes de hablar del día.',
    'Encárgate de una tarea que le pese esta semana.'
  ]
};

const GENERIC_MESSAGES = {
  amiga: ['¿cómo llevas la semana?', 'me acordé de ti. ¿Qué tal todo?', 'ánimo con lo de hoy, seguro que sale bien.'],
  flirt: ['¿qué tal tu día? Cuéntame lo mejor.', 'me ha pasado algo que te hará gracia, te lo cuento cuando quedemos.', '¿te apetece que quedemos esta semana?'],
  pareja: ['¿cómo vas hoy? Cuéntame.', 'solo quería decirte que me alegra tenerte.', '¿qué te apetece cenar hoy? Yo me encargo.']
};

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Tres gestos distintos, estables durante todo el día para el mismo perfil.
export function dailyGestures(profile, todayISO, count = 3) {
  const pool = GESTURES[STAGE_GROUP[profile.stage]];
  const start = hashStr(`${profile.id}:${todayISO}`) % pool.length;
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}

export function genericMessages(profile, band, group) {
  return GENERIC_MESSAGES[group].map((text) => compose({ text, name: profile.name, band, group })).filter(Boolean);
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
