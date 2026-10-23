// Cliente de la IA opcional (PRO). La clave de IA vive SOLO en el servidor; la app nunca la ve.
// Privacidad: no se envía el nombre ni la fecha de nacimiento. Se envía el tramo de edad, el registro,
// los datos reales que ya tiene la app y el texto que pides reescribir. El nombre va como {n}.

import { SERVER, serverHeaders } from './features.js';

// El servidor va integrado en la app; solo hace falta el código de tester.
export function aiConfigured(settings) {
  return !!String(settings?.testerCode || '').trim();
}

async function call(settings, body, fetchFn = globalThis.fetch, timeoutMs = 25000) {
  if (!aiConfigured(settings)) return { ok: false, reason: 'sin-servidor' };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchFn(`${SERVER}/api/ai`, {
      method: 'POST',
      headers: serverHeaders(settings),
      body: JSON.stringify(body),
      signal: ctl.signal
    });
    if (res.status === 401) return { ok: false, reason: 'codigo' };
    if (res.status === 403) return { ok: false, reason: 'funcion' };
    if (res.status === 429) return { ok: false, reason: 'limite' };
    if (!res.ok) return { ok: false, reason: 'servidor' };
    const json = await res.json();
    return { ok: true, ...json };
  } catch {
    return { ok: false, reason: 'red' };
  } finally {
    clearTimeout(t);
  }
}

// facts: textos reales que el mensaje puede usar (nunca inventar más).
export function aiRewrite(settings, { message, band, group, stage, facts, traits }, fetchFn) {
  return call(settings, { task: 'rewrite', message, band, group, stage: stage || null, facts: facts || [], traits: traits || null }, fetchFn);
}

export function aiSos(settings, { history, band, group, stage }, fetchFn) {
  return call(settings, { task: 'sos', history: (history || []).slice(-8), band, group, stage: stage || null }, fetchFn);
}

// Foto → sugerencia de destino. La foto se envía reducida (la app ya la baja a 720 px).
export function aiPhoto(settings, { photo, band }, fetchFn) {
  return call(settings, { task: 'photo', photo, band }, fetchFn);
}

// Capturas de su perfil público → { gustos, evitar, regalos, planes, lectura }. Las capturas no se guardan.
export const SOCIAL_MAX = 6;
export async function aiProfile(settings, { photos, band, group }, fetchFn) {
  const r = await call(settings, { task: 'profile', photos: (photos || []).slice(0, SOCIAL_MAX), band, group }, fetchFn, 60000);
  if (!r.ok) return r;
  return r.result ? r : { ok: false, reason: 'servidor' };
}

// Sustituye {n} por el nombre en local.
export function fillName(text, name) {
  return String(text || '').replaceAll('{n}', name || '').replace(/\s{2,}/g, ' ').trim();
}
