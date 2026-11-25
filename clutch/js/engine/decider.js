// Decisor rápido local ($0, sin servidor): 3 planes o cenas según clima, presupuesto y tiempo.
// Se adapta ligeramente usando gustos y evitando cosas en p.avoid.

const PLANS = [
  { id: 'p-cafe', title: 'Café tranquilo y paseo corto', mood: 'cualquier', budget: 'bajo', mins: 45, tag: 'Charla sin móvil' },
  { id: 'p-helado', title: 'Helado o batido caminando al atardecer', mood: 'soleado', budget: 'bajo', mins: 40, tag: 'Espontáneo' },
  { id: 'p-sofa', title: 'Peli elegida a suertes + palomitas caseras', mood: 'lluvia', budget: 'bajo', mins: 120, tag: 'Casa acogedora' },
  { id: 'p-picnic', title: 'Picnic improvisado en parque o mirador', mood: 'soleado', budget: 'bajo', mins: 90, tag: 'Aire libre' },
  { id: 'p-tapas', title: 'Ruta de dos tapas por sitios distintos', mood: 'cualquier', budget: 'medio', mins: 90, tag: 'Movimiento' },
  { id: 'p-cocina', title: 'Cocinar juntos una receta nueva con música', mood: 'lluvia', budget: 'medio', mins: 90, tag: 'En equipo' },
  { id: 'p-mercado', title: 'Mercadillo o librería + desayuno lento', mood: 'soleado', budget: 'medio', mins: 90, tag: 'Mañana' },
  { id: 'p-copa', title: 'Mirador o terraza tranquila al caer la tarde', mood: 'cualquier', budget: 'medio', mins: 75, tag: 'Vista bonita' },
  { id: 'p-cena', title: 'Cena en sitio íntimo sin mirar el reloj', mood: 'cualquier', budget: 'alto', mins: 150, tag: 'Clásico que suma' },
  { id: 'p-teatro', title: 'Teatro, concierto pequeño o monólogo', mood: 'lluvia', budget: 'alto', mins: 150, tag: 'Diferente' },
  { id: 'p-escapada', title: 'Escapada corta de medio día cerca de casa', mood: 'soleado', budget: 'alto', mins: 240, tag: 'Desconexión' },
  { id: 'p-juegos', title: 'Juegos de mesa o cartas con algo rico de picar', mood: 'lluvia', budget: 'bajo', mins: 75, tag: 'Risas' },
  { id: 'p-brunch', title: 'Brunch sin prisas fuera de casa', mood: 'cualquier', budget: 'medio', mins: 90, tag: 'Fin de semana' },
  { id: 'p-museo', title: 'Exposición o museo + café de después', mood: 'lluvia', budget: 'medio', mins: 120, tag: 'Cultural' }
];

const BUDGET_RANK = { bajo: 1, medio: 2, alto: 3 };

export function decidePlans(profile, { weather = 'cualquier', budget = 'medio', time = 90 } = {}, seed = 0) {
  const likes = (profile?.likes || []).map((s) => String(s).toLowerCase()).join(' ');
  const avoids = (profile?.avoid || []).map((s) => String(s).toLowerCase()).filter(Boolean);
  const maxB = BUDGET_RANK[budget] || 2;
  const maxM = Number(time) || 90;

  const scored = PLANS
    .filter((p) => !avoids.some((a) => p.title.toLowerCase().includes(a)))
    .map((p, i) => {
      let score = 0;
      if (p.mood === weather) score += 4;
      else if (p.mood === 'cualquier') score += 2;
      if (BUDGET_RANK[p.budget] <= maxB) score += BUDGET_RANK[p.budget] === maxB ? 3 : 2;
      if (p.mins <= maxM) score += 3;
      if (likes && likes.split(/\s+/).some((w) => w.length > 3 && p.title.toLowerCase().includes(w))) score += 2;
      const tie = ((i + seed) % PLANS.length) * 0.01;
      return { ...p, score: score + tie };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3);
}
