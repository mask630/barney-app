// Función de servidor de Clutch para la IA opcional (PRO). Pensada para Vercel (Node 18+).
// Variables de entorno:
//   ANTHROPIC_API_KEY  (obligatoria)  clave de la API de Anthropic. Nunca se envía al navegador.
//   CLUTCH_CODES       (opcional)     códigos del dueño (grupo admin), separados por comas. Los testers viven en la base de datos.
//   CLUTCH_ORIGINS     (opcional)     orígenes permitidos separados por comas. Por defecto, cualquiera.
//   CLUTCH_MODEL       (opcional)     modelo. Por defecto claude-haiku-5-5.

import { cors, findTester, featuresFor, isActive, aiQuotaOk, readBody } from './_lib/access.js';

const MAX_MESSAGE = 600;
const TASK_FEATURE = { rewrite: 'ai_rewrite', sos: 'sos_chat', photo: 'photo_ai', profile: 'profile_ai' };
const MAX_PROFILE_PHOTOS = 6;
const MAX_PHOTO_CHARS = 1_800_000;
// Respuestas cortas: sin «pensamiento» (en Haiku 5.5 viene activado y se comía todo max_tokens) y esfuerzo bajo.
const FAST = { thinking: { type: 'disabled' }, output_config: { effort: 'low' } };
const BANDS = ['18-24', '25-34', '35-49', '50+'];
const GROUPS = ['flirt', 'pareja'];
// Matiz por etapa dentro del registro (opcional; la app lo manda desde que existe).
const STAGE_NOTES = {
  rollo: 'Etapa: ya hay algo, sin compromiso o empezando. Cercano y con chispa, sin exigir ni presionar.',
  matrimonio: 'Etapa: matrimonio. Cariño de largo recorrido y complicidad.'
};

const BASE_RULES = `Eres el redactor de Clutch, una app que ayuda a un hombre a cuidar su relación con una mujer adulta.
Reglas que no se pueden saltar:
- Escribe siempre en español natural, sin sonar a anuncio.
- Usa SOLO los datos que te doy. No inventes fechas, números, nombres, lugares, recuerdos ni gustos.
- El nombre de ella aparece como {n}. Déjalo tal cual.
- Respeta el registro: flirt = ligero y con chispa (rollo); pareja = cariño y constancia.
- Adapta el tono al tramo de edad: 18-24 informal, 25-34 natural, 35-49 sobrio y cálido, 50+ cuidado y respetuoso.
- Nada de manipulación, presión, culpa ni contenido sexual. Si algo se pide así, responde con una alternativa respetuosa.
- Responde solo con el texto pedido, sin explicaciones.
- Texto plano: sin markdown, sin asteriscos ni almohadillas.`;

// Por si la IA usa markdown igualmente: la app muestra texto plano.
export const plain = (s) => String(s).replace(/\*\*|__/g, '').replace(/^#{1,6}\s+/gm, '').replace(/^\s*[-*]\s+/gm, '• ');

export function buildRequest(body, model = 'claude-haiku-5-5') {
  // La foto no usa el registro (la app no lo manda); reescribir y SOS sí.
  if (!BANDS.includes(body.band) || (body.task !== 'photo' && body.task !== 'profile' && !GROUPS.includes(body.group))) return { error: 'parametros' };
  const ctx = `Tramo de edad de ella: ${body.band}. Registro: ${body.group}.${STAGE_NOTES[body.stage] ? ' ' + STAGE_NOTES[body.stage] : ''}`;
  if (body.task === 'rewrite') {
    const msg = String(body.message || '').slice(0, MAX_MESSAGE);
    if (!msg) return { error: 'vacio' };
    const facts = (body.facts || []).slice(0, 8).map((f) => String(f).slice(0, 200));
    const traits = body.traits
      ? `Estilo de quien escribe: ${body.traits.short ? 'corto' : 'normal'}, emojis ${body.traits.emojiRate >= 0.4 ? 'sí' : 'casi nunca'}, ${body.traits.lowerStart ? 'empieza en minúscula' : 'empieza en mayúscula'}.`
      : '';
    return {
      msg,
      payload: {
        model, max_tokens: 1024, ...FAST, system: BASE_RULES,
        messages: [{ role: 'user', content: `${ctx}\n${traits}\nDatos reales permitidos:\n${facts.map((f) => '- ' + f).join('\n') || '- (ninguno)'}\n\nReescribe este mensaje con otras palabras, mismo contenido y mismos datos, más natural. Una versión, máximo 3 frases:\n${msg}` }]
      }
    };
  }
  if (body.task === 'sos') {
    const hist = (body.history || []).slice(-8).map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.text || '').slice(0, 500) })).filter((h) => h.content);
    if (!hist.length || hist[0].role !== 'user') return { error: 'vacio' };
    return {
      payload: {
        model, max_tokens: 1024, ...FAST,
        system: `${BASE_RULES}\nAhora eres un apoyo SOS: el usuario ha tenido un problema con ella. Ayuda con calma: 1) qué hacer ahora, 2) un mensaje breve que pueda enviar. Máximo 120 palabras. Si el usuario describe violencia o acoso, di con claridad que pare y pida ayuda profesional. ${ctx}`,
        messages: hist
      }
    };
  }
  if (body.task === 'photo') {
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(body.photo || '');
    if (!m || m[1].length > MAX_PHOTO_CHARS) return { error: 'foto' };
    return {
      payload: {
        model, max_tokens: 1024, ...FAST,
        system: 'Clasificas una foto que un usuario hizo para recordar algo de su pareja. Responde SOLO con JSON: {"dest":"gustos|tallas|regalos|eventos|recordar","field":"opcional (p. ej. anillo, calzado)","value":"texto corto en español","confidence":"alta|media|baja"}. Si no estás seguro, dest "recordar" y confidence "baja". No describas personas ni intentes identificarlas.',
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: m[1] } }, { type: 'text', text: '¿A dónde va esta foto?' }] }]
      }
    };
  }
  if (body.task === 'profile') {
    const list = Array.isArray(body.photos) ? body.photos.slice(0, MAX_PROFILE_PHOTOS) : [];
    const imgs = [];
    for (const ph of list) {
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(ph || '');
      if (!m || m[1].length > MAX_PHOTO_CHARS) return { error: 'foto' };
      imgs.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: m[1] } });
    }
    if (!imgs.length) return { error: 'foto' };
    return {
      payload: {
        model, max_tokens: 1500, ...FAST,
        system: `Analizas capturas del perfil PÚBLICO en redes sociales (Instagram, TikTok…) de una mujer adulta. Quien te las pasa tiene una relación afectiva con ella y quiere acertar con regalos, planes y detalles.
Deduce gustos probables a partir de lo que se ve y se lee: aficiones, comida, viajes, música, series, estética y colores, marcas, mascotas, deporte, sitios que frecuenta.
Reglas:
- No identifiques a nadie ni describas su cuerpo ni su físico.
- No deduzcas datos sensibles: salud, religión, política, orientación sexual, dinero.
- Nada inventado: solo lo que se apoya en las capturas. Si no hay pistas suficientes, devuelve listas cortas o vacías.
- Textos cortos en español (máximo 6 palabras por elemento), en minúscula salvo nombres propios.
- "lectura": 2 o 3 frases tipo lectura en frío, prudentes y en tono cercano, dirigidas a él (tú), sobre qué le suele hacer ilusión. Sin nombres: si hace falta, di "ella".
- ${ctx}
Responde SOLO con JSON: {"gustos":[hasta 8],"evitar":[hasta 4],"regalos":[hasta 5 ideas concretas],"planes":[hasta 4],"lectura":"..."}`,
        messages: [{ role: 'user', content: [...imgs, { type: 'text', text: '¿Qué le puede gustar según su perfil?' }] }]
      }
    };
  }
  return { error: 'tarea' };
}

