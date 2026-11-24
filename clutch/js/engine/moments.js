// Lo que hace que un mensaje o un gesto suene a él y no a una app: su ciclo, lo que le gusta y la hora del día.
// - Ciclo: cada fase trae sus gestos y mensajes (chocolate antes de la regla, una cita en sus días de más energía…).
//   Nunca se menciona la regla en el mensaje: ella no tiene por qué saber que él lo lleva apuntado.
// - Gustos: si le gusta algo de comer o un plan conocido, sale una propuesta con eso («¿pedimos sushi esta noche?»).
// - Hora: los de «buenos días» solo por la mañana y los de «buenas noches» solo por la noche.
// Todo usa datos que él ha apuntado; nada inventado.

import { hashStr } from './rotation.js';

const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// «comida favorita: la pasta» → «pasta»; «el chocolate negro» → «chocolate negro»
const bare = (s) => String(s).replace(/^.*:\s*/, '').replace(/^(?:el|la|los|las|un|una|unos|unas)\s+/i, '').trim();

const SWEETS = /chocolate|bombon|helado|dulce|tarta|pastel|galleta|cookie|donut|gofre|brownie|tiramisu|nutella|kinder|chuche|gominola|croissant|churro|napolitana|crepe|natillas|flan|mochi|macaron/;
const FOODS = /sushi|pizza|ramen|taco|hamburguesa|burger|pasta|tapas|paella|poke|brunch|mexicano|japones|italiano|indio|tailandes|coreano|thai|kebab|arroz|marisco|ceviche|dim sum|gyoza|nachos|fondue|raclette|tortilla|croquetas|vermut|vino|cerveza|mojito|coctel|gin|sangria|cafe|te matcha|matcha|chocolate|helado|churros|crepes|gofres|tarta/;
// Planes conocidos → cómo se dice «ir a…»
const PLANS = [
  [/playa/, 'a la playa'], [/montana|monte|sierra/, 'a la montaña'], [/senderismo|rutas?\b|caminar|hiking/, 'de ruta'],
  [/\bcine\b|pelis|peliculas/, 'al cine'], [/teatro/, 'al teatro'], [/museo|exposicion|arte/, 'a ver alguna exposición'],
  [/concierto|musica en directo/, 'a un concierto'], [/karaoke/, 'al karaoke'], [/bolos/, 'a los bolos'], [/escape room/, 'a un escape room'],
  [/patinar|patinaje/, 'a patinar'], [/bailar|baile|salsa|bachata/, 'a bailar'], [/mercadillo|rastro/, 'al mercadillo'], [/nieve|esquiar|ski/, 'a la nieve']
];

// Primer gusto que es un dulce (para los días de antes de la regla), o null.
export function sweetTaste(profile) {
  const t = (profile.tastes || []).find((x) => SWEETS.test(fold(x)));
  return t ? bare(t) : null;
}

function foodTastes(profile) {
  return (profile.tastes || []).filter((x) => FOODS.test(fold(x))).map(bare).filter((x) => x && x.length <= 30);
}
function planTastes(profile) {
  const out = [];
  for (const x of profile.tastes || []) {
    const hit = PLANS.find(([re]) => re.test(fold(x)));
    if (hit && !out.includes(hit[1])) out.push(hit[1]);
  }
  return out;
}

// ---------- ciclo ----------
// {dulce}: su dulce favorito si lo tiene apuntado, si no «algo dulce».
const CYCLE_GESTURES = {
  regla: [
    { id: 'cg-reg-dulce', e: 'micro', t: 'Llévale {dulce} sin que te lo pida.' },
    { id: 'cg-reg-calma', e: 'micro', t: 'Hoy plan tranquilo: manta, algo calentito y su serie. Que no tenga que pensar en nada.' },
    { id: 'cg-reg-pregunta', g: 'flirt', e: 'micro', t: 'Pregúntale qué tal está y no le propongas planes cansados estos días.' },
    { id: 'cg-reg-tareas', g: 'pareja', e: 'cuidado', t: 'Encárgate tú de la cena y de los recados de hoy, sin comentarlo.' },
    { id: 'cg-reg-infusion', g: 'pareja', e: 'micro', t: 'Prepárale una infusión o algo caliente cuando llegue.' }
  ],
  premenstrual: [
    { id: 'cg-pre-dulce', e: 'micro', t: 'Estos días ten {dulce} a mano. Puede venirle la regla pronto.' },
    { id: 'cg-pre-paciencia', e: 'micro', t: 'Si algo le molesta estos días, escucha antes de contestar. No es el momento de ganar discusiones.' },
    { id: 'cg-pre-plan', g: 'pareja', e: 'cuidado', t: 'Propón un plan en casa en vez de salir: peli, cena y sofá.' }
  ],
  ovulacion: [
    { id: 'cg-ovu-cita', e: 'cita', t: 'Buenos días para una cita especial: suele tener más ganas de salir y arreglarse.' },
    { id: 'cg-ovu-cumplido', e: 'micro', t: 'Cuando la veas, dile lo guapa que está. Con algo concreto.' },
    { id: 'cg-ovu-plan', e: 'cita', t: 'Propón un plan con gente o con música: estos días suele apetecerle más.' }
  ],
  folicular: [
    { id: 'cg-fol-nuevo', e: 'cita', t: 'Propón algo que no hayáis hecho nunca: un sitio, una clase, una ruta.' },
    { id: 'cg-fol-activo', e: 'micro', t: 'Buen momento para un plan activo: un paseo largo, deporte juntos, una excursión.' }
  ],
  lutea: [
    { id: 'cg-lut-casa', e: 'micro', t: 'Estos días suele apetecer más calma. Mejor cena en casa que un plan con prisas.' },
    { id: 'cg-lut-mimos', g: 'pareja', e: 'micro', t: 'Más mimos y menos planes: un masaje en los pies mientras veis algo.' }
  ]
};

