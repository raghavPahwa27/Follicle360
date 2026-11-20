// Sample data so the tools can be tried straight away. Everything is clearly marked "sample".
import { PRODUCTS } from './data.js';
import * as S from './store.js';

export async function seedDemo() {
  // Separate storage namespace; switching modes never replaces normal records.
  const previous = S.mode();
  S.setMode('demo');
  if (S.load().demoVersion === 2) return;
  const s = S.empty(), ago = n => S.dkey(S.addDays(new Date(), -n)), start = ago(55);
  s.demoVersion = 2;
  const selected = PRODUCTS.filter(p => ['serum', 'shampoo'].includes(p.id));
  for (const p of selected) for (const item of p.items) s.routine.steps.push({ ...item, time: item.slot === 'night' ? '21:30' : '08:00', from: start, product: p.name, note: item.hint, remind: true });
  let seed = 31;
  const rand = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  for (let n = 55; n >= 0; n--) {
    const d = S.addDays(new Date(), -n), week = Math.floor((55 - n) / 7);
    const chance = [0.6, 0.75, 0.82, 0.65, 0.86, 0.9, 0.95, 0.96][week];
    s.logs[S.dkey(d)] = Object.fromEntries(S.stepsOn(s, d).map(st => [st.id, rand() < chance]));
  }
  const notes = ['Started tracking and learning the routine.', 'Missed a few steps on busy mornings.', 'Kept a more consistent evening routine.', 'Travel week: missed some scheduled steps.', 'Back to the usual routine; opened a new pack.', 'Kept the same photo angle and lighting.', 'Recorded observations even without obvious changes.', 'Reviewed the full journey and planned the next refill.'];
  for (let w = 0; w < 8; w++) {
    const date = ago(49 - w * 7), d = new Date(date + 'T00:00:00');
    const thursday = new Date(d); thursday.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const year = thursday.getFullYear(), jan4 = new Date(year, 0, 4);
    const week = 1 + Math.round(((thursday - jan4) / 864e5 - 3 + (jan4.getDay() + 6) % 7) / 7);
    const values = [...Array(7)].map((_, i) => S.pctOn(s, S.addDays(d, i - 6))).filter(v => v !== null);
    s.observations.push({ id: 'demo-obs-' + w, date, weekKey: `${year}-W${String(week).padStart(2,'0')}`, product: selected[0].name, shedding: [3,4,4,3,3,2,3,2][w], itch: [3,3,2,3,2,2,1,2][w], thickness: [2,2,2,2,3,3,3,3][w], adherence: Math.round(values.reduce((a,b)=>a+b,0)/values.length*100), note: '(Sample) ' + notes[w] });
  }
  for (const [n, label] of [[55,'Start'],[28,'Week 4'],[0,'Week 8']]) {
    s.photos.push({id:'demo8-photo-'+n,date:ago(n),label:'Crown / top',note:label+' · Supplied reference image; date is an illustrative demo checkpoint, not verified treatment progress.'});
  }
  s.finder = { level: 'foundation', products: ['serum','shampoo'], why: ['Sample profile for an interview walkthrough.'], answers: { concern: 'fall', duration: 'new', pattern: 'none', topical: 'no', sensitive: 'no', redflag: 'no', additional: 'Sample profile; these products are for demonstrating tracking.' }, date:start };
  s.packs = [{id:'demo-pack',date:start,product:'Procapil Serum (sample)',batch:'DEMO-024',expiry:S.dkey(S.addDays(new Date(),365)),order:'DEMO-001',issues:[],photoIds:[],other:''}];
  s.refill = { product: selected[0].name, start: ago(25), duration:30, buffer:12, handling:2 };
  if (!S.save(s)) { S.setMode(previous); throw new Error('Could not store demo data'); }
}
