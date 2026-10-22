// Apuntar: clasifica una nota de texto en un destino fijo. Si no está claro, va a la Bandeja.
// Destinos: gustos, evitar, tallas, regalos, eventos, recordar, bandeja.

const MONTHS = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const DESTINATIONS = ['gustos', 'evitar', 'tallas', 'regalos', 'eventos', 'recordar', 'bandeja'];
export const DEST_LABEL = {
  gustos: 'Gustos', evitar: 'Evitar', tallas: 'Tallas', regalos: 'Regalos',
  eventos: 'Eventos', recordar: 'Recordar', bandeja: 'Bandeja'
};

const clean = (s) => s.trim().replace(/[.!\s]+$/, '').replace(/^["“']|["”']$/g, '');

function validMD(month, day) {
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
}

// Detecta "el 12 de marzo", "12 de marzo de 2027", "12/03", "12/03/2027".
export function parseDate(text) {
  const t = text.toLowerCase();
  let m = /\b(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+(?:de|del)\s+(\d{4}))?/.exec(t);
  if (m && MONTHS[m[2]]) {
    const day = +m[1], month = MONTHS[m[2]];
    if (validMD(month, day)) return { day, month, year: m[3] ? +m[3] : null, match: m[0] };
  }
  m = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/.exec(t);
  if (m) {
    const day = +m[1], month = +m[2];
    let year = m[3] ? +m[3] : null;
    if (year != null && year < 100) year += 2000;
    if (validMD(month, day)) return { day, month, year, match: m[0] };
  }
  return null;
}

const CLOTHING = {
  anillo: /anillo|sortija/,
  camiseta: /camiseta|camisa|top\b|jersey|sudadera/,
  pantalón: /pantal[oó]n|vaquero|jeans/,
  calzado: /zapat|calzado|zapatilla|bota|sandalia|pie\b/,
  vestido: /vestido|falda/,
  sujetador: /sujetador|brasier|sost[eé]n/,
  pulsera: /pulsera|mu[ñn]eca/,
  collar: /collar|cuello/
};

// Devuelve { dest, label, value, field?, date?, confidence } — confidence: 'alta' | 'media' | 'baja'.
export function classify(input) {
  const raw = String(input || '').trim();
  if (!raw) return { dest: 'bandeja', value: '', confidence: 'baja' };
  const t = raw.toLowerCase();

  // 1. Tallas: "su anillo es una talla 14", "calza un 38", "talla M de camiseta"
  const size = /(?:talla|n[úu]mero|calza(?:\s+un)?|usa(?:\s+un)?)\s*(?:es\s+)?(?:un[ao]?\s+)?([0-9]{1,2}(?:[.,][05])?|xxs|xs|s|m|l|xl|xxl)\b/i.exec(raw);
  if (size) {
    let field = null;
    for (const [f, re] of Object.entries(CLOTHING)) if (re.test(t)) { field = f; break; }
    if (!field && /calza/.test(t)) field = 'calzado';
    if (field) return { dest: 'tallas', field, value: size[1].toUpperCase().replace(',', '.'), confidence: 'alta' };
    return { dest: 'tallas', field: null, value: size[1].toUpperCase(), confidence: 'media' };
  }

  // 2. Evitar
  if (/(odia|no soporta|no le gusta|alerg|alérg|intolerante|le da asco|no come|no bebe)/.test(t)) {
    return { dest: 'evitar', value: clean(raw), confidence: 'alta' };
  }

  // 3. Eventos con fecha
  const date = parseDate(raw);
  if (date && /(cumple|aniversario|concierto|cita|viaje|boda|examen|entrevista|fiesta|cena|obra|festival|evento|santo|onomástica|onomastica|reserva)/.test(t)) {
    const text = clean(raw.replace(date.match, '').replace(/\b(el|para el|del|de)\s*$/i, '').replace(/\s{2,}/g, ' ')) || clean(raw);
    return { dest: 'eventos', value: text, date, confidence: 'alta' };
  }
  if (date) return { dest: 'eventos', value: clean(raw.replace(date.match, '').replace(/\s{2,}/g, ' ')) || clean(raw), date, confidence: 'media' };

  // 4. Regalos
  if (/(regalo|le haría ilusión|le haria ilusion|le gustaría tener|quiere (?:un|una|unos|unas)|desea|se compraría|se compraria|lista de deseos)/.test(t)) {
    return { dest: 'regalos', value: clean(raw), confidence: 'alta' };
  }

  // 5. Gustos
  const like = /(?:le\s+(?:gusta|gustan|encanta|encantan|flipa|flipan|apasiona|apasionan|chifla)|es\s+fan\s+de|adora|su\s+(?:favorit[oa]|comida favorita|color favorito))\s*(?:es\s+)?(.*)/i.exec(raw);
  if (like) return { dest: 'gustos', value: clean(like[1] || raw) || clean(raw), confidence: like[1] ? 'alta' : 'media' };

  // 6. Recordar
  if (/(recuerda|recordar|no olvides|no olvidar|acordarme|acuérdate|acuerdate|importante)/.test(t)) {
    return { dest: 'recordar', value: clean(raw), confidence: 'alta' };
  }

  return { dest: 'bandeja', value: clean(raw), confidence: 'baja' };
}

// Aplica una clasificación (ya confirmada por el usuario) al perfil. Devuelve un perfil nuevo.
export function applyToProfile(profile, c, id, todayISO) {
  const p = structuredClone(profile);
  const value = (c.value || '').trim();
  if (!value) return p;
  switch (c.dest) {
    case 'gustos': {
      const v = value.toLowerCase();
      if (!p.tastes.includes(v)) p.tastes.push(v);
      break;
    }
    case 'evitar':
      if (!p.avoid.includes(value)) p.avoid.push(value);
      break;
    case 'tallas':
      p.sizes[(c.field || 'talla').toLowerCase()] = value;
      break;
    case 'regalos':
      p.gifts.push({ id, text: value, at: todayISO });
      break;
    case 'eventos':
      if (c.date) {
        const yearly = /(cumple|aniversario|santo|onom)/i.test(value) && !c.date.year;
        p.events.push({ id, text: value, month: c.date.month, day: c.date.day, year: c.date.year, yearly });
      } else {
        p.remember.push({ id, text: value, at: todayISO });
      }
      break;
    case 'recordar':
      p.remember.push({ id, text: value, at: todayISO });
      break;
    default:
      break;
  }
  return p;
}
