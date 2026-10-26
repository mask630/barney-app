// Cuenta del usuario (email + código o Google) y sincronización de sus datos con el servidor.
// La sesión vive en settings.session = { token, email }. Sin sesión, la app funciona igual con los datos solo en el móvil.

import { SERVER } from './features.js';

async function req(path, { method = 'GET', body, token, timeoutMs = 15000 } = {}, fetchFn = globalThis.fetch) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchFn(`${SERVER}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
      cache: 'no-store'
    });
    const j = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, ...j };
  } catch {
    return { status: 0, ok: false, error: 'red' };
  } finally {
    clearTimeout(t);
  }
}

export const authInfo = (f) => req('/api/auth', {}, f);
export const authStart = (email, f) => req('/api/auth', { method: 'POST', body: { action: 'start', email } }, f);
export const authVerify = (email, code, { terms, metrics }, f) => req('/api/auth', { method: 'POST', body: { action: 'verify', email, code, terms: terms === true, metrics: metrics === true } }, f);
export const authGoogle = (credential, { terms, metrics }, f) => req('/api/auth', { method: 'POST', body: { action: 'google', credential, terms: terms === true, metrics: metrics === true } }, f);
export const authLogout = (token, f) => req('/api/auth', { method: 'POST', body: { action: 'logout' }, token }, f);
export const pullData = (token, f) => req('/api/data', { token }, f);
export const pushData = (token, state, baseRev, f) => req('/api/data', { method: 'PUT', body: { state, baseRev }, token, timeoutMs: 25000 }, f);
export const deleteAccount = (token, f) => req('/api/data', { method: 'DELETE', token }, f);

// ---------- qué se sube y cómo se mezclan dos copias ----------
// Se suben las fichas y la bandeja (sin fotos: se quedan en el móvil) y unos pocos ajustes de la persona.
// El PIN, el tema, el código de tester, la sesión y las estadísticas son de cada móvil.
const SYNCED_SETTINGS = ['country', 'city', 'companionStyle', 'style'];
const noPhoto = (it) => { const { photo, ...rest } = it; return rest; };

export function syncable(state) {
  return {
    profiles: state.profiles.map((p) => ({ ...p, gifts: (p.gifts || []).map(noPhoto), remember: (p.remember || []).map(noPhoto) })),
    inbox: (state.inbox || []).filter((i) => i.text).map(noPhoto),
    deleted: state.deleted || [],
    activeId: state.activeId,
    settings: Object.fromEntries(SYNCED_SETTINGS.map((k) => [k, state.settings?.[k] ?? null]))
  };
}

const stamp = (p) => p.updatedAt || 0;

// Devuelve las fotos del móvil a los elementos que siguen existiendo (mismo id).
function keepPhotos(remote, local) {
  if (!local) return remote;
  const photos = new Map([...(local.gifts || []), ...(local.remember || [])].filter((x) => x.photo).map((x) => [x.id, x.photo]));
  if (!photos.size) return remote;
  const put = (x) => (photos.has(x.id) ? { ...x, photo: photos.get(x.id) } : x);
  return { ...remote, gifts: (remote.gifts || []).map(put), remember: (remote.remember || []).map(put) };
}

// Mezcla la copia del servidor con la del móvil: por cada ficha gana la cambiada más tarde;
// lo borrado en cualquiera de los dos (lista `deleted`) no vuelve.
export function mergeStates(local, remote) {
  if (!remote) return local;
  const deleted = [...new Set([...(local.deleted || []), ...(remote.deleted || [])])].slice(-300);
  const gone = new Set(deleted);
  const byId = new Map();
  for (const p of remote.profiles || []) byId.set(p.id, p);
  const localById = new Map(local.profiles.map((p) => [p.id, p]));
  for (const p of local.profiles) {
    const r = byId.get(p.id);
    if (!r || stamp(p) >= stamp(r)) byId.set(p.id, p);
  }
  const profiles = [...byId.values()].filter((p) => !gone.has(p.id)).map((p) => keepPhotos(p, localById.get(p.id)));
  const inboxById = new Map([...(remote.inbox || []), ...(local.inbox || [])].map((i) => [i.id, i]));
  const inbox = [...inboxById.values()].filter((i) => !gone.has(i.id));
  const settings = { ...local.settings };
  for (const k of SYNCED_SETTINGS) if (settings[k] == null && remote.settings?.[k] != null) settings[k] = remote.settings[k];
  const activeId = profiles.some((p) => p.id === local.activeId) ? local.activeId : profiles.some((p) => p.id === remote.activeId) ? remote.activeId : profiles[0]?.id || null;
  return { ...local, profiles, inbox, deleted, settings, activeId };
}
