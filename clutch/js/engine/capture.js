// Apuntar: clasifica una nota de texto en un destino fijo. Si no está claro, va a la Bandeja.
// Destinos: gustos, evitar, tallas, regalos, eventos, recordar, bandeja.
// Se busca sin tildes ni mayúsculas (texto «plegado», misma longitud que el original), y el valor se recorta
// del texto original para que la lista quede limpia: «Odia el cilantro» → Evitar: «el cilantro».

import { addDays, parseISO } from '../core/dates.js';

const MONTHS = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const WEEKDAYS = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0 };

export const DESTINATIONS = ['gustos', 'evitar', 'tallas', 'regalos', 'eventos', 'recordar', 'bandeja'];
export const DEST_LABEL = {
  gustos: 'Gustos', evitar: 'Evitar', tallas: 'Tallas', regalos: 'Regalos',
  eventos: 'Eventos', recordar: 'Recordar', bandeja: 'Bandeja'
};

// Minúsculas y sin tildes, misma longitud que el original (en NFC), para poder recortar por posición.
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clean = (s) => s.trim().replace(/^[,:;\-–—\s]+/, '').replace(/[.!,;:\s]+$/, '').replace(/^["“'«]|["”'»]$/g, '').replace(/\s{2,}/g, ' ').trim();
const ucFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function validMD(month, day) {
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
}

// Fechas: «el 12 de marzo», «12 de marzo de 2027», «12/03», «12/03/2027» y, si se pasa el día de hoy,
// también «hoy», «mañana», «pasado mañana», «el viernes», «este finde», «dentro de 3 días».
export function parseDate(text, todayISO = null) {
  const t = fold(String(text));
  let m = /\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))?/.exec(t);
  if (m && MONTHS[m[2]]) {
    const day = +m[1], month = MONTHS[m[2]];
    if (validMD(month, day)) return { day, month, year: m[3] ? +m[3] : null, match: text.slice(m.index, m.index + m[0].length) };
  }
  m = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/.exec(t);
  if (m) {
    const day = +m[1], month = +m[2];
    let year = m[3] ? +m[3] : null;
    if (year != null && year < 100) year += 2000;
    if (validMD(month, day)) return { day, month, year, match: text.slice(m.index, m.index + m[0].length) };
  }
  if (!todayISO || !parseISO(todayISO)) return null;
  const at = (iso, mm) => ({ day: +iso.slice(8, 10), month: +iso.slice(5, 7), year: +iso.slice(0, 4), match: text.slice(mm.index, mm.index + mm[0].length), relative: true });
  // «mañana» como día, no «por la mañana» ni «cada mañana»
  if ((m = /\bpasado\s+manana\b/.exec(t))) return at(addDays(todayISO, 2), m);
  if ((m = /(?<!\b(?:la|esta|cada|una|las|por)\s)\bmanana\b/.exec(t))) return at(addDays(todayISO, 1), m);
  if ((m = /\b(?:dentro\s+de|en)\s+(\d{1,2})\s+dias\b/.exec(t))) return at(addDays(todayISO, +m[1]), m);
  const dow = parseISO(todayISO).getUTCDay();
  if ((m = /\b(?:(?:el|este|esta)\s+)?(?:proximo\s+)?(?:fin\s+de\s+semana|finde)\b/.exec(t)) && /\b(este|esta|el|proximo)\b/.test(m[0])) {
    return at(addDays(todayISO, (6 - dow + 7) % 7 || 7), m);
  }
  if ((m = /\b(?:el|este|esta|el\s+proximo|este\s+proximo|proximo)\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.exec(t))) {
    return at(addDays(todayISO, (WEEKDAYS[m[1]] - dow + 7) % 7 || 7), m);
  }
  if ((m = /(?<!\b(?:los|las|al|del|de)\s)\bhoy\b/.exec(t)) && /\b(tiene|hay|es|va|se)\b/.test(t)) return at(todayISO, m);
  return null;
}

// Varias cosas en un mismo texto: una por línea, o separadas por punto y coma o por punto.
export function splitNotes(text) {
  return String(text || '')
    .split(/\n+|;\s*|\.\s+(?=\S)/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/[.\s]/g, '').length > 1);
}

