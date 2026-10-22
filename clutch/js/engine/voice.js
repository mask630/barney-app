// Voz del mensaje: el mismo dato se dice distinto según tramo de edad y registro (amiga / flirt / pareja).

import { STAGE_GROUP, ageBand, ageOn } from '../core/stages.js';

const OPENERS = {
  '18-24': { amiga: 'Oye {n}, ', flirt: 'Oye {n}… ', pareja: 'Hey {n}, ' },
  '25-34': { amiga: 'Hola {n}, ', flirt: 'Hola {n}, ', pareja: '{n}, ' },
  '35-49': { amiga: 'Hola {n}. ', flirt: 'Hola {n}. ', pareja: '{n}, ' },
  '50+': { amiga: 'Hola, {n}. ', flirt: 'Hola, {n}. ', pareja: 'Querida {n}, ' }
};

const NO_NAME_OPENER = { '18-24': 'Oye, ', '25-34': 'Hola, ', '35-49': 'Hola, ', '50+': 'Hola, ' };

const CLOSERS = {
  '18-24': { amiga: ' jaja', flirt: ' 😏', pareja: ' ❤️' },
  '25-34': { amiga: '', flirt: ' 😉', pareja: ' 🤍' },
  '35-49': { amiga: '', flirt: '', pareja: ' Un beso.' },
  '50+': { amiga: ' Un abrazo.', flirt: ' Un beso.', pareja: ' Un beso grande.' }
};

const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

export function groupOf(stage) {
  return STAGE_GROUP[stage] || null;
}

// Compone el mensaje final. `text` es el cuerpo del dato (ya en minúscula inicial o no).
export function compose({ text, name, band, group }) {
  if (!text || !OPENERS[band] || CLOSERS[band]?.[group] === undefined) return null;
  const hasName = typeof name === 'string' && name.trim().length > 0;
  const opener = hasName ? OPENERS[band][group].replace('{n}', name.trim()) : NO_NAME_OPENER[band];
  const endsSoft = /[,…]\s$/.test(opener);
  const body = endsSoft ? lcFirst(text) : text.charAt(0).toUpperCase() + text.slice(1);
  const msg = `${opener}${body}${CLOSERS[band][group]}`;
  return msg.replace(/\s{2,}/g, ' ').trim();
}

export function bandFor(birthISO, todayISO) {
  return ageBand(ageOn(birthISO, todayISO));
}
