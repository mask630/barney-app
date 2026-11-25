// «Su ficha en 2 minutos»: preguntas cortas para que la app no empiece vacía.
// Cada respuesta se guarda en su lista con el mismo sistema que Apuntar. Lo respondido o saltado no se vuelve a preguntar
// (se guarda en la ficha: `quiz: { id: 'ok' | 'skip' }`).

import { applyToProfile } from './capture.js';

// prefix: cómo queda en la lista («comida favorita: la pasta»), para que luego se use bien en mensajes y gestos.
export const QUIZ = [
  { id: 'comida', q: '¿Cuál es su comida favorita?', ph: 'sushi, la pasta, mexicano…', dest: 'gustos', prefix: 'comida favorita: ' },
  { id: 'dulce', q: '¿Y su dulce o capricho favorito?', ph: 'chocolate negro, helado de pistacho…', dest: 'gustos', prefix: 'dulce favorito: ' },
  { id: 'plan', q: '¿Qué le gusta hacer en su tiempo libre?', ph: 'ir a la playa, el cine, bailar…', dest: 'gustos' },
  { id: 'musica', q: '¿Qué música, serie o grupo le encanta?', ph: 'Rosalía, The Office…', dest: 'gustos' },
  { id: 'color', q: '¿Su color o sus flores favoritas?', ph: 'el verde, los girasoles…', dest: 'gustos' },
  { id: 'evitar', q: '¿Algo que no soporte?', ph: 'el cilantro, las sorpresas en público…', dest: 'evitar' },
  { id: 'ropa', q: '¿Qué talla de ropa usa?', ph: 'S, M, 38…', dest: 'tallas', field: 'ropa' },
  { id: 'pie', q: '¿Qué número de pie?', ph: '38', dest: 'tallas', field: 'calzado' },
  { id: 'ilusion', q: '¿Algo que le haría ilusión tener o hacer?', ph: 'unos cascos, ir a París…', dest: 'regalos' },
  { id: 'amiga', q: '¿Cómo se llama su mejor amiga?', ph: 'Ana', dest: 'recordar', prefix: 'Su mejor amiga se llama ' }
];

export function pendingQuiz(profile) {
  const q = profile.quiz || {};
  return QUIZ.filter((x) => !q[x.id]);
}

// Guarda la respuesta (vacía = saltar) y devuelve la ficha nueva.
export function answerQuiz(profile, qid, answer, id, todayISO) {
  const item = QUIZ.find((x) => x.id === qid);
  if (!item) return profile;
  const text = String(answer || '').trim();
  let p = { ...profile, quiz: { ...(profile.quiz || {}), [qid]: text ? 'ok' : 'skip' } };
  if (text) p = { ...applyToProfile(p, { dest: item.dest, field: item.field, value: (item.prefix || '') + text }, id, todayISO), quiz: p.quiz };
  return p;
}
