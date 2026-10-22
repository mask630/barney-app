// Rotación de mensajes y gestos: que ella nunca note un patrón.
// - Cada elemento tiene un esfuerzo (`e`) y, según él, unos días de descanso antes de volver a salir.
// - El descanso real varía al azar (80–150 % de la base) y cambia cada vez que se usa: nada sale "cada 7 días".
// - La elección del día es aleatoria entre los que ya han descansado, pero estable durante ese día.
// - Lo usado se guarda en el perfil (`used: { id: 'AAAA-MM-DD' }`), solo en el móvil.

import { daysBetween } from '../core/dates.js';

export const REST_DAYS = {
  // mensajes
  ligero: 10, medio: 18, alto: 35,
  // gestos
  micro: 5, cuidado: 9, cita: 14, regalo: 25
};

// Como mucho uno de estos por día: los planes y regalos pesan más si no se amontonan.
export const ONE_PER_DAY = ['alto', 'cita', 'regalo'];

// FNV-1a con mezcla final (murmur3 fmix32): sin la mezcla, textos casi iguales daban números casi iguales.
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Días de descanso tras el último uso: base del esfuerzo × un factor aleatorio fijo para ese uso.
export function restFor(item, profileId, lastUsed) {
  const r = hashStr(`${profileId}:${item.id}:${lastUsed}`) / 4294967296;
  return Math.round((REST_DAYS[item.e] || 10) * (0.8 + r * 0.7));
}

export function isRested(item, profile, todayISO) {
  const last = profile.used?.[item.id];
  return !last || daysBetween(last, todayISO) >= restFor(item, profile.id, last);
}

// Elige hasta `count` elementos para hoy, solo entre los que ya han descansado.
// Si no llegan a `min`, completa con los que más tiempo llevan sin usarse (mejor uno repetido que la pantalla vacía).
export function pickRotating(pool, profile, todayISO, count, salt = '', min = 1) {
  const order = (list) => list
    .map((it) => [hashStr(`${profile.id}:${todayISO}:${salt}:${it.id}`), it])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);
  const picked = [];
  const heavy = new Set();
  const take = (it) => {
    if (picked.length >= count || picked.includes(it)) return;
    if (ONE_PER_DAY.includes(it.e)) { if (heavy.has(it.e)) return; heavy.add(it.e); }
    picked.push(it);
  };
  // Lo usado hoy sigue en la lista de hoy (si no, desaparecería nada más copiarlo); descansa desde mañana.
  order(pool.filter((it) => profile.used?.[it.id] === todayISO || isRested(it, profile, todayISO))).forEach(take);
  if (picked.length < min) {
    const lastUse = (it) => profile.used?.[it.id] || '';
    for (const it of [...pool].sort((a, b) => lastUse(a).localeCompare(lastUse(b)))) { if (picked.length >= min) break; take(it); }
  }
  return picked;
}

export function markUsed(profile, id, todayISO) {
  return { ...profile, used: { ...(profile.used || {}), [id]: todayISO } };
}

// Deshacer un uso de hoy (p. ej. desmarcar un gesto marcado por error).
export function unmarkUsedToday(profile, id, todayISO) {
  if (profile.used?.[id] !== todayISO) return profile;
  const used = { ...profile.used };
  delete used[id];
  return { ...profile, used };
}
