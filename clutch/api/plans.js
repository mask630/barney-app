// Planes cerca: lugares reales de OpenStreetMap buscados desde el servidor y guardados 7 días por zona (~1 km).
// Fuentes por orden: Photon (komoot), Nominatim y Overpass. Overpass suele estar saturado; las otras dos responden rápido.
// El móvil solo envía las coordenadas de la ciudad elegida.

import { cors, findTester, featuresFor, isActive, readBody } from './_lib/access.js';
import { getJson, setJson } from './_lib/db.js';
import { PLAN_KINDS, buildQuery } from '../js/engine/plans.js';

const TTL_MS = 7 * 24 * 3600e3;
const MAX_KM = 6;
const UA = { 'User-Agent': 'Clutch/0.1 (+https://mask630.github.io/barney-app/clutch/)', Accept: 'application/json' };

// '["tourism"="viewpoint"]' -> ['tourism', 'viewpoint']
const tagOf = (kind) => /\["(\w+)"="(\w+)"\]/.exec(PLAN_KINDS[kind].filter).slice(1);
const near = (lat, lon) => (e) => Math.hypot(e.lat - lat, (e.lon - lon) * Math.cos((lat * Math.PI) / 180)) * 111 <= MAX_KM;
const el = (name, la, lo, k, v) => ({ lat: +la, lon: +lo, tags: { name, [k]: v } });

async function getJsonUrl(url, fetchFn, ms) {
  const r = await fetchFn(url, { headers: UA, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export async function fromPhoton(lat, lon, fetchFn = globalThis.fetch) {
  const lists = await Promise.all(Object.keys(PLAN_KINDS).map(async (kind) => {
    const [k, v] = tagOf(kind);
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(PLAN_KINDS[kind].label)}&lat=${lat}&lon=${lon}&osm_tag=${k}:${v}&limit=15&lang=default`;
    const j = await getJsonUrl(url, fetchFn, 8000);
    return (j.features || []).filter((f) => f.properties?.name).map((f) => el(f.properties.name, f.geometry.coordinates[1], f.geometry.coordinates[0], k, v));
  }));
  return lists.flat().filter(near(lat, lon));
}

export async function fromNominatim(lat, lon, fetchFn = globalThis.fetch) {
  const d = 0.04, out = [];
  for (const kind of Object.keys(PLAN_KINDS)) {
    const [k, v] = tagOf(kind);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`[${v}]`)}&format=jsonv2&limit=15&bounded=1&viewbox=${lon - d},${lat + d},${lon + d},${lat - d}`;
    const j = await getJsonUrl(url, fetchFn, 8000);
    out.push(...j.filter((x) => x.name).map((x) => el(x.name, x.lat, x.lon, k, v)));
    await new Promise((s) => setTimeout(s, 1000)); // norma de uso de Nominatim: 1 petición por segundo
  }
  return out.filter(near(lat, lon));
}

export async function fromOverpass(lat, lon, fetchFn = globalThis.fetch) {
  const r = await fetchFn('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(buildQuery(lat, lon)), headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(String(r.status));
  const j = await r.json();
  return (j.elements || []).map((e) => ({ lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, tags: e.tags || {} })).filter((e) => e.tags.name && e.lat != null);
}

export async function findPlaces(lat, lon, fetchFn = globalThis.fetch) {
  for (const source of [fromPhoton, fromNominatim, fromOverpass]) {
    try {
      const els = await source(lat, lon, fetchFn);
      if (els.length) return els;
    } catch { /* siguiente fuente */ }
  }
  return null;
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'metodo' });
  let tester;
  try {
    tester = await findTester(req.headers['x-clutch-code']);
  } catch {
    return res.status(503).json({ error: 'db' });
  }
  if (!isActive(tester)) return res.status(401).json({ error: 'codigo' });
  if (!(await featuresFor(tester)).includes('plans')) return res.status(403).json({ error: 'funcion' });

  const body = readBody(req);
  const lat = Number(body.lat), lon = Number(body.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return res.status(400).json({ error: 'coordenadas' });

  const key = `plans:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = await getJson(key).catch(() => null);
  if (cached && Date.now() - cached.at < TTL_MS) return res.status(200).json({ elements: cached.elements, cached: true });

  const elements = await findPlaces(lat, lon);
  if (!elements) return cached ? res.status(200).json({ elements: cached.elements, cached: true }) : res.status(502).json({ error: 'servicio' });
  await setJson(key, { at: Date.now(), elements }).catch(() => {});
  return res.status(200).json({ elements });
}
