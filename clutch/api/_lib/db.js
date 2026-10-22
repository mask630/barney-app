// Almacén del servidor: Redis de Upstash por su API REST (sin dependencias).
// Variables (las crea Vercel al añadir Upstash): KV_REST_API_URL + KV_REST_API_TOKEN, o UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// Sin ellas se usa memoria: sirve para las pruebas, no para producción (se pierde entre llamadas).

const mem = new Map();

function creds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.trim(), token: token.trim() } : null;
}

export const hasDb = () => !!creds();

async function redis(args) {
  const c = creds();
  const r = await fetch(c.url, { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error('db');
  return (await r.json()).result;
}

export async function getJson(key) {
  if (!hasDb()) return mem.has(key) ? structuredClone(mem.get(key)) : null;
  const v = await redis(['GET', key]);
  return v == null ? null : JSON.parse(v);
}

export async function setJson(key, value) {
  if (!hasDb()) { mem.set(key, structuredClone(value)); return; }
  await redis(['SET', key, JSON.stringify(value)]);
}

// Suma 1 y devuelve el total; la clave caduca a los `ttlSec` segundos de crearse (contadores por día u hora).
export async function incr(key, ttlSec) {
  if (!hasDb()) {
    const n = (mem.get(key) || 0) + 1;
    mem.set(key, n);
    return n;
  }
  const n = await redis(['INCR', key]);
  if (n === 1 && ttlSec) await redis(['EXPIRE', key, String(ttlSec)]);
  return n;
}

export async function addToSet(key, member) {
  if (!hasDb()) { const s = mem.get(key) || []; if (!s.includes(member)) s.push(member); mem.set(key, s); return; }
  await redis(['SADD', key, member]);
}

export async function del(...keys) {
  if (!hasDb()) { keys.forEach((k) => mem.delete(k)); return; }
  await redis(['DEL', ...keys]);
}

export async function removeFromSet(key, member) {
  if (!hasDb()) { mem.set(key, (mem.get(key) || []).filter((m) => m !== member)); return; }
  await redis(['SREM', key, member]);
}

export async function setMembers(key) {
  if (!hasDb()) return [...(mem.get(key) || [])];
  return (await redis(['SMEMBERS', key])) || [];
}

export async function getMany(keys) {
  if (!keys.length) return [];
  if (!hasDb()) return keys.map((k) => (mem.has(k) ? structuredClone(mem.get(k)) : null));
  return ((await redis(['MGET', ...keys])) || []).map((v) => (v == null ? null : JSON.parse(v)));
}

// Solo para pruebas.
export function _resetMemory() { mem.clear(); }
