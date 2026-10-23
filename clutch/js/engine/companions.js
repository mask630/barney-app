// Acompañantes: quién te habla en la app. En la base, Clutch te habla de forma cordial y cercana (sin personaje).
// Las personalidades son PRO. Nombres y frases propios de Clutch: no imitan a personajes de series, películas ni cómics
// (tienen derechos); se inspiran en tipos de personaje con voz original.
// Barney: el aliado seguro de sí mismo, con humor y buen fondo.

export const DEFAULT_COMPANION = 'cordial';

export const COMPANIONS = {
  cordial: {
    pro: false,
    label: 'Cordial',
    persona: false, // sin nombre de personaje: «La jugada de hoy» a secas
    lines: {
      hook: ['Hoy tienes un buen motivo para escribirle. Aprovéchalo.', 'Tienes un dato real: es un buen momento para un detalle.'],
      nodata: ['Hoy no hay fecha especial: un gesto sencillo siempre suma.', 'Día tranquilo. Elige uno de los gestos y listo.']
    }
  },
  gymbro: {
    pro: true,
    label: 'Gym Bro',
    lines: {
      hook: ['Dato real en mano, hermano. Hoy sumas puntos fácil.', 'Esto es oro puro. Envíalo y a darlo todo.'],
      nodata: ['Hoy no hay fecha, pero la constancia es el músculo que más se nota. Un gesto.', 'Día de rutina: un gesto pequeño y a por la siguiente serie.']
    }
  },
  barney: {
    pro: true,
    label: 'Barney',
    lines: {
      hook: ['Tienes el dato y el momento. Esto no se piensa: se envía.', 'Con esto quedas como un señor. Adelante.', 'Hoy juegas con ventaja. Úsala con cabeza.'],
      nodata: ['Día tranquilo, oportunidad perfecta: un detalle pequeño y te ganas la semana.', 'Nada especial en el calendario. Por eso mismo sorprende más un gesto.', 'Los grandes no esperan a una fecha. Haz uno de los gestos.']
    }
  },
  mentor: {
    pro: true,
    label: 'Mentor tranquilo',
    lines: {
      hook: ['Con calma. Un detalle a tiempo vale más que uno grande tarde.', 'Fíjate en lo importante: ella se acuerda de quién se acuerda.'],
      nodata: ['La constancia construye confianza. Hoy, un gesto pequeño.', 'No hace falta nada grande. Presencia y atención.']
    }
  },
  colega: {
    pro: true,
    label: 'Colega de confianza',
    lines: {
      hook: ['Tío, esto es pan comido. Envíalo y listo.', 'Ni lo pienses. Copiar, pegar, enviar.'],
      nodata: ['Hoy no hay fecha, pero un mensajito cae bien igual.', 'Un gesto rápido y a otra cosa.']
    }
  },
  estratega: {
    pro: true,
    label: 'Estratega',
    lines: {
      hook: ['Primero el dato, luego el momento, luego el mensaje. Ya tienes el dato.', 'Envíalo en un momento tranquilo de su día, no en el más ocupado.'],
      nodata: ['Sin fecha clave: mantén el ritmo con un gesto de bajo coste.', 'Prepara lo próximo: mira las fechas de las próximas semanas.']
    }
  },
  directo: {
    pro: true,
    label: 'Directo y breve',
    lines: {
      hook: ['Hay dato real. Envíalo.', 'Es el momento. Hazlo.'],
      nodata: ['Hoy no hay dato. Haz un gesto.', 'Un gesto. Ahora.']
    }
  }
};

export const COMPANION_IDS = Object.keys(COMPANIONS);

export function isAvailable(id, isPro) {
  const c = COMPANIONS[id];
  return !!c && (!c.pro || isPro);
}

// Frase estable durante el día para un acompañante.
export function companionLine(id, kind, todayISO, isPro) {
  const use = isAvailable(id, isPro) ? id : DEFAULT_COMPANION;
  const pool = COMPANIONS[use].lines[kind];
  const n = (todayISO.charCodeAt(9) + todayISO.charCodeAt(8) + (kind === 'hook' ? 1 : 0)) % pool.length;
  return pool[n];
}
