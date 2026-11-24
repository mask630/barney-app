import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, splitNotes, parseDate, applyToProfile } from '../js/engine/capture.js';
import { dailyGestures, genericMessages } from '../js/engine/content.js';
import { sweetTaste, tasteMessages, fitsHour } from '../js/engine/moments.js';
import { generateHooks, eventPhrase } from '../js/engine/hooks.js';
import { newProfile } from '../js/core/store.js';

const T = '2026-11-24'; // martes
const base = () => newProfile({ name: 'Lucía', birth: '1996-03-10', stage: 'pareja' }, T).profile;

test('Apuntar: frases reales van a su sitio y con el texto limpio', () => {
  const cases = [
    ['sushi', 'gustos', 'sushi'], ['su serie favorita es The Office', 'gustos', 'serie favorita: The Office'],
    ['le mola el reguetón', 'gustos', 'el reguetón'], ['es muy de playa', 'gustos', 'playa'],
    ['odia el cilantro', 'evitar', 'el cilantro'], ['no le gustan los gatos', 'evitar', 'los gatos'], ['es vegetariana', 'evitar', 'Vegetariana'],
    ['le hace ilusión ir a París', 'regalos', 'ir a París'], ['le gustaría ir a Japón', 'regalos', 'ir a Japón'], ['se le ha roto el secador', 'regalos', 'se le ha roto el secador'],
    ['su madre se llama Carmen', 'recordar', 'Su madre se llama Carmen'], ['trabaja en un hospital', 'recordar', 'Trabaja en un hospital'],
    ['comprar pan', 'bandeja', 'comprar pan']
  ];
  for (const [s, dest, value] of cases) assert.deepEqual([classify(s, T).dest, classify(s, T).value], [dest, value], s);
  assert.deepEqual(['talla de pantalón 38', 'pie 38', 'sujetador 90B', 'de vestido usa la S'].map((s) => { const c = classify(s, T); return `${c.field} ${c.value}`; }),
    ['pantalón 38', 'calzado 38', 'sujetador 90B', 'vestido S']);
});

test('Apuntar: fechas relativas y texto del evento', () => {
  let c = classify('el viernes tiene una entrevista', T);
  assert.deepEqual([c.dest, c.value, c.date.day, c.date.month, c.date.year], ['eventos', 'Entrevista', 27, 11, 2026]);
  c = classify('mañana tiene médico', T);
  assert.deepEqual([c.value, c.date.day], ['Médico', 25]);
  assert.equal(classify('el 15 de diciembre tiene examen', T).value, 'Examen');
  assert.equal(parseDate('le gusta el café por la mañana', T), null, '«por la mañana» no es una fecha');
  assert.equal(classify('le gusta salir el viernes', T).dest, 'gustos');
  assert.equal(parseDate('mañana tiene médico'), null, 'sin saber qué día es hoy, no se adivina');
});

test('Apuntar: varias cosas a la vez', () => {
  assert.deepEqual(splitNotes('le gusta el sushi. Odia el cilantro\ntalla M de camiseta; quiere unos airpods'),
    ['le gusta el sushi', 'Odia el cilantro', 'talla M de camiseta', 'quiere unos airpods']);
  assert.deepEqual(splitNotes('Calza un 38.'), ['Calza un 38.']);
});

test('aplicar: concierto sin año → la próxima vez que caiga, no cada año', () => {
  let p = applyToProfile(base(), classify('concierto de Rosalía el 12 de marzo', T), 'e1', T);
  assert.deepEqual([p.events[0].year, p.events[0].yearly], [2027, false]);
  p = applyToProfile(p, classify('cumple de su madre el 3 de mayo', T), 'e2', T);
  assert.deepEqual([p.events[1].year, p.events[1].yearly], [null, true]);
  p = applyToProfile(p, classify('Coldplay', T), 'e3', T);
  p = applyToProfile(p, classify('coldplay', T), 'e4', T);
  assert.deepEqual(p.tastes, ['Coldplay'], 'sin duplicar aunque cambie la mayúscula');
});

test('ciclo: antes de la regla, el primer gesto es de su fase y usa su dulce favorito', () => {
  const p = { ...base(), tastes: ['el chocolate negro'], cycle: { enabled: true, lastStart: '2026-10-31', length: 28, starts: [] } };
  // 31-oct + 28 = 28-nov → hoy faltan 4 días: premenstrual
  const g = dailyGestures(p, T, 4);
  assert.match(g[0].id, /^cg-pre-/);
  assert.equal(g.length, 4);
  assert.equal(sweetTaste(p), 'chocolate negro');
  const all = ['cg-pre-dulce'].map(() => g.find((x) => x.id === 'cg-pre-dulce'));
  if (all[0]) assert.match(all[0].t, /chocolate negro/);
  const msgs = genericMessages(p, '25-34', 'pareja', T);
  assert.equal(msgs.length, 3);
  assert.match(msgs[0].id, /^cm-pre-/);
  assert.ok(!msgs.some((m) => /regla/i.test(m.text)), 'el mensaje nunca menciona la regla');
});

test('ciclo apagado: todo como siempre', () => {
  const g = dailyGestures(base(), T, 4);
  assert.ok(g.every((x) => !x.id.startsWith('cg-')));
});

test('gustos: propone planes con lo que le gusta, y solo si es comida o un plan conocido', () => {
  const p = { ...base(), tastes: ['el sushi', 'la playa', 'Coldplay'] };
  const t = tasteMessages(p, 'pareja');
  assert.equal(t.length, 2);
  assert.match(t[0].t, /sushi/);
  assert.match(t[1].t, /a la playa/);
  assert.equal(tasteMessages({ ...base(), tastes: ['Coldplay'] }, 'pareja').length, 0);
});

test('hora: buenos días solo por la mañana', () => {
  assert.equal(fitsHour({ tod: 'm' }, 9), true);
  assert.equal(fitsHour({ tod: 'm' }, 21), false);
  assert.equal(fitsHour({ tod: 'n' }, 23), true);
  assert.equal(fitsHour({ tod: 'n' }, 11), false);
  assert.equal(fitsHour({}, 3), true);
  const night = genericMessages(base(), '25-34', 'pareja', T, 30, { hour: 22 });
  assert.ok(!night.some((m) => m.id === 'pa-desperte'));
});

test('eventos: suerte el día antes y el mismo día, y «¿qué tal fue?» al día siguiente', () => {
  assert.equal(eventPhrase('Entrevista'), 'la entrevista');
  assert.equal(eventPhrase('Viaje a Roma'), 'el viaje a Roma');
  assert.equal(eventPhrase('Boda de su prima'), 'la boda de tu prima');
  const p = { ...base(), events: [{ id: 'a', text: 'Examen de conducir', month: 11, day: 25, year: 2026, yearly: false }, { id: 'b', text: 'Concierto de Rosalía', month: 11, day: 23, year: 2026, yearly: false }] };
  const hooks = generateHooks(p, T).hooks.filter((h) => h.kind === 'event');
  const byId = Object.fromEntries(hooks.map((h) => [h.id, h.message]));
  assert.match(byId['ev-a-manana'], /examen de conducir/);
  assert.match(byId['ev-b-ayer'], /lo del concierto de Rosalía/);
  // Su cumple no se repite aquí (ya sale por su fecha de nacimiento)
  const q = { ...base(), events: [{ id: 'c', text: 'Su cumple', month: 11, day: 24, year: null, yearly: true }] };
  assert.equal(generateHooks(q, T).hooks.filter((h) => h.kind === 'event').length, 0);
});
