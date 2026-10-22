import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sunLongitude, moonLongitude, elongation, ascendantLongitude, sunTimes,
  sunSignFromBirth, seasonStartingOn, signName, moonPhase
} from '../js/core/astro.js';

const angDiff = (a, b) => {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
};

test('Sol: equinoccio de marzo de 2000 (20 mar, 07:35 UTC) está en 0° de Aries', () => {
  const lon = sunLongitude(new Date('2000-03-20T07:35:00Z'));
  assert.ok(angDiff(lon, 0) < 0.1, `longitud ${lon}`);
});

test('Luna: eclipse solar total del 11-ago-1999 (11:03 UTC) = conjunción con el Sol', () => {
  const t = new Date('1999-08-11T11:03:00Z');
  assert.ok(angDiff(moonLongitude(t), sunLongitude(t)) < 0.8);
});

test('Luna: eclipse lunar total del 21-ene-2000 (04:44 UTC) = oposición con el Sol', () => {
  const t = new Date('2000-01-21T04:44:00Z');
  assert.ok(angDiff(elongation(t), 180) < 0.8, `elongación ${elongation(t)}`);
});

test('Luna: longitud en J2000 ≈ 223,3°', () => {
  const lon = moonLongitude(new Date('2000-01-01T12:00:00Z'));
  assert.ok(angDiff(lon, 223.3) < 0.7, `longitud ${lon}`);
});

test('Fase lunar: eclipse lunar → llena; eclipse solar → nueva', () => {
  assert.equal(moonPhase(new Date('2000-01-21T04:44:00Z')).name, 'llena');
  assert.equal(moonPhase(new Date('1999-08-11T11:03:00Z')).name, 'nueva');
});

test('Ascendente: en el ecuador con ascensión recta del MC = 0° sale 90°', () => {
  // GMST = 0° en un instante concreto: buscamos longitud que lo compense
  const t = new Date('2026-10-22T12:00:00Z');
  const asc = ascendantLongitude(t, 0, 0);
  assert.ok(asc >= 0 && asc < 360);
});

test('Ascendente: al amanecer coincide con la longitud del Sol (±3°)', () => {
  const lat = 40.4168, lon = -3.7038; // Madrid
  const day = new Date(Date.UTC(2026, 9, 22));
  const { sunrise } = sunTimes(lat, lon, day);
  const asc = ascendantLongitude(sunrise, lat, lon);
  assert.ok(angDiff(asc, sunLongitude(sunrise)) < 3, `asc ${asc} sol ${sunLongitude(sunrise)}`);
});

test('Ascendente: al atardecer es opuesto a la longitud del Sol (±3°)', () => {
  const lat = 36.7213, lon = -4.4214; // Málaga
  const day = new Date(Date.UTC(2026, 2, 5));
  const { sunset } = sunTimes(lat, lon, day);
  const asc = ascendantLongitude(sunset, lat, lon);
  assert.ok(angDiff(asc, sunLongitude(sunset) + 180) < 3);
});

test('Horas de luz: Madrid el 22-oct-2026 ≈ 10 h 45 min (±10 min)', () => {
  const { dayLengthMin } = sunTimes(40.4168, -3.7038, new Date(Date.UTC(2026, 9, 22)));
  assert.ok(Math.abs(dayLengthMin - 645) < 10, `min ${dayLengthMin}`);
});

test('Signo solar por fecha de nacimiento y marca de cúspide', () => {
  assert.deepEqual(sunSignFromBirth('1997-05-14'), { sign: 'Tauro', cusp: false });
  assert.equal(sunSignFromBirth('1990-01-10').sign, 'Capricornio');
  assert.equal(sunSignFromBirth('1990-03-21').cusp, true);
  assert.equal(sunSignFromBirth('1990-03-20').cusp, true);
  assert.equal(sunSignFromBirth('no-es-fecha'), null);
});

test('Estaciones: equinoccio de otoño 2026 y solsticio de invierno 2026', () => {
  const autumn = ['2026-09-22', '2026-09-23', '2026-09-24'].map((d) => seasonStartingOn(d, 40));
  assert.equal(autumn.filter(Boolean).length, 1);
  assert.equal(autumn.find(Boolean), 'otoño');
  assert.equal(seasonStartingOn('2026-12-21', 40), 'invierno');
  assert.equal(seasonStartingOn('2026-12-21', -34), 'verano'); // hemisferio sur
  assert.equal(seasonStartingOn('2026-10-22', 40), null);
});

test('signName cubre los 12 signos', () => {
  assert.equal(signName(0), 'Aries');
  assert.equal(signName(359.9), 'Piscis');
  assert.equal(signName(270), 'Capricornio');
});
