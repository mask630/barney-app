// Estadísticas anónimas, opiniones y avisos de error.
// Solo se envían estadísticas y errores si la persona lo aceptó (settings.metrics) y es tester activo.
// Nunca se envían textos, nombres ni datos de ella: solo cuántas veces se usó cada función.

import { SERVER, serverHeaders } from './features.js';

export const EVENTS = [
  'open', 'tab_hoy', 'tab_ella', 'tab_apuntar', 'tab_yo',
  'write_open', 'copy', 'whatsapp', 'style_apply', 'ai_rewrite',
  'sos_open', 'sos_script', 'sos_chat', 'breath',
  'capture_save', 'photo_add', 'photo_ai', 'profile_ai', 'reminder_done', 'agenda_open', 'section_add', 'plans_search',
  'profile_create', 'stage_change', 'gesture_done', 'backup_export', 'feedback_send'
];

const Q_KEY = 'clutch_metrics_q';
export const canSend = (s) => !!(s?.metrics && s.testerCode && s.betaStatus === 'active');

// La cola vive en el almacenamiento del móvil para no perder recuentos si se cierra la app.
export function createMetrics(storage, fetchFn = (...a) => globalThis.fetch(...a)) {
  const read = () => { try { return JSON.parse(storage.getItem(Q_KEY) || '{}') || {}; } catch { return {}; } };
  const write = (q) => { try { storage.setItem(Q_KEY, JSON.stringify(q)); } catch { /* sin espacio: se pierde el recuento */ } };
  let errorsSent = 0;
  let sending = false;

  return {
    track(settings, ev) {
      if (!canSend(settings) || !EVENTS.includes(ev)) return;
      const q = read();
      q[ev] = (q[ev] || 0) + 1;
      write(q);
    },
    pending: () => read(),
    clear: () => write({}),
    async flush(settings, { keepalive = false } = {}) {
      const q = read();
      if (!canSend(settings) || sending || !Object.keys(q).length) return false;
      sending = true;
      write({}); // si falla, se devuelve a la cola
      try {
        const res = await fetchFn(`${SERVER}/api/event`, { method: 'POST', headers: serverHeaders(settings), body: JSON.stringify({ events: q }), keepalive });
        if (!res.ok && res.status !== 401 && res.status !== 429) throw new Error('servidor');
        return res.ok;
      } catch {
        const now = read();
        for (const [k, n] of Object.entries(q)) now[k] = (now[k] || 0) + n;
        write(now);
        return false;
      } finally {
        sending = false;
      }
    },
    async consent(settings, on) {
      if (!settings?.testerCode) return;
      if (!on) write({});
      try { await fetchFn(`${SERVER}/api/event`, { method: 'POST', headers: serverHeaders(settings), body: JSON.stringify({ consent: on }) }); } catch { /* se reintentará al cambiarlo otra vez */ }
    },
    // Aviso técnico de error: como mucho 3 por sesión y solo con permiso.
    async error(settings, { message, where, screen, version }) {
      if (!canSend(settings) || errorsSent >= 3) return;
      errorsSent++;
      const text = `${String(message || 'Error').slice(0, 300)}${where ? `\n${String(where).slice(0, 300)}` : ''}`;
      try { await fetchFn(`${SERVER}/api/feedback`, { method: 'POST', headers: serverHeaders(settings), body: JSON.stringify({ kind: 'error', text, screen, version }), keepalive: true }); } catch { /* sin red */ }
    }
  };
}

// Opinión del tester (con o sin código). Devuelve { ok } o { ok:false, reason }.
export async function sendFeedback(settings, { text, screen, version }, fetchFn = globalThis.fetch) {
  try {
    const res = await fetchFn(`${SERVER}/api/feedback`, { method: 'POST', headers: serverHeaders(settings), body: JSON.stringify({ kind: 'opinion', text, screen, version }) });
    if (res.ok) return { ok: true };
    const j = await res.json().catch(() => ({}));
    return { ok: false, reason: j.error || 'servidor' };
  } catch {
    return { ok: false, reason: 'red' };
  }
}
