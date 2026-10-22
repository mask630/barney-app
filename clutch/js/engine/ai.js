// Cliente de la IA opcional (PRO). La clave de IA vive SOLO en el servidor; la app nunca la ve.
// Privacidad: no se envía el nombre ni la fecha de nacimiento. Se envía el tramo de edad, el registro,
// los datos reales que ya tiene la app y el texto que pides reescribir. El nombre va como {n}.

export function aiConfigured(settings) {
  return /^https:\/\//.test(settings?.aiUrl || '');
}

async function call(settings, body, fetchFn = globalThis.fetch, timeoutMs = 25000) {
  if (!aiConfigured(settings)) return { ok: false, reason: 'sin-servidor' };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchFn(settings.aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Clutch-Code': settings.testerCode || '' },
      body: JSON.stringify(body),
      signal: ctl.signal
    });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'codigo' };
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
export function aiRewrite(settings, { message, band, group, facts, traits }, fetchFn) {
  return call(settings, { task: 'rewrite', message, band, group, facts: facts || [], traits: traits || null }, fetchFn);
}

export function aiSos(settings, { history, band, group }, fetchFn) {
  return call(settings, { task: 'sos', history: (history || []).slice(-8), band, group }, fetchFn);
}

// Foto → sugerencia de destino. La foto se envía reducida (la app ya la baja a 720 px).
export function aiPhoto(settings, { photo, band }, fetchFn) {
  return call(settings, { task: 'photo', photo, band }, fetchFn);
}

// Sustituye {n} por el nombre en local.
export function fillName(text, name) {
  return String(text || '').replaceAll('{n}', name || '').replace(/\s{2,}/g, ' ').trim();
}
