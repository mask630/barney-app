// Planes cerca: lugares reales de OpenStreetMap (Overpass). Solo se envían las coordenadas de la ciudad elegida.

import { SERVER, serverHeaders } from './features.js';
import { pickRotating } from './rotation.js';
import { compose } from './voice.js';
// No son eventos de agendas locales: esos requieren acuerdo con la fuente (pendiente).

export const PLAN_KINDS = {
  viewpoint: { label: 'Mirador', filter: '["tourism"="viewpoint"]', groups: ['flirt', 'pareja'], idea: 'Ver el atardecer desde' },
  park: { label: 'Parque', filter: '["leisure"="park"]', groups: ['flirt', 'pareja'], idea: 'Pasear por' },
  ice_cream: { label: 'Heladería', filter: '["amenity"="ice_cream"]', groups: ['flirt', 'pareja'], idea: 'Tomar un helado en' },
  cinema: { label: 'Cine', filter: '["amenity"="cinema"]', groups: ['flirt', 'pareja'], idea: 'Ver una peli en' },
  museum: { label: 'Museo', filter: '["tourism"="museum"]', groups: ['flirt', 'pareja'], idea: 'Visitar el' },
  cafe: { label: 'Café', filter: '["amenity"="cafe"]', groups: ['flirt'], idea: 'Tomar un café en' }
};

export function buildQuery(lat, lon, radius = 3500) {
  const parts = Object.values(PLAN_KINDS).map((k) => `nwr(around:${radius},${lat.toFixed(4)},${lon.toFixed(4)})${k.filter}["name"];`);
  return `[out:json][timeout:20];(${parts.join('')});out center 80;`;
}

function kindOf(tags) {
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.leisure === 'park') return 'park';
  if (tags.amenity === 'ice_cream') return 'ice_cream';
  if (tags.amenity === 'cinema') return 'cinema';
  if (tags.tourism === 'museum') return 'museum';
  if (tags.amenity === 'cafe') return 'cafe';
  return null;
}

const dist = (lat, lon, el) => {
  const la = el.lat ?? el.center?.lat, lo = el.lon ?? el.center?.lon;
  if (la == null || lo == null) return Infinity;
  return Math.hypot(la - lat, (lo - lon) * Math.cos((lat * Math.PI) / 180)) * 111;
};

// Convierte la respuesta de Overpass en ideas de plan, filtradas por registro y repartidas por tipo.
export function parsePlans(json, { lat, lon, group, max = 8 }) {
  const seen = new Set();
  const byKind = {};
  for (const el of json?.elements || []) {
    const tags = el.tags || {};
    const name = String(tags.name || '').trim();
    const kind = kindOf(tags);
    if (!name || !kind || !PLAN_KINDS[kind].groups.includes(group)) continue;
    const key = `${kind}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (byKind[kind] ||= []).push({ kind, name, km: dist(lat, lon, el) });
  }
  const out = [];
  for (const list of Object.values(byKind)) list.sort((a, b) => a.km - b.km);
  // reparto: uno de cada tipo por turnos, para variar
  let i = 0;
  while (out.length < max) {
    let added = false;
    for (const list of Object.values(byKind)) {
      if (list[i] && out.length < max) { out.push(list[i]); added = true; }
    }
    if (!added) break;
    i++;
  }
  return out.map((p) => ({ ...p, label: PLAN_KINDS[p.kind].label, text: `${PLAN_KINDS[p.kind].idea} ${p.name}`, km: Math.round(p.km * 10) / 10 }));
}

// Va por nuestro servidor (prueba varios espejos de Overpass y guarda el resultado), no directo a OpenStreetMap.
export async function fetchPlans({ lat, lon, group, settings, fetchFn = globalThis.fetch, timeoutMs = 30000 }) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchFn(`${SERVER}/api/plans`, {
      method: 'POST',
      body: JSON.stringify({ lat, lon }),
      headers: serverHeaders(settings),
      signal: ctl.signal
    });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'acceso' };
    if (!res.ok) return { ok: false, reason: 'servicio' };
    return { ok: true, plans: parsePlans(await res.json(), { lat, lon, group }) };
  } catch {
    return { ok: false, reason: 'red' };
  } finally {
    clearTimeout(timer);
  }
}

// Hasta `max` planes para hoy entre los que han descansado (un sitio propuesto no vuelve en ~3 semanas, con variación).
export const planId = (item) => `plan:${item.kind}:${item.name.toLowerCase()}`;
export function plansForToday(items, profile, todayISO, max = 4) {
  const pool = (items || []).map((it) => ({ ...it, id: planId(it), e: 'plan' }));
  return pickRotating(pool, profile, todayISO, max, 'plans', 1);
}

// Mensaje para proponérselo: «Lucía, ¿te apetece ver el atardecer desde el Mirador…?»
export function planMessage(item, { name, band, group }) {
  const t = item.text.charAt(0).toLowerCase() + item.text.slice(1);
  return compose({ text: `¿te apetece ${t}?`, name, band, group });
}
