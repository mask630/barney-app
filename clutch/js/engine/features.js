// Funciones que se abren por tester desde el servidor (beta por fases). Sin conexión se usa la última lista recibida.

export const SERVER = 'https://clutch-ia.vercel.app';

export const FEATURES = {
  ai_rewrite: 'Reescribir con IA',
  my_style: 'Mensajes con tu estilo',
  companions_pro: 'Más acompañantes',
  sos_chat: 'Chat SOS con IA',
  photo_ai: 'Reconocer fotos con IA',
  plans: 'Planes cerca',
  encrypted_backup: 'Copia cifrada'
};

export function has(settings, feature) {
  return Array.isArray(settings?.features) && settings.features.includes(feature);
}

export function serverHeaders(settings) {
  return { 'Content-Type': 'application/json', 'X-Clutch-Code': settings?.testerCode || '' };
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