const strList = (a, n) => (Array.isArray(a) ? a : []).map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, n);

// Respuesta del análisis de perfil, limpia y con límites. null si no es JSON válido.
export function parseProfile(text) {
  try {
    const j = JSON.parse(String(text).replace(/^```(?:json)?|```$/g, '').trim());
    return { gustos: strList(j.gustos, 8), evitar: strList(j.evitar, 4), regalos: strList(j.regalos, 5), planes: strList(j.planes, 4), lectura: String(j.lectura || '').slice(0, 500) };
  } catch {
    return null;
  }
}

const nums = (s) => (String(s).match(/\d+/g) || []).sort().join(',');

// Defensa: si la IA añade números que no estaban en el mensaje ni en los datos, descartamos su respuesta.
export function safeRewrite(input, facts, output) {
  const allowed = new Set((String(input) + ' ' + (facts || []).join(' ')).match(/\d+/g) || []);
  const out = String(output || '').trim();
  if (!out) return null;
  for (const n of out.match(/\d+/g) || []) if (!allowed.has(n)) return null;
  return out;
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'metodo' });
  // trim: al pegarla desde PowerShell la clave puede llegar con un salto de línea final.
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) return res.status(503).json({ error: 'sin-configurar' });
  let tester;
  try {
    tester = await findTester(req.headers['x-clutch-code']);
  } catch {
    return res.status(503).json({ error: 'db' });
  }
  if (!isActive(tester)) return res.status(401).json({ error: 'codigo' });

  const body = readBody(req);
  if (TASK_FEATURE[body.task] && !(await featuresFor(tester)).includes(TASK_FEATURE[body.task])) return res.status(403).json({ error: 'funcion' });
  try {
    if (!(await aiQuotaOk(tester))) return res.status(429).json({ error: 'limite' });
  } catch {
    return res.status(503).json({ error: 'db' });
  }
  const built = buildRequest(body, process.env.CLUTCH_MODEL || 'claude-haiku-5-5');
  if (built.error) return res.status(400).json({ error: built.error });

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(built.payload)
    });
  } catch {
    return res.status(502).json({ error: 'ia' });
  }
  if (!r.ok) return res.status(502).json({ error: 'ia' });
  const data = await r.json();
  const text = plain((data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim());
  if (!text) {
    console.error('ia-vacia', body.task, data.stop_reason, (data.content || []).map((b) => b.type).join(','));
    return res.status(502).json({ error: 'ia' });
  }

  if (body.task === 'rewrite') {
    const safe = safeRewrite(built.msg, body.facts, text);
    return safe ? res.status(200).json({ text: safe }) : res.status(200).json({ text: null, reason: 'descartado' });
  }
  if (body.task === 'profile') {
    const result = parseProfile(text);
    return result ? res.status(200).json({ result }) : res.status(502).json({ error: 'ia' });
  }
  if (body.task === 'photo') {
    try {
      const j = JSON.parse(text.replace(/^```json|```$/g, '').trim());
      const dests = ['gustos', 'tallas', 'regalos', 'eventos', 'recordar'];
      return res.status(200).json({ dest: dests.includes(j.dest) ? j.dest : 'recordar', field: String(j.field || '').slice(0, 30), value: String(j.value || '').slice(0, 120), confidence: j.confidence || 'baja' });
    } catch {
      return res.status(200).json({ dest: 'recordar', field: '', value: '', confidence: 'baja' });
    }
  }
  return res.status(200).json({ text });
}
