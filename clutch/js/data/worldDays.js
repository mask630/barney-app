// Días mundiales. Regla de producto: SOLO se usan los verificados (verified:true).
// Las entradas con verified:false se ignoran en ejecución hasta confirmar la fecha con fuente.

export const WORLD_DAYS = [
  {
    id: 'pasta',
    month: 10,
    day: 25,
    name: { es: 'Día Mundial de la Pasta', en: 'World Pasta Day' },
    tags: ['pasta', 'italiano', 'comida', 'cocinar'],
    ideas: {
      amiga: 'hoy es el Día Mundial de la Pasta. Te debo una cena de pasta, tú eliges el sitio.',
      flirt: 'hoy es el Día Mundial de la Pasta. Yo cocino, tú eliges la salsa. ¿Trato?',
      pareja: 'hoy es el Día Mundial de la Pasta. Cena en casa: yo cocino y tú eliges la salsa.'
    },
    verified: true,
    verifiedAt: '2026-10-22',
    sources: ['https://www.skyminder.com/', 'https://days.fead.co/']
  },
  // Pendientes de verificar con fuente antes de activarse:
  { id: 'chocolate', month: 7, day: 7, name: { es: 'Día Mundial del Chocolate' }, tags: ['chocolate', 'dulce'], ideas: {}, verified: false, sources: [] },
  { id: 'kiss', month: 7, day: 6, name: { es: 'Día Internacional del Beso' }, tags: ['beso'], ideas: {}, verified: false, sources: [] },
  { id: 'coffee', month: 10, day: 1, name: { es: 'Día Internacional del Café' }, tags: ['café'], ideas: {}, verified: false, sources: [] }
];

export function verifiedWorldDays() {
  return WORLD_DAYS.filter((d) => d.verified === true && d.sources.length > 0 && d.ideas.amiga && d.ideas.flirt && d.ideas.pareja);
}
