import * as S from './store.js';
import { ui, esc, niceDate, daysBetween } from './ui.js';
import { multiLine, barChart } from './charts.js';
export function journey(s) {
  const products = [...new Set([...s.routine.steps.map(st => st.product), ...s.observations.map(o => o.product)].filter(Boolean))];
  const product = products.includes(ui.journeyProduct) ? ui.journeyProduct : products[0];
  const steps = s.routine.steps.filter(st => st.product === product);
  const observations = s.observations.filter(o => o.product === product).sort((a,b)=>a.date.localeCompare(b.date));
  const dates = [...steps.map(st=>st.from),...observations.map(o=>o.date)].filter(Boolean).sort();
  const start = dates[0], weeks = start ? Math.min(104, Math.floor(daysBetween(start,S.dkey()) / 7)+1) : 0;
  const adherence = [...Array(weeks)].map((_,w) => {
    let scheduled=0,done=0;
    for(let i=0;i<7;i++) {
      const d=S.addDays(new Date(start+'T00:00:00'),w*7+i), key=S.dkey(d);
      if(key>S.dkey()) continue;
      for(const st of S.stepsOn({...s,routine:{steps}},d)) { scheduled++; if(s.logs[key]?.[st.id]) done++; }
    }
    return {label:'W'+(w+1),value:scheduled ? Math.round(done/scheduled*100):0, scheduled};
  });
  return `<section class="card journey"><div class="journey-heading"><div><span class="badge">${S.mode()==='demo' ? 'Illustrative demo · 8 weeks' : 'Your recorded journey'}</span><h2>Small habits. A clearer picture.</h2><p>See how your routine and observations change over time, by product.</p></div>${product ? `<label>Product<select data-change="journey-product">${products.map(p=>`<option ${p===product?'selected':''}>${esc(p)}</option>`).join('')}</select></label>`:''}</div>
  ${!product ? '<p>Add a product to your routine and record a check-in to start your journey.</p><a class="btn primary" href="#routine">Build my routine</a>' : `<div class="stats three"><div class="stat"><small>Journey week</small><b>${weeks}</b></div><div class="stat"><small>Linked check-ins</small><b>${observations.length}</b></div><div class="stat"><small>Latest routine week</small><b>${adherence.at(-1)?.scheduled ? adherence.at(-1).value+'%' : '—'}</b></div></div>
  <div class="journey-charts"><div><h3>Weekly observations · 1–5</h3>${observations.length ? multiLine([{name:'Shedding · lower = less',cls:'s1',values:observations.map(o=>o.shedding)},{name:'Itch · lower = calmer',cls:'s2',values:observations.map(o=>o.itch)},{name:'Thickness · higher = fuller',cls:'s3',values:observations.map(o=>o.thickness)}],observations.map(o=>'W'+(Math.floor(daysBetween(start,o.date)/7)+1)),'Recorded product observations') : '<p>No check-ins linked to this product yet. Select it in your next weekly check-in.</p>'}</div><div><h3>Scheduled steps completed · %</h3>${adherence.length ? barChart(adherence,'Product-specific weekly adherence') : '<p>No scheduled steps yet.</p>'}<p class="hint">Calculated from this product’s scheduled steps. The current week may be partial.</p></div></div>
  <div class="journey-milestones"><span><b>${niceDate(start)}</b>Journey started</span>${observations.length ? `<span><b>${niceDate(observations.at(-1).date)}</b>Latest check-in · you are here</span>`:''}${s.refill?.product===product ? `<span><b>${niceDate(s.refill.start)}</b>Current pack opened · <a href="#refill">View refill plan</a></span>`:''}</div>`}
  <p class="note">${S.mode()==='demo' ? 'Fictional sample history for demonstration. ' : ''}Observations are subjective, not a clinical score or proof that a product caused a change. No future results are predicted.</p><a class="link" href="#progress/checkin">Record a weekly check-in →</a></section>`;
}
