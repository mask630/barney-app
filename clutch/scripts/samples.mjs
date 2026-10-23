import { generateHooks } from '../js/engine/hooks.js';
const MAD = { lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid', city: 'Madrid' };
const bands = [['18-24','2006-03-01'],['25-34','1997-03-01'],['35-49','1982-03-01'],['50+','1965-03-01']];
const stages = ['rollo','citas','pareja','matrimonio'];
const day = process.argv[2] || '2026-10-25';
for (const [label, birth] of bands) {
  console.log(`\n=== ${label} · ${day} ===`);
  for (const stage of stages) {
    const r = generateHooks({ name:'Lucía', birth, stage, since:'2026-07-17', tastes:['pasta'], location:MAD }, day);
    const h = r.hooks.find(x => x.id==='world-pasta') || r.hooks.find(x=>x.message);
    console.log(`${stage.padEnd(11)} ${h?.message}`);
  }
}
