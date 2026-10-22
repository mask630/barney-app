// Astronomía que se calcula sin conexión: Sol, Luna, signos, ascendente y horas de luz.
// Todo es cálculo real; la interpretación astrológica se presenta siempre como "según los astros".

import { DAY } from './dates.js';

const RAD = Math.PI / 180;
const norm = (d) => ((d % 360) + 360) % 360;

export const SIGNS = [
  'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
  'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'
];

export function julianDay(date) {
  return date.getTime() / DAY + 2440587.5;
}

function centuries(date) {
  return (julianDay(date) - 2451545.0) / 36525;
}

// Longitud eclíptica aparente del Sol (Meeus, cap. 25). Precisión ~0,01°.
export function sunLongitude(date) {
  const t = centuries(date);
  const L0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const M = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const C =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(M * RAD) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * M * RAD) +
    0.000289 * Math.sin(3 * M * RAD);
  const omega = 125.04 - 1934.136 * t;
  return norm(L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD));
}

// Términos principales de la longitud de la Luna (Meeus, cap. 47, tabla 47.A).
// [D, M, M', F, coeficiente en millonésimas de grado]
const MOON_TERMS = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689]
];

// Longitud eclíptica aparente de la Luna. Precisión de unas centésimas de grado.
export function moonLongitude(date) {
  const t = centuries(date);
  const Lp = 218.3164477 + 481267.88123421 * t - 0.0015786 * t * t;
  const D = (297.8501921 + 445267.1114034 * t - 0.0018819 * t * t) * RAD;
  const M = (357.5291092 + 35999.0502909 * t - 0.0001536 * t * t) * RAD;
  const Mp = (134.9633964 + 477198.8675055 * t + 0.0087414 * t * t) * RAD;
  const F = (93.272095 + 483202.0175233 * t - 0.0036539 * t * t) * RAD;
  const E = 1 - 0.002516 * t - 0.0000074 * t * t;
  let sum = 0;
  for (const [d, m, mp, f, c] of MOON_TERMS) {
    const arg = d * D + m * M + mp * Mp + f * F;
    sum += c * Math.pow(E, Math.abs(m)) * Math.sin(arg);
  }
  const A1 = (119.75 + 131.849 * t) * RAD;
  const A2 = (53.09 + 479264.29 * t) * RAD;
  sum += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp * RAD - F) + 318 * Math.sin(A2);
  const omega = 125.04452 - 1934.136261 * t;
  const nutation = -0.00478 * Math.sin(omega * RAD);
  return norm(Lp + sum / 1e6 + nutation);
}

export function signIndex(lon) {
  return Math.floor(norm(lon) / 30);
}

export function signName(lon) {
  return SIGNS[signIndex(lon)];
}

// Cerca del límite entre dos signos (por defecto a menos de 1°) no afirmamos el signo.
export function nearSignBoundary(lon, tolDeg = 1) {
  const inSign = norm(lon) % 30;
  return inSign < tolDeg || inSign > 30 - tolDeg;
}

export function moonSign(date) {
  const lon = moonLongitude(date);
  return { sign: signName(lon), lon, ambiguous: nearSignBoundary(lon) };
}

// Elongación Luna-Sol: 0 = luna nueva, 180 = luna llena.
export function elongation(date) {
  return norm(moonLongitude(date) - sunLongitude(date));
}

export function moonPhase(date) {
  const e = elongation(date);
  const illumination = (1 - Math.cos(e * RAD)) / 2;
  let name;
  if (e < 6 || e >= 354) name = 'nueva';
  else if (e < 84) name = 'creciente';
  else if (e < 96) name = 'cuarto creciente';
  else if (e < 174) name = 'gibosa creciente';
  else if (e < 186) name = 'llena';
  else if (e < 264) name = 'gibosa menguante';
  else if (e < 276) name = 'cuarto menguante';
  else name = 'menguante';
  return { name, elongation: e, illumination, waxing: e < 180 };
}

