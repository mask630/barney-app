// Etapas de la relación y tramos de edad.
// Regla dura de producto: solo se admiten perfiles de 18 años o más.

import { parseISO } from './dates.js';

export const STAGES = ['rollo', 'citas', 'pareja', 'matrimonio'];

// Etapas retiradas (Clutch es para cuidar una relación afectiva): las fichas antiguas pasan a Rollo, sin perder nada.
export const LEGACY_STAGE = { amiga: 'rollo', objetivo: 'rollo' };

export const STAGE_LABEL = {
  es: { rollo: 'Rollo', citas: 'Citas', pareja: 'Pareja', matrimonio: 'Matrimonio' }
};

// Dos registros de contenido:
//  - flirt: rollo y citas (ligero y con chispa).
//  - pareja: pareja y matrimonio (cariño, cuidado, constancia).
export const STAGE_GROUP = {
  rollo: 'flirt',
  citas: 'flirt',
  pareja: 'pareja',
  matrimonio: 'pareja'
};

// Etapas en las que tiene sentido una fecha de inicio de la relación (hitos).
export const STAGES_WITH_MILESTONES = ['citas', 'pareja', 'matrimonio'];

export const MIN_AGE = 18;
export const AGE_BANDS = ['18-24', '25-34', '35-49', '50+'];

export function ageOn(birthISO, onISO) {
  const b = parseISO(birthISO);
  const o = parseISO(onISO);
  if (!b || !o) return null;
  let age = o.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    o.getUTCMonth() < b.getUTCMonth() ||
    (o.getUTCMonth() === b.getUTCMonth() && o.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

// Devuelve null si la edad es desconocida o menor de 18.
export function ageBand(age) {
  if (age == null || !Number.isFinite(age) || age < MIN_AGE) return null;
  if (age <= 24) return '18-24';
  if (age <= 34) return '25-34';
  if (age <= 49) return '35-49';
  return '50+';
}

// Tramo de edad de una ficha: por su fecha de nacimiento si la hay; si no, la edad aproximada que eligió el usuario.
// null = sin edad válida (o menor de 18): la ficha no se puede usar.
export function profileBand(profile, todayISO) {
  if (profile?.birth) { const a = checkAdult(profile.birth, todayISO); return a.ok ? a.band : null; }
  return AGE_BANDS.includes(profile?.band) ? profile.band : null;
}

export function isValidStage(stage) {
  return STAGES.includes(stage);
}

// Un perfil es utilizable solo si tiene fecha de nacimiento válida y es adulto.
export function checkAdult(birthISO, onISO) {
  const age = ageOn(birthISO, onISO);
  if (age == null) return { ok: false, reason: 'fecha-invalida' };
  if (age < MIN_AGE) return { ok: false, reason: 'menor-de-edad', age };
  return { ok: true, age, band: ageBand(age) };
}
