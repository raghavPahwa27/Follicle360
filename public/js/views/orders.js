import * as S from '../store.js';
import { ui, toast, esc, niceDate } from '../ui.js';
const day = k => Date.parse(k + 'T00:00:00Z') / 86400000;
const key = n => new Date(n * 86400000).toISOString().slice(0, 10);
export function timeline(p, today = S.dkey()) {
  const end = day(p.start) + p.duration, reorder = end - p.buffer - p.handling;
  return { end: key(end), reorder: key(reorder), left: Math.max(0, end - day(today)), percent: Math.max(0, Math.min(100, (end - day(today)) / p.duration * 100)), due: day(today) >= reorder };
}
export const orders = {
  id: 'refill', nav: 'Refill', kicker: 'Stay stocked', icon: 'truck', title: 'Refill Planner',
  pain: 'I forget to reorder and my routine breaks.',
  lead: 'Plan ahead so your next pack can arrive before your current supply runs out.',
  status(s) { if (!s.refill) return 'Plan your next refill'; const t = timeline(s.refill); return t.due ? 'Refill reminder: reorder due' : `${t.left} estimated days remaining`; },
  render(s) {
    const p = s.refill || { product: '', start: S.dkey(), duration: 30, buffer: 12, handling: 2 }, t = timeline(p);
    return `<div class="refill-grid"><form id="refill" class="card stack-form"><span class="badge">Supply planner</span><h2>Keep your routine going</h2><p>Allow time for delivery and handling before your supply runs out. Adjust these estimates to match your product and seller.</p>
    <label>Product or kit<input name="product" maxlength="80" required value="${esc(p.product)}" placeholder="e.g. My daily serum"></label>
    <label>Date you started this pack<input name="start" type="date" required max="${S.dkey()}" value="${p.start}"></label>
    <div class="fields two"><label>Supply duration (days)<input name="duration" type="number" min="1" max="730" required value="${p.duration}"></label><label>Delivery buffer (days)<input name="buffer" type="number" min="0" max="90" required value="${p.buffer}"></label><label>Handling buffer (days)<input name="handling" type="number" min="0" max="30" required value="${p.handling}"></label></div>
    <button class="btn primary big">Calculate & save timeline</button><p class="hint">Use the label or your own experience to estimate supply duration. This does not recommend a dose.</p></form>
    <section class="card refill-timeline"><span class="badge">Your refill timeline</span>${s.refill ? `<h2>${esc(p.product)}</h2><p class="refill-alert ${t.due ? 'neg' : 'pos'}">${!t.left ? 'Estimated supply exhausted' : t.due ? 'Time to reorder — inside your delivery buffer' : 'Supply on track'}</p><progress max="100" value="${t.percent}" aria-label="Estimated supply remaining"></progress><div class="refill-stats"><div><strong>${t.left}</strong><span>Estimated days remaining</span></div><div><strong>${niceDate(t.reorder)}</strong><span>Target reorder date</span></div></div><ol class="timeline"><li><div><b>${niceDate(p.start)} · Pack started</b><p>${p.duration}-day estimated supply</p></div></li><li><div><b>${niceDate(t.reorder)} · Reorder target</b><p>Allows ${p.buffer} delivery days + ${p.handling} handling days</p></div></li><li><div><b>${niceDate(t.end)} · Estimated run-out date</b><p>Actual usage and delivery times may vary.</p></div></li></ol><div class="row"><button class="btn primary" data-act="refill-calendar">Download calendar reminder</button><a class="btn outline" href="https://manmatters.com/" target="_blank" rel="noopener noreferrer">Visit Man Matters ↗</a></div><p class="hint">Import the downloaded file into your calendar to enable its reminder. No automatic order is placed.</p><button class="link" data-act="refill-new">New pack started today</button>` : '<h2>Your next refill, planned</h2><p>Enter your pack details to see days remaining, your reorder target and a supply timeline.</p>'}</section></div>`;
  },
  submits: { refill(f) {
    const p = { product: f.get('product').trim(), start: f.get('start'), duration: Number(f.get('duration')), buffer: Number(f.get('buffer')), handling: Number(f.get('handling')) };
    if (!p.product || !Number.isFinite(day(p.start)) || p.start > S.dkey() || !Number.isInteger(p.duration) || p.duration < 1 || p.duration > 730 || !Number.isInteger(p.buffer) || p.buffer < 0 || p.buffer > 90 || !Number.isInteger(p.handling) || p.handling < 0 || p.handling > 30) return toast('Check the dates and day counts.');
    const s = S.load(); s.refill = p; if (!S.save(s)) return toast('Could not save. Device storage may be full.'); ui.refresh(); toast('Refill plan saved');
  } },
  actions: {
    'refill-new'() { if (!confirm('Start a new supply cycle today using the same duration?')) return; const s = S.load(); s.refill.start = S.dkey(); if (!S.save(s)) return toast('Could not save'); ui.refresh(); },
    'refill-calendar'() {
      const p = S.load().refill; if (!p) return;
      const t = timeline(p), date = t.reorder < S.dkey() ? S.dkey() : t.reorder;
      const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Follicle360//Refill//EN','BEGIN:VEVENT',`UID:refill-${S.uid()}@follicle360.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${date.replaceAll('-','')}`,`DTEND;VALUE=DATE:${key(day(date)+1).replaceAll('-','')}`,'SUMMARY:Reorder your hair-care supply',`DESCRIPTION:Open Follicle360 to review your refill plan. Estimated run-out: ${t.end}`,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Time to reorder your supply','TRIGGER:PT9H','END:VALARM','END:VEVENT','END:VCALENDAR'];
      const url = URL.createObjectURL(new Blob([lines.join('\r\n')+'\r\n'], {type:'text/calendar'})), a = document.createElement('a'); a.href=url; a.download='follicle360-refill.ics'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast('Import the file into your calendar to set the reminder.');
    }
  }
};
