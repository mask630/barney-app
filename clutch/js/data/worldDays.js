// Días mundiales y fechas locales. Regla de producto: SOLO se usan los verificados (verified:true).
// Verificado = fecha confirmada en la página oficial del organismo (ONU, UNESCO, ICO, FAO) o en dos fuentes que coinciden.
// Fecha de la última comprobación: 2026-10-22. Los dudosos se quedan en UNVERIFIED y nunca se muestran.

const nth = (year, month, weekday, n) => {
  // n-ésimo día de la semana (0 = domingo) del mes. n = 1..5
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
};

const V = '2026-10-22';
const W = (page) => `https://en.wikipedia.org/wiki/${page}`;

export const WORLD_DAYS = [
  {
    id: 'pasta', fixed: { month: 10, day: 25 }, name: { es: 'Día Mundial de la Pasta' },
    tags: ['pasta', 'italiano', 'comida', 'cocinar'], needsTaste: false,
    ideas: {
      amiga: 'hoy es el Día Mundial de la Pasta. Te debo una cena de pasta, tú eliges el sitio.',
      flirt: 'hoy es el Día Mundial de la Pasta. Yo cocino, tú eliges la salsa. ¿Trato?',
      pareja: 'hoy es el Día Mundial de la Pasta. Cena en casa: yo cocino y tú eliges la salsa.'
    },
    verified: true, verifiedAt: V, sources: ['https://www.skyminder.com/', 'https://days.fead.co/']
  },
  {
    id: 'friendship', fixed: { month: 7, day: 30 }, name: { es: 'Día Internacional de la Amistad' },
    tags: ['amistad'], needsTaste: false,
    ideas: {
      amiga: 'hoy es el Día Internacional de la Amistad. Gracias por estar ahí.',
      flirt: 'hoy es el Día Internacional de la Amistad. Lo celebramos con un plan, ¿te apetece?',
      pareja: 'hoy es el Día Internacional de la Amistad. Además de mi pareja, eres mi mejor amiga.'
    },
    verified: true, verifiedAt: V, sources: ['https://news.un.org/en/story/2014/07/474022']
  },
  {
    id: 'women', fixed: { month: 3, day: 8 }, name: { es: 'Día Internacional de la Mujer' },
    tags: [], needsTaste: false,
    ideas: {
      amiga: 'hoy es el Día Internacional de la Mujer. Quería decirte que admiro lo que haces.',
      flirt: 'hoy es el Día Internacional de la Mujer. Quería decirte que admiro lo que haces.',
      pareja: 'hoy es el Día Internacional de la Mujer. Admiro todo lo que haces y cómo lo haces. Gracias.'
    },
    verified: true, verifiedAt: V, sources: [W('International_Women%27s_Day')]
  },
  {
    id: 'happiness', fixed: { month: 3, day: 20 }, name: { es: 'Día Internacional de la Felicidad' },
    tags: [], needsTaste: false,
    ideas: {
      amiga: 'hoy es el Día Internacional de la Felicidad. Espero que hoy te pase algo bueno.',
      flirt: 'hoy es el Día Internacional de la Felicidad. Hoy te toca una sonrisa y de eso me encargo yo.',
      pareja: 'hoy es el Día Internacional de la Felicidad. Contigo lo tengo fácil.'
    },
    verified: true, verifiedAt: V, sources: [W('International_Day_of_Happiness')]
  },
  {
    id: 'poetry', fixed: { month: 3, day: 21 }, name: { es: 'Día Mundial de la Poesía' },
    tags: ['poesía', 'poesia', 'libros', 'leer', 'lectura'], needsTaste: true,
    ideas: {
      amiga: 'hoy es el Día Mundial de la Poesía. ¿Cuál es tu poema favorito?',
      flirt: 'hoy es el Día Mundial de la Poesía. ¿Cuál es tu poema favorito? Yo te cuento el mío.',
      pareja: 'hoy es el Día Mundial de la Poesía. Esta noche te leo uno.'
    },
    verified: true, verifiedAt: V, sources: [W('World_Poetry_Day')]
  },
  {
    id: 'book', fixed: { month: 4, day: 23 }, name: { es: 'Día del Libro' },
    tags: ['libros', 'leer', 'lectura', 'literatura'], needsTaste: true,
    ideas: {
      amiga: 'hoy es el Día del Libro. Dime qué estás leyendo y te recomiendo uno.',
      flirt: 'hoy es el Día del Libro. ¿Qué estás leyendo? Intercambiamos recomendaciones.',
      pareja: 'hoy es el Día del Libro. Esta tarde leemos juntos, sin móviles.'
    },
    verified: true, verifiedAt: V, sources: [W('World_Book_Day')]
  },
  {
    id: 'jazz', fixed: { month: 4, day: 30 }, name: { es: 'Día Internacional del Jazz' },
    tags: ['jazz', 'música', 'musica'], needsTaste: true,
    ideas: {
      amiga: 'hoy es el Día Internacional del Jazz. ¿Ponemos algo mientras charlamos?',
      flirt: 'hoy es el Día Internacional del Jazz. ¿Te apetece un plan con buena música?',
      pareja: 'hoy es el Día Internacional del Jazz. Cena con jazz de fondo esta noche.'
    },
    verified: true, verifiedAt: V, sources: [W('International_Jazz_Day')]
  },
  {
    id: 'tea', fixed: { month: 5, day: 21 }, name: { es: 'Día Internacional del Té' },
    tags: ['té', 'te', 'infusión', 'infusion'], needsTaste: true,
    ideas: {
      amiga: 'hoy es el Día Internacional del Té. ¿Quedamos para tomar uno?',
      flirt: 'hoy es el Día Internacional del Té. ¿Te invito a uno?',
      pareja: 'hoy es el Día Internacional del Té. Te lo preparo yo cuando quieras.'
    },
    verified: true, verifiedAt: V, sources: ['https://www.fao.org/international-tea-day/en']
  },
  {
    id: 'yoga', fixed: { month: 6, day: 21 }, name: { es: 'Día Internacional del Yoga' },
    tags: ['yoga', 'meditación', 'meditacion'], needsTaste: true,
    ideas: {
      amiga: 'hoy es el Día Internacional del Yoga. ¿Te vienes a una clase?',
      flirt: 'hoy es el Día Internacional del Yoga. ¿Te vienes a una clase conmigo?',
      pareja: 'hoy es el Día Internacional del Yoga. Hacemos una sesión juntos esta tarde.'
    },
    verified: true, verifiedAt: V, sources: [W('International_Day_of_Yoga')]
  },
  {
    id: 'cat', fixed: { month: 8, day: 8 }, name: { es: 'Día Internacional del Gato' },
    tags: ['gatos', 'gato', 'mascotas', 'animales'], needsTaste: true,
    ideas: {
      amiga: 'hoy es el Día Internacional del Gato. Mándame una foto del tuyo.',
      flirt: 'hoy es el Día Internacional del Gato. Pásame una foto del tuyo y te cuento algo.',
      pareja: 'hoy es el Día Internacional del Gato. Hoy mimos extra para el gato, y para ti.'
    },
    verified: true, verifiedAt: V,
    sources: [W('International_Cat_Day'), 'https://www.upi.com/Odd_News/2022/08/08/International-Cat-Day-was-founded-by-animal-welfare-group-in-2002/5341659968559/']
  },
  {
    id: 'coffee', fixed: { month: 10, day: 1 }, name: { es: 'Día Internacional del Café' },
    tags: ['café', 'cafe'], needsTaste: true,
    ideas: {
      amiga: 'hoy es el Día Internacional del Café. Te invito a uno.',
      flirt: 'hoy es el Día Internacional del Café. Excusa perfecta para quedar. ¿Cuándo te viene bien?',
      pareja: 'hoy es el Día Internacional del Café. El primero de hoy lo preparo yo.'
    },
    verified: true, verifiedAt: V, sources: ['https://www.ico.org/show_news.asp?id=490']
  },
  {
    id: 'valentine', fixed: { month: 2, day: 14 }, excludeCountries: ['Colombia'], name: { es: 'San Valentín' },
    tags: [], needsTaste: false,
    ideas: {
      amiga: 'hoy es San Valentín. Solo un abrazo de amigo, sin segundas.',
      flirt: 'hoy es San Valentín. Me apetece invitarte a cenar. ¿Te apuntas?',
      pareja: 'hoy es San Valentín. Esta noche te invito a cenar.'
    },
    verified: true, verifiedAt: V, sources: [W('Valentine%27s_Day')]
  },
  {
    id: 'amor-amistad', rule: (y) => ({ month: 9, day: nth(y, 9, 6, 3) }), onlyCountries: ['Colombia'], name: { es: 'Día del Amor y la Amistad' },
    tags: [], needsTaste: false,
    ideas: {
      amiga: 'hoy es el Día del Amor y la Amistad. Gracias por ser una gran amiga.',
      flirt: 'hoy es el Día del Amor y la Amistad. Me apetece invitarte a algo. ¿Te apuntas?',
      pareja: 'hoy es el Día del Amor y la Amistad. Esta noche te invito a cenar.'
    },
    verified: true, verifiedAt: V, sources: [W('Valentine%27s_Day')]
  }
];

