// Funciones que se abren por tester desde el servidor (beta por fases). Sin conexión se usa la última lista recibida.

export const SERVER = 'https://clutch-ia.vercel.app';

export const FEATURES = {
  multi_profile: 'Varias personas',
  ai_rewrite: 'Reescribir con IA',
  my_style: 'Mensajes con tu estilo',
  companions_pro: 'Más acompañantes',
  sos_chat: 'Chat SOS con IA',
  photo_ai: 'Reconocer fotos con IA',
  profile_ai: 'Analizar su perfil con IA',
  plans: 'Planes cerca',
  encrypted_backup: 'Copia de seguridad'
};

export function has(settings, feature) {
  return Array.isArray(settings?.features) && settings.features.includes(feature);
}

export function serverHeaders(settings) {
  return { 'Content-Type': 'application/json', 'X-Clutch-Code': settings?.testerCode || '' };
}

// Alta en la beta. Devuelve { ok, code, status } o { ok:false, reason } (reason = código de error del servidor).
export async function registerBeta({ alias, email, terms, metrics }, fetchFn = globalThis.fetch, timeoutMs = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchFn(`${SERVER}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alias, email, terms: terms === true, metrics: metrics === true }), signal: ctl.signal });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, reason: j.error || 'servidor' };
    return { ok: true, code: j.code, status: j.status };
  } catch {
    return { ok: false, reason: 'red' };
  } finally {
    clearTimeout(t);
  }
}

// Devuelve { ok, status, group, features } o { ok:false, reason }.
export async function fetchConfig(settings, fetchFn = globalThis.fetch, timeoutMs = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchFn(`${SERVER}/api/config`, { headers: serverHeaders(settings), signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) return { ok: false, reason: 'servidor' };
    const j = await res.json();
    const features = (Array.isArray(j.features) ? j.features : []).filter((f) => f in FEATURES);
    return { ok: true, status: j.status, group: j.group || null, features };
  } catch {
    return { ok: false, reason: 'red' };
  } finally {
    clearTimeout(t);
  }
}
