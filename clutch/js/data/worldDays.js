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
const UN = 'https://www.un.org/en/observances/list-days-weeks'; // lista oficial de días internacionales de la ONU
const V2 = '2026-10-22';

// Año Nuevo Chino (luna nueva entre el 21 de enero y el 20 de febrero). Fechas coincidentes en dos fuentes.
const LUNAR_NEW_YEAR = { 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19], 2035: [2, 8] };

const day = (id, month, dayN, es, tags, needsTaste, ideas, extra = {}) => ({
  id, fixed: { month, day: dayN }, name: { es }, tags, needsTaste, ideas, verified: true, verifiedAt: V2, sources: [UN], ...extra
});

export const WORLD_DAYS = [
  {
    id: 'pasta', fixed: { month: 10, day: 25 }, name: { es: 'Día Mundial de la Pasta' },
    tags: ['pasta', 'italiano', 'comida', 'cocinar'], needsTaste: false,
    ideas: {
      amiga: 'hoy es el Día Mundial de la Pasta. Te debo una cena de pasta, tú eliges el sitio.',
      flirt: 'hoy es el Día Mundial de la Pasta. Yo cocino, tú eliges la salsa. ¿Trato?',
      pareja: 'hoy es el Día Mundial de la Pasta. Cena en casa: yo cocino y tú eliges la salsa.'
    },
    verified: true, verifiedAt: V, sources: ['https://www.ansa.it/english/news/lifestyle/food_wine/2016/10/25/world-pasta-day-celebrates-italy-symbol_0df19843-2317-47f0-afaf-ce50f271735a.html']
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

// Ampliación 22-oct-2026: días de la lista oficial de la ONU que dan pie a un plan o a un mensaje cercano.
// Los solemnes (víctimas, enfermedades, conflictos) no se usan para esto.
WORLD_DAYS.push(
  day('forests', 3, 21, 'Día Internacional de los Bosques', ['naturaleza', 'senderismo', 'montaña', 'campo', 'monte'], true, {
    amiga: 'hoy es el Día Internacional de los Bosques. ¿Ruta por el monte un finde de estos?',
    flirt: 'hoy es el Día Internacional de los Bosques. ¿Te apetece una ruta por el monte un día de estos?',
    pareja: 'hoy es el Día Internacional de los Bosques. Este finde, ruta por el monte los dos.'
  }),
  day('sport', 4, 6, 'Día Internacional del Deporte para el Desarrollo y la Paz', ['deporte', 'correr', 'running', 'gimnasio', 'gym', 'pádel', 'padel'], true, {
    amiga: 'hoy es el Día Internacional del Deporte. ¿Entrenamos juntos un día de estos?',
    flirt: 'hoy es el Día Internacional del Deporte. Te reto a algo: tú eliges el deporte.',
    pareja: 'hoy es el Día Internacional del Deporte. ¿Salimos a movernos un rato juntos esta tarde?'
  }),
  day('wellness', 4, 15, 'Día Internacional del Bienestar', ['spa', 'relax', 'bienestar'], false, {
    amiga: 'hoy es el Día Internacional del Bienestar. Hoy toca cuidarse un poco, que te lo mereces.',
    flirt: 'hoy es el Día Internacional del Bienestar. Propón algo tranquilo que te apetezca y me apunto.',
    pareja: 'hoy es el Día Internacional del Bienestar. Esta noche, plan relax: yo me encargo de todo.'
  }),
  day('families', 5, 15, 'Día Internacional de las Familias', [], false, {
    amiga: 'hoy es el Día Internacional de las Familias. ¿Cómo está la tuya?',
    flirt: 'hoy es el Día Internacional de las Familias. ¿Cómo está la tuya? Me gusta que me cuentes.',
    pareja: 'hoy es el Día Internacional de las Familias. Gracias por ser la mía.'
  }),
  day('bees', 5, 20, 'Día Mundial de las Abejas', ['miel', 'naturaleza'], true, {
    amiga: 'hoy es el Día Mundial de las Abejas. Te debo un tarro de miel de la buena.',
    flirt: 'hoy es el Día Mundial de las Abejas. Excusa perfecta para invitarte a algo dulce.',
    pareja: 'hoy es el Día Mundial de las Abejas. Mañana, desayuno con miel: invito yo.'
  }),
  day('football', 5, 25, 'Día Mundial del Fútbol', ['fútbol', 'futbol'], true, {
    amiga: 'hoy es el Día Mundial del Fútbol. ¿Vemos el próximo partido juntos?',
    flirt: 'hoy es el Día Mundial del Fútbol. ¿Vemos un partido juntos? El que pierda la apuesta invita.',
    pareja: 'hoy es el Día Mundial del Fútbol. El próximo partido lo vemos juntos y yo pongo la cena.'
  }),
  day('potato', 5, 30, 'Día Internacional de la Patata', [], false, {
    amiga: 'hoy es el Día Internacional de la Patata. Esto merece una tortilla compartida.',
    flirt: 'hoy es el Día Internacional de la Patata. Debate serio: tortilla con o sin cebolla. Lo resolvemos cenando.',
    pareja: 'hoy es el Día Internacional de la Patata. Esta noche hago tortilla; tú decides si con cebolla.'
  }, { onlyCountries: ['España'] }),
  day('bicycle', 6, 3, 'Día Mundial de la Bicicleta', ['bici', 'bicicleta', 'ciclismo'], true, {
    amiga: 'hoy es el Día Mundial de la Bicicleta. ¿Una ruta en bici un día de estos?',
    flirt: 'hoy es el Día Mundial de la Bicicleta. ¿Te apetece una vuelta en bici juntos?',
    pareja: 'hoy es el Día Mundial de la Bicicleta. Este finde, paseo en bici los dos.'
  }),
  day('environment', 6, 5, 'Día Mundial del Medio Ambiente', ['naturaleza', 'ecología', 'ecologia', 'campo'], true, {
    amiga: 'hoy es el Día Mundial del Medio Ambiente. ¿Un plan al aire libre esta semana?',
    flirt: 'hoy es el Día Mundial del Medio Ambiente. ¿Un plan al aire libre? Tú eliges el sitio.',
    pareja: 'hoy es el Día Mundial del Medio Ambiente. Plan al aire libre este finde, sin móviles.'
  }),
  day('oceans', 6, 8, 'Día Mundial de los Océanos', ['playa', 'mar', 'surf', 'buceo', 'nadar'], true, {
    amiga: 'hoy es el Día Mundial de los Océanos. ¿Nos escapamos a la playa un día?',
    flirt: 'hoy es el Día Mundial de los Océanos. Me apetece ver el mar contigo. ¿Te animas un día de estos?',
    pareja: 'hoy es el Día Mundial de los Océanos. Este finde nos escapamos a ver el mar.'
  }),
  day('play', 6, 11, 'Día Internacional del Juego', ['juegos', 'juegos de mesa'], false, {
    amiga: 'hoy es el Día Internacional del Juego. ¿Partida a algo un día de estos? Prepárate para perder.',
    flirt: 'hoy es el Día Internacional del Juego. Te reto a una partida a lo que elijas. El que pierda invita.',
    pareja: 'hoy es el Día Internacional del Juego. Esta noche, juego de mesa y sin móviles.'
  }),
  day('gastronomy', 6, 18, 'Día de la Gastronomía Sostenible', ['cocinar', 'cocina', 'comida'], true, {
    amiga: 'hoy es el Día de la Gastronomía Sostenible. ¿Cocinamos algo juntos un día?',
    flirt: 'hoy es el Día de la Gastronomía Sostenible. ¿Te apetece que cocinemos algo juntos?',
    pareja: 'hoy es el Día de la Gastronomía Sostenible. Esta noche cocinamos juntos algo nuevo.'
  }),
  day('horse', 7, 11, 'Día Mundial del Caballo', ['caballos', 'caballo', 'equitación', 'equitacion', 'hípica', 'hipica'], true, {
    amiga: 'hoy es el Día Mundial del Caballo. ¿Una ruta a caballo algún día?',
    flirt: 'hoy es el Día Mundial del Caballo. ¿Te apetece una ruta a caballo un día de estos?',
    pareja: 'hoy es el Día Mundial del Caballo. ¿Y si nos vamos de ruta a caballo un finde?'
  }),
  day('moon', 7, 20, 'Día Internacional de la Luna', [], false, {
    amiga: 'hoy es el Día Internacional de la Luna. Esta noche, mira al cielo un momento.',
    flirt: 'hoy es el Día Internacional de la Luna. Buena excusa para dar un paseo de noche. ¿Te apuntas?',
    pareja: 'hoy es el Día Internacional de la Luna. Esta noche, paseo bajo la luna los dos.'
  }),
  day('chess', 7, 20, 'Día Mundial del Ajedrez', ['ajedrez'], true, {
    amiga: 'hoy es el Día Mundial del Ajedrez. ¿Una partida un día de estos?',
    flirt: 'hoy es el Día Mundial del Ajedrez. Te reto a una partida; el que pierda invita a algo.',
    pareja: 'hoy es el Día Mundial del Ajedrez. Esta noche, partida. Prepárate.'
  }),
  day('tourism', 9, 27, 'Día Mundial del Turismo', ['viajar', 'viajes', 'turismo'], true, {
    amiga: 'hoy es el Día Mundial del Turismo. ¿Cuál es el próximo viaje que tienes en mente?',
    flirt: 'hoy es el Día Mundial del Turismo. Si pudieras viajar mañana a cualquier sitio, ¿adónde irías?',
    pareja: 'hoy es el Día Mundial del Turismo. Empecemos a planear nuestro próximo viaje. ¿Adónde te apetece?'
  }),
  day('mental-health', 10, 10, 'Día Mundial de la Salud Mental', [], false, {
    amiga: 'hoy es el Día Mundial de la Salud Mental. Solo quería preguntarte cómo estás de verdad.',
    flirt: 'hoy es el Día Mundial de la Salud Mental. ¿Cómo estás tú de verdad? Me importa.',
    pareja: 'hoy es el Día Mundial de la Salud Mental. ¿Cómo estás de verdad? Hoy te escucho sin prisa.'
  }),
  day('food', 10, 16, 'Día Mundial de la Alimentación', [], false, {
    amiga: 'hoy es el Día Mundial de la Alimentación. ¿Comemos juntos esta semana?',
    flirt: 'hoy es el Día Mundial de la Alimentación. ¿Una comida juntos esta semana? Tú eliges el sitio.',
    pareja: 'hoy es el Día Mundial de la Alimentación. Esta noche cocino lo que te apetezca.'
  }),
  day('med-diet', 11, 16, 'Día Internacional de la Dieta Mediterránea', ['cocina', 'cocinar', 'comida', 'mediterránea', 'mediterranea'], true, {
    amiga: 'hoy es el Día Internacional de la Dieta Mediterránea. ¿Cena mediterránea un día de estos?',
    flirt: 'hoy es el Día Internacional de la Dieta Mediterránea. ¿Te invito a una cena mediterránea?',
    pareja: 'hoy es el Día Internacional de la Dieta Mediterránea. Esta noche cocino yo algo mediterráneo.'
  }),
  day('tv', 11, 21, 'Día Mundial de la Televisión', ['series', 'películas', 'peliculas', 'cine', 'tele'], true, {
    amiga: 'hoy es el Día Mundial de la Televisión. ¿Qué serie me recomiendas?',
    flirt: 'hoy es el Día Mundial de la Televisión. ¿Qué serie me recomiendas? Si me engancha, te debo una.',
    pareja: 'hoy es el Día Mundial de la Televisión. Esta noche, sofá y una serie a tu elección.'
  }),
  day('mountains', 12, 11, 'Día Internacional de las Montañas', ['montaña', 'montana', 'senderismo', 'nieve', 'esquí', 'esqui'], true, {
    amiga: 'hoy es el Día Internacional de las Montañas. ¿Escapada a la montaña un finde?',
    flirt: 'hoy es el Día Internacional de las Montañas. ¿Te apetece una escapada a la montaña?',
    pareja: 'hoy es el Día Internacional de las Montañas. Escapada a la montaña pronto: tú eliges cuándo.'
  }),
  day('meditation', 12, 21, 'Día Mundial de la Meditación', ['meditación', 'meditacion', 'yoga', 'mindfulness'], true, {
    amiga: 'hoy es el Día Mundial de la Meditación. Hoy toca un rato de calma.',
    flirt: 'hoy es el Día Mundial de la Meditación. Respira hondo y desconecta un rato, que te lo mereces.',
    pareja: 'hoy es el Día Mundial de la Meditación. Esta noche, un rato de calma los dos.'
  }),
  day('basketball', 12, 21, 'Día Mundial del Baloncesto', ['baloncesto', 'basket', 'nba'], true, {
    amiga: 'hoy es el Día Mundial del Baloncesto. ¿Vemos un partido un día de estos?',
    flirt: 'hoy es el Día Mundial del Baloncesto. ¿Un partido juntos? El que pierda la apuesta invita.',
    pareja: 'hoy es el Día Mundial del Baloncesto. El próximo partido lo vemos juntos.'
  }),
  {
    id: 'lunar-new-year', rule: (y) => (LUNAR_NEW_YEAR[y] ? { month: LUNAR_NEW_YEAR[y][0], day: LUNAR_NEW_YEAR[y][1] } : null),
    name: { es: 'Año Nuevo Chino' }, tags: [], needsTaste: false,
    ideas: {
      amiga: 'hoy empieza el Año Nuevo Chino. Que el nuevo año te traiga suerte.',
      flirt: 'hoy es el Año Nuevo Chino. Buena excusa para cenar comida china, ¿no?',
      pareja: 'hoy empieza el Año Nuevo Chino. Lo celebramos con una cena especial.'
    },
    verified: true, verifiedAt: V2, sources: ['https://www.topmarks.co.uk/chinese-new-year/when-is-chinese-new-year', 'https://www.chinatravel.com/chinese-new-year/date']
  }
);

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
    if (!f) return false; // p. ej. Año Nuevo Chino fuera de la tabla
    return `${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}` === md;
  });
}