const CYCLE_MESSAGES = {
  regla: {
    flirt: [{ id: 'cm-reg-fl', e: 'ligero', t: '¿qué tal el día? Si te apetece plan de sofá y {dulce}, me apunto a llevarlo.' }],
    pareja: [
      { id: 'cm-reg-pa1', e: 'ligero', t: 'hoy no hagas nada, que la cena y lo demás corre de mi cuenta.' },
      { id: 'cm-reg-pa2', e: 'ligero', t: '¿te llevo {dulce} luego? No me digas que no.' }
    ]
  },
  premenstrual: {
    flirt: [{ id: 'cm-pre-fl', e: 'ligero', t: '¿qué tal llevas la semana? Si necesitas desconectar, aquí estoy.' }],
    pareja: [
      { id: 'cm-pre-pa1', e: 'ligero', t: 'esta noche manta, peli y {dulce}. Ya está todo pensado.' },
      { id: 'cm-pre-pa2', e: 'ligero', t: '¿cómo lo llevas hoy? Si quieres, luego me lo cuentas todo.' }
    ]
  },
  ovulacion: {
    flirt: [
      { id: 'cm-ovu-fl1', e: 'medio', t: 'tengo ganas de verte. ¿Te viene bien esta semana?' },
      { id: 'cm-ovu-fl2', e: 'medio', t: '¿salimos a tomar algo estos días? Me apetece mucho verte.' }
    ],
    pareja: [
      { id: 'cm-ovu-pa1', e: 'medio', t: 'esta semana te invito a cenar fuera. Solo los dos.' },
      { id: 'cm-ovu-pa2', e: 'ligero', t: 'tengo unas ganas de verte esta noche…' }
    ]
  },
  folicular: {
    flirt: [{ id: 'cm-fol-fl', e: 'medio', t: '¿hacemos algo distinto este finde? Propón tú, que me apunto a lo que sea.' }],
    pareja: [{ id: 'cm-fol-pa', e: 'medio', t: '¿y si este finde probamos algo que no hayamos hecho nunca?' }]
  },
  lutea: {
    flirt: [{ id: 'cm-lut-fl', e: 'ligero', t: '¿plan tranquilo esta semana? Algo de cenar y charlar, sin prisas.' }],
    pareja: [{ id: 'cm-lut-pa', e: 'ligero', t: '¿plan de sofá esta noche? Pongo yo la cena.' }]
  }
};

const fillSweet = (it, profile) => {
  const s = sweetTaste(profile);
  return { ...it, t: it.t.replace('{dulce}', s || 'algo dulce') };
};

// g (opcional): solo para ese registro (encargarse de la cena no pega si aún no vivís juntos).
export function cycleGestures(profile, phase, group = null) {
  return (CYCLE_GESTURES[phase] || []).filter((it) => !it.g || !group || it.g === group).map((it) => fillSweet(it, profile));
}
export function cycleMessages(profile, phase, group) {
  return (CYCLE_MESSAGES[phase]?.[group] || []).map((it) => fillSweet(it, profile));
}

// ---------- gustos ----------
// Una propuesta con algo que le gusta. El id depende del gusto, para que cada uno descanse por su cuenta.
export function tasteMessages(profile, group) {
  const out = [];
  for (const f of foodTastes(profile).slice(0, 6)) {
    const id = `tm-${hashStr(fold(f)).toString(36)}`;
    const v = [
      group === 'pareja' ? `¿pedimos ${f} esta noche? Invito yo.` : `¿te apetece ${f} esta semana? Invito yo.`,
      `me ha entrado antojo de ${f}. ¿Te vienes?`
    ];
    out.push({ id, e: 'medio', t: v[hashStr(id) % v.length] });
  }
  for (const pl of planTastes(profile).slice(0, 4)) {
    const id = `tp-${hashStr(pl).toString(36)}`;
    const v = [`¿nos vamos ${pl} un día de estos?`, `tengo ganas de ir ${pl} contigo. ¿Qué día te va bien?`];
    out.push({ id, e: 'medio', t: v[hashStr(id) % v.length] });
  }
  return out;
}

// ---------- hora del día ----------
// m: solo por la mañana (antes de las 13 h) · n: solo por la noche (desde las 20 h) · sin marca: a cualquier hora.
export function fitsHour(item, hour) {
  if (hour == null || !item.tod) return true;
  return item.tod === 'm' ? hour >= 5 && hour < 13 : item.tod === 'n' ? hour >= 20 || hour < 3 : true;
}