// Tallas: prenda → palabras (sin tildes).
const CLOTHING = {
  anillo: /anillo|sortija/,
  sujetador: /sujetador|brasier|sosten|bra\b/,
  braguita: /braguita|bragas|tanga|culotte/,
  camiseta: /camiseta|camisa|blusa|\btop\b|jersey|sudadera|chaqueta|abrigo|cazadora/,
  pantalón: /pantalon|vaquero|jeans|leggins|mallas/,
  calzado: /zapat|calzado|zapatilla|deportiva|bota|sandalia|tacon|\bpie\b|\bcalza\b/,
  vestido: /vestido|falda|mono\b/,
  pulsera: /pulsera|muneca/,
  collar: /collar|cuello/
};
const SIZE_TRIGGER = /\btalla\b|\bcalza\b|\bnumero\b|\b(?:usa|lleva|gasta|tiene)\s+(?:la|una|un|el)\b|\bes\s+(?:la|una|un)\s+(?=\d|xx?[sl]\b|[sml]\b)/;
const SIZE_TOKEN = /\b(\d{2,3}\s?[a-h]{1,2}|\d{1,2}(?:[.,]5)?|xxs|xs|s|m|l|xl|xxl|xxxl)\b/;

function findSize(t) {
  const trig = SIZE_TRIGGER.exec(t);
  const clothing = Object.entries(CLOTHING).find(([, re]) => re.test(t));
  if (!trig && !clothing) return null;
  if (!trig) {
    // Sin «talla»: solo si la prenda va pegada a un número («pie 38», «sujetador 90B»)
    const re = new RegExp(`(?:${clothing[1].source})\\w*\\s+(?:del?\\s+|un\\s+|una\\s+|la\\s+|el\\s+)?(\\d{2,3}\\s?[a-h]{0,2})\\b`);
    const m = re.exec(t);
    return m ? { field: clothing[0], value: m[1] } : null;
  }
  const after = SIZE_TOKEN.exec(t.slice(trig.index + trig[0].length));
  const before = SIZE_TOKEN.exec(t.slice(0, trig.index));
  const value = (after || before)?.[1];
  if (!value) return null;
  return { field: clothing ? clothing[0] : /\bcalza\b/.test(t) ? 'calzado' : null, value };
}

// Recorta del texto original lo que viene después de `m` (un resultado de regex sobre el texto plegado).
const rest = (raw, m) => clean(raw.slice(m.index + m[0].length));
const LEAD = /^(?:a\s+ella\s+|ella\s+)/i;

const AVOID_STRIP = /\b(?:no\s+le\s+gustan?(?:\s+nada)?|no\s+le\s+hacen?\s+gracia|odia|detesta|no\s+soporta|no\s+aguanta|no\s+tolera|le\s+da\s+(?:mucho\s+)?(?:asco|grima|miedo|panico|repelus)|le\s+dan\s+(?:mucho\s+)?(?:asco|grima|miedo|panico)|le\s+(?:molesta|molestan|agobia|agobian|cabrea|cabrean|enfada|enfadan|revienta|revientan|ponen?\s+nerviosa|sienta\s+mal|sientan\s+mal)|tiene\s+(?:miedo|fobia|panico)\s+(?:a|de)|nada\s+de|ni\s+se\s+te\s+ocurra|evitar?)\b/;
const AVOID_KEEP = /\b(?:alergi|alergica|intoleran|celiac|vegana|vegetariana|no\s+come|no\s+bebe|no\s+toma|no\s+puede\s+(?:comer|beber|tomar)|fobia|no\s+quiere\s+que)/;

const GIFT_STRIP = /\b(?:le\s+(?:haria|hace|hacia|hara)\s+(?:mucha\s+)?ilusion|le\s+encantaria|le\s+gustaria(?:\s+tener)?|quiere|se\s+quiere\s+comprar|se\s+(?:lo|la)?\s*compraria|desea|ha\s+visto|estaba\s+mirando|necesita|le\s+falta|suena\s+con|siempre\s+ha\s+querido|tiene\s+ganas\s+de|le\s+apetece\s+(?:mucho\s+)?(?=ir|probar|ver|hacer|visitar))\b/;
const GIFT_KEEP = /\b(?:regalo|regalarle|lista\s+de\s+deseos|se\s+le\s+ha\s+roto|se\s+le\s+rompio|ha\s+perdido)/;