// Días que no se muestran hasta tener confirmación clara (fechas en disputa o sin fuente oficial).
export const UNVERIFIED = [
  { id: 'chocolate', why: 'Julio 7, 13 de septiembre y otras fechas según la fuente' },
  { id: 'kiss', why: 'No oficial: 6 de julio según unas fuentes, 14 de febrero según otra' },
  { id: 'pizza', why: 'Varias fechas (9 de febrero, 17 de enero) según el país' },
  { id: 'music', why: 'Fête de la Musique: no se pudo confirmar en la web oficial' }
];

// Día de la Madre por país. Solo recordatorio para el usuario, no mensaje para ella.
const MOTHERS = {
  'España': (y) => ({ month: 5, day: nth(y, 5, 0, 1) }),
  'Portugal': (y) => ({ month: 5, day: nth(y, 5, 0, 1) }),
  'México': () => ({ month: 5, day: 10 }),
  'Argentina': (y) => ({ month: 10, day: nth(y, 10, 0, 3) }),
  'Colombia': (y) => ({ month: 5, day: nth(y, 5, 0, 2) }),
  'Chile': (y) => ({ month: 5, day: nth(y, 5, 0, 2) }),
  'Perú': (y) => ({ month: 5, day: nth(y, 5, 0, 2) }),
  'Uruguay': (y) => ({ month: 5, day: nth(y, 5, 0, 2) }),
  'Venezuela': (y) => ({ month: 5, day: nth(y, 5, 0, 2) }),
  'Italia': (y) => ({ month: 5, day: nth(y, 5, 0, 2) })
};

export function mothersDay(year, country) {
  const f = MOTHERS[country];
  return f ? f(year) : null;
}

export function verifiedWorldDays() {
  return WORLD_DAYS.filter(
    (d) => d.verified === true && d.sources.length > 0 && d.ideas.amiga && d.ideas.flirt && d.ideas.pareja
  );
}

// Entradas que caen en una fecha concreta para un país (país null = sin filtro por país).
export function worldDaysOn(todayISO, country = null) {
  const year = +todayISO.slice(0, 4);
  const md = todayISO.slice(5);
  return verifiedWorldDays().filter((d) => {
    if (d.onlyCountries && !(country && d.onlyCountries.includes(country))) return false;
    if (d.excludeCountries && country && d.excludeCountries.includes(country)) return false;
    const f = d.rule ? d.rule(year) : d.fixed;
    return `${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}` === md;
  });
}