// Signo solar por fecha de nacimiento. Los días de cambio de signo varían según el año:
// si cae en el límite, lo marcamos como "cusp" y no lo afirmamos sin confirmación.
const SUN_STARTS = [
  [1, 20, 'Acuario'], [2, 19, 'Piscis'], [3, 21, 'Aries'], [4, 20, 'Tauro'],
  [5, 21, 'Géminis'], [6, 21, 'Cáncer'], [7, 23, 'Leo'], [8, 23, 'Virgo'],
  [9, 23, 'Libra'], [10, 23, 'Escorpio'], [11, 22, 'Sagitario'], [12, 22, 'Capricornio']
];

export function sunSignFromBirth(birthISO) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthISO || '');
  if (!m) return null;
  const key = +m[2] * 100 + +m[3];
  let sign = 'Capricornio'; // del 1 al 19 de enero
  for (const [mo, d, name] of SUN_STARTS) {
    if (key >= mo * 100 + d) sign = name;
  }
  const cusp = SUN_STARTS.some(([mo, d]) => key === mo * 100 + d || key === mo * 100 + d - 1);
  return { sign, cusp };
}

// Tiempo sidéreo de Greenwich en grados.
export function gmstDeg(date) {
  const jd = julianDay(date);
  const t = (jd - 2451545.0) / 36525;
  return norm(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - (t * t * t) / 38710000);
}

// Longitud eclíptica del Ascendente. lat y lon en grados (este positivo).
export function ascendantLongitude(date, latDeg, lonDeg) {
  const t = centuries(date);
  const theta = norm(gmstDeg(date) + lonDeg) * RAD;
  const eps = (23.439291 - 0.0130042 * t) * RAD;
  const phi = latDeg * RAD;
  const y = Math.cos(theta);
  const x = -(Math.sin(theta) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
  return norm(Math.atan2(y, x) / RAD);
}

// Orto, ocaso y duración del día (NOAA). Devuelve fechas UTC.
export function sunTimes(latDeg, lonDeg, date) {
  const y = date.getUTCFullYear();
  const start = Date.UTC(y, 0, 0);
  const base = Date.UTC(y, date.getUTCMonth(), date.getUTCDate());
  const doy = Math.floor((base - start) / DAY);
  const gamma = ((2 * Math.PI) / 365) * (doy - 1);
  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma);
  const cosHA = Math.cos(90.833 * RAD) / (Math.cos(latDeg * RAD) * Math.cos(decl)) - Math.tan(latDeg * RAD) * Math.tan(decl);
  if (cosHA > 1) return { polar: 'noche', sunrise: null, sunset: null, dayLengthMin: 0 };
  if (cosHA < -1) return { polar: 'dia', sunrise: null, sunset: null, dayLengthMin: 1440 };
  const ha = Math.acos(cosHA) / RAD;
  const sunriseMin = 720 - 4 * (lonDeg + ha) - eqTime;
  const sunsetMin = 720 - 4 * (lonDeg - ha) - eqTime;
  return {
    polar: null,
    sunrise: new Date(base + sunriseMin * 60000),
    sunset: new Date(base + sunsetMin * 60000),
    dayLengthMin: 8 * ha
  };
}

// Estación astronómica que empieza ese día (UTC), o null. Depende del hemisferio.
export function seasonStartingOn(dateISO, latDeg) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const a = sunLongitude(new Date(Date.UTC(y, m - 1, d, 0, 0, 0)));
  const b = sunLongitude(new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0)));
  for (const k of [0, 90, 180, 270]) {
    const crossed = k === 0 ? a > 350 && b < 10 : a < k && b >= k;
    if (!crossed) continue;
    const north = { 0: 'primavera', 90: 'verano', 180: 'otoño', 270: 'invierno' };
    const south = { 0: 'otoño', 90: 'invierno', 180: 'primavera', 270: 'verano' };
    return (latDeg >= 0 ? north : south)[k];
  }
  return null;
}