const LIKE = /\b(?:le\s+(?:gustan?|encantan?|flipan?|apasionan?|chiflan?|molan?|pirran?|privan?|pierden?|vuelven?\s+locas?)|es\s+(?:muy\s+)?fan\s+de|adora|disfruta\s+(?:mucho\s+)?(?:con|de)?|prefiere|suele\s+(?:pedir|tomar|beber|comer)|siempre\s+(?:pide|toma|bebe|come)|es\s+muy\s+de)\b/;
const FAVORITE = /\bsus?\s+((?:[a-z]+\s+){0,2}?[a-z]+)\s+favorit[oa]s?\s+(?:es|son|era|eran)?\s*/;

const REMEMBER = /\b(?:recuerda|recordar|no\s+olvides|no\s+olvidar|acordarme|acuerdate|importante|se\s+llama|su\s+(?:madre|padre|hermana|hermano|abuela|abuelo|tia|tio|prima|primo|hija|hijo|sobrin[oa]|mejor\s+amiga|amiga|amigo|jefa|jefe|compi|companera|perro|perra|gato|gata|mascota|ex)\b|trabaja|estudia|vive\s+en|nacio\s+en|es\s+de\s+[A-ZÁÉÍÓÚÑ]|esta\s+(?:mala|enferma|agobiada|preocupada|nerviosa|triste)|le\s+operan|le\s+operaron|tiene\s+(?:un|una|dos|tres)\s+(?:perro|perra|gato|gata|hij[oa]s?|herman[oa]s?))/;

const EVENT_WORDS = /(cumple|aniversario|concierto|cita|viaje|boda|examen|entrevista|fiesta|cena|comida|obra|festival|evento|santo|onomastica|reserva|medico|dentista|operacion|vuelo|partido|presentacion|oposicion|bautizo|comunion|despedida|mudanza|clase)/;

// Limpia el texto de un evento: quita la fecha y los verbos de relleno («tiene una entrevista el viernes» → «Entrevista»).
function eventText(raw, date) {
  let s = raw.replace(date.match, ' ').replace(/^\s*(?:el|la|este|esta)\s+(?=\S)/i, '');
  s = s.replace(/\b(?:el|para el|del|de|es el|es|a|en|que es el|que es)\s*$/i, '');
  s = clean(s).replace(/\s+(?:el|del|de|es|es el|para el)$/i, '');
  s = s.replace(/^(?:ella\s+)?(?:tiene|hay|va\s+a|se\s+va\s+de|se\s+va\s+a|se\s+va|es)\s+/i, '').replace(/^(?:un|una|el|la|los|las)\s+/i, '');
  return ucFirst(clean(s));
}

const FILLER = /\b(luego|pensar|mirar|hacer|comprar|llamar|preguntar|acordarme|tengo|tenemos|que|esto|eso|mmm|algo|cosa)\b/;

