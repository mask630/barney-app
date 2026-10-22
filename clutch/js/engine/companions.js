// Acompañantes. Gym Bro es gratis (y se puede renombrar). El resto son PRO. Nombres y frases originales.

export const COMPANIONS = {
  gymbro: {
    pro: false,
    label: 'Neutro y positivo',
    lines: {
      hook: ['Dato real en mano. Hoy sumas puntos fácil.', 'Esto es oro: envíalo y a por el día.'],
      nodata: ['Sin dato especial hoy: un gesto pequeño vale más que nada.', 'Hoy toca constancia. Haz uno de los gestos.']
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
  const use = isAvailable(id, isPro) ? id : 'gymbro';
  const pool = COMPANIONS[use].lines[kind];
  const n = (todayISO.charCodeAt(9) + todayISO.charCodeAt(8) + (kind === 'hook' ? 1 : 0)) % pool.length;
  return pool[n];
}
