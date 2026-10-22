// "Con tu estilo": aprende rasgos simples de mensajes tuyos y adapta los mensajes del motor.
// Es local y determinista (no usa IA). La versión con IA es opcional y va por servidor (ai.js).

const EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/gu;

export function analyzeStyle(samples) {
  const texts = (samples || []).map((s) => String(s).trim()).filter((s) => s.length > 1);
  if (texts.length < 2) return null;
  const words = texts.map((t) => t.split(/\s+/).filter(Boolean).length);
  const avgWords = words.reduce((a, b) => a + b, 0) / words.length;
  const emojiCounts = new Map();
  let withEmoji = 0;
  for (const t of texts) {
    const found = t.match(EMOJI) || [];
    if (found.length) withEmoji++;
    for (const e of found) emojiCounts.set(e, (emojiCounts.get(e) || 0) + 1);
  }
  const topEmoji = [...emojiCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const lowerStart = texts.filter((t) => /^[a-záéíóúñ]/.test(t)).length / texts.length >= 0.6;
  const laughs = texts.filter((t) => /\b(ja){2,}|jeje|jaja/i.test(t)).length / texts.length >= 0.4;
  const exclaim = texts.filter((t) => /!/.test(t)).length / texts.length >= 0.5;
  return {
    short: avgWords < 9,
    emojiRate: withEmoji / texts.length,
    topEmoji,
    lowerStart,
    laughs,
    exclaim,
    n: texts.length
  };
}

// Adapta un mensaje a los rasgos. Nunca añade datos nuevos: solo forma.
export function applyStyle(message, traits) {
  if (!message || !traits) return message;
  let m = message.replace(/\s+/g, ' ').trim();
  // 1. quitar los emojis del motor
  m = m.replace(EMOJI, '').replace(/\s+([.,!?])/g, '$1').trim();
  // 2. longitud: si escribes corto, quedarte con las dos primeras frases
  if (traits.short) {
    const parts = m.match(/[^.!?…]+[.!?…]*/g) || [m];
    if (parts.length > 2) m = parts.slice(0, 2).join('').trim();
  }
  // 3. exclamación en vez de punto final
  if (traits.exclaim && /\.$/.test(m)) m = m.replace(/\.$/, '!');
  // 4. jajas y, al final, tu emoji si usas emojis a menudo
  if (traits.laughs && !/jaja/i.test(m)) m = `${m} jaja`;
  if (traits.emojiRate >= 0.4 && traits.topEmoji) m = `${m} ${traits.topEmoji}`;
  // 5. minúscula inicial
  if (traits.lowerStart) m = m.charAt(0).toLowerCase() + m.slice(1);
  return m.replace(/\s{2,}/g, ' ').trim();
}

export function describeStyle(t) {
  if (!t) return '';
  const bits = [];
  bits.push(t.short ? 'mensajes cortos' : 'mensajes más largos');
  bits.push(t.emojiRate >= 0.4 ? `usas emojis${t.topEmoji ? ' (' + t.topEmoji + ')' : ''}` : 'casi sin emojis');
  if (t.lowerStart) bits.push('empiezas en minúscula');
  if (t.laughs) bits.push('con jajas');
  if (t.exclaim) bits.push('con exclamaciones');
  return bits.join(' · ');
}