// Devuelve { dest, value, field?, date?, confidence } — confidence: 'alta' | 'media' | 'baja'.
export function classify(input, todayISO = null) {
  const raw = String(input || '').normalize('NFC').trim();
  if (!raw) return { dest: 'bandeja', value: '', confidence: 'baja' };
  const t = fold(raw);
  let m;

  // 1. Tallas: «su anillo es una talla 14», «calza un 38», «talla M de camiseta», «pie 38», «sujetador 90B»
  const size = findSize(t);
  if (size) {
    const value = size.value.toUpperCase().replace(',', '.').replace(/\s+/g, '');
    return size.field ? { dest: 'tallas', field: size.field, value, confidence: 'alta' } : { dest: 'tallas', field: null, value, confidence: 'media' };
  }

  // 2. Evitar
  if ((m = AVOID_STRIP.exec(t))) return { dest: 'evitar', value: rest(raw, m).replace(LEAD, '') || clean(raw), confidence: 'alta' };
  if (AVOID_KEEP.test(t)) return { dest: 'evitar', value: ucFirst(clean(raw).replace(/^(?:ella\s+)?es\s+/i, '')), confidence: 'alta' };

  // 3. Eventos con fecha (también «mañana», «el viernes»… si se sabe qué día es hoy)
  const date = parseDate(raw, todayISO);
  // «le gusta salir el viernes» es un gusto, no un evento
  if (date && !(date.relative && LIKE.test(t))) {
    const value = eventText(raw, date) || clean(raw);
    return { dest: 'eventos', value, date, confidence: EVENT_WORDS.test(t) ? 'alta' : 'media' };
  }

  // 4. Regalos
  if ((m = GIFT_STRIP.exec(t))) return { dest: 'regalos', value: rest(raw, m).replace(LEAD, '') || clean(raw), confidence: 'alta' };
  if (GIFT_KEEP.test(t)) return { dest: 'regalos', value: clean(raw), confidence: 'alta' };

  // 5. Gustos: «su serie favorita es The Office» → «serie favorita: The Office»
  if ((m = FAVORITE.exec(t))) {
    const what = raw.slice(m.index, m.index + m[0].length).replace(/^sus?\s+/i, '').replace(/\s+(?:es|son|era|eran)\s*$/i, '').trim();
    const v = rest(raw, m);
    return { dest: 'gustos', value: v ? `${what.toLowerCase()}: ${v}` : clean(raw), confidence: v ? 'alta' : 'media' };
  }
  if ((m = LIKE.exec(t))) {
    const v = rest(raw, m).replace(LEAD, '');
    return { dest: 'gustos', value: v || clean(raw), confidence: v ? 'alta' : 'media' };
  }

  // 6. Recordar: personas de su vida, trabajo, cosas que no hay que olvidar
  if (REMEMBER.test(t) || /\bes\s+de\s+[A-ZÁÉÍÓÚÑ]/.test(raw)) return { dest: 'recordar', value: ucFirst(clean(raw)), confidence: 'alta' };

  // 7. Dos o tres palabras sueltas («sushi», «flores amarillas», «Coldplay»): casi siempre es algo que le gusta
  const words = clean(raw).split(/\s+/);
  if (words.length <= 3 && !/\d/.test(t) && !FILLER.test(t)) return { dest: 'gustos', value: clean(raw), confidence: 'media' };

  return { dest: 'bandeja', value: clean(raw), confidence: 'baja' };
}

// Aplica una clasificación (ya confirmada por el usuario) al perfil. Devuelve un perfil nuevo.
export function applyToProfile(profile, c, id, todayISO) {
  const p = structuredClone(profile);
  const value = (c.value || '').trim();
  if (!value) return p;
  const has = (list, v) => list.some((x) => fold(typeof x === 'string' ? x : x.text) === fold(v));
  switch (c.dest) {
    case 'gustos': {
      // «Coldplay» o «Harry Styles» se quedan así; «El sushi» pasa a «el sushi».
      const proper = /^[A-ZÁÉÍÓÚÑ]/.test(value) && !/^(El|La|Los|Las|Un|Una|Unos|Unas|Le|Su|Sus)\b/.test(value);
      const v = proper ? value : value.charAt(0).toLowerCase() + value.slice(1);
      if (!has(p.tastes, v)) p.tastes.push(v);
      break;
    }
    case 'evitar':
      if (!has(p.avoid, value)) p.avoid.push(value);
      break;
    case 'tallas':
      p.sizes[(c.field || 'talla').toLowerCase()] = value;
      break;
    case 'regalos':
      if (!has(p.gifts, value)) p.gifts.push({ id, text: value, at: todayISO });
      break;
    case 'eventos':
      if (c.date) {
        const yearly = /(cumple|aniversario|santo|onom)/i.test(value) && !c.date.year;
        // Sin año y sin ser anual (un concierto, un examen): es la próxima vez que caiga esa fecha.
        let year = c.date.year;
        if (!yearly && !year && todayISO) {
          const y = +todayISO.slice(0, 4);
          const md = `${String(c.date.month).padStart(2, '0')}-${String(c.date.day).padStart(2, '0')}`;
          year = `${y}-${md}` >= todayISO ? y : y + 1;
        }
        p.events.push({ id, text: value, month: c.date.month, day: c.date.day, year: year || null, yearly });
      } else {
        p.remember.push({ id, text: value, at: todayISO });
      }
      break;
    case 'recordar':
      if (!has(p.remember, value)) p.remember.push({ id, text: value, at: todayISO });
      break;
    default:
      break;
  }
  return p;
}
