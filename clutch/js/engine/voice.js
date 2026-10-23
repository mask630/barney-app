// Voz del mensaje: el mismo dato se dice distinto según tramo de edad y registro (flirt / pareja).
// Que suene a WhatsApp de verdad y no a tarjeta: casi nunca se empieza por su nombre (nadie le escribe así a su pareja),
// los más jóvenes empiezan en minúscula y sin punto final, y los emojis salen solo a veces.
// La variante (saludo y cierre) sale fija para cada mensaje, para que el mismo texto no cambie al volver a la pantalla.

import { STAGE_GROUP, ageBand, ageOn } from '../core/stages.js';

const OPENERS = {
  '18-24': { flirt: ['', '', '', 'oye, ', 'ey, '], pareja: ['', '', '', 'oye, '] },
  '25-34': { flirt: ['', '', '', 'oye, '], pareja: ['', '', '', 'oye, '] },
  '35-49': { flirt: ['', '', 'oye, '], pareja: ['', '', 'cariño, '] },
  '50+': { flirt: ['', '', 'hola, '], pareja: ['', 'cariño, ', 'mi amor, '] }
};

const CLOSERS = {
  '18-24': { flirt: ['', '', ' 😏', ' jaja'], pareja: ['', '', ' ❤️', ' 🥰'] },
  '25-34': { flirt: ['', '', ' 😉', ' 😊'], pareja: ['', '', ' ❤️', ' 🤍'] },
  '35-49': { flirt: ['', '', ' 😊'], pareja: ['', '', ' Un beso.'] },
  '50+': { flirt: ['', ' Un beso.'], pareja: [' Un beso.', '', ' Un beso grande.'] }
};

// Los más jóvenes escriben en minúscula y sin punto final.
const CASUAL = ['18-24', '25-34'];

const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const ucFirst = (s) => s.replace(/^([¡¿"]*)(.)/u, (_, p, c) => p + c.toUpperCase());

function seed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function groupOf(stage) {
  return STAGE_GROUP[stage] || null;
}

// Compone el mensaje final. `text` es el cuerpo (en minúscula inicial o no). `name` solo sirve para variar la elección.
export function compose({ text, name, band, group }) {
  const openers = OPENERS[band]?.[group];
  const closers = CLOSERS[band]?.[group];
  if (!text || !openers || !closers) return null;
  const h = seed(`${String(name || '').trim()}|${text}`);
  const opener = openers[h % openers.length];
  const closer = closers[(h >>> 8) % closers.length];
  const casual = CASUAL.includes(band);
  let body = String(text).trim();
  body = opener || casual ? lcFirst(body) : ucFirst(body);
  // Sin punto final en los jóvenes (sí se quedan ? ! y …).
  if (casual) body = body.replace(/\.$/, '');
  const msg = `${opener ? (casual ? opener : ucFirst(opener)) : ''}${body}${closer}`;
  return msg.replace(/\s{2,}/g, ' ').trim();
}

export function bandFor(birthISO, todayISO) {
  return ageBand(ageOn(birthISO, todayISO));
}
