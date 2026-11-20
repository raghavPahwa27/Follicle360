// Tool 3 - Routine & Guidance: custom daily steps, reminders, completion tracking and product usage guidance.
import { PRODUCTS, TIPS, WEEKDAYS } from '../data.js';
import * as S from '../store.js';
import { ring, barChart } from '../charts.js';
import { ui, toast, esc, niceDate, longDate } from '../ui.js';
import { icon } from '../icons.js';

const daysText = (d) => (!d || d.length === 7 ? 'Every day' : WEEKDAYS.filter(([k]) => d.includes(+k)).map(([, n]) => n).join(', '));
const nowHM = () => new Date().toTimeString().slice(0, 5);

// ---------- Today ----------
const taskRow = (log, key) => (st) => {
  const late = key === S.dkey() && !log[st.id] && st.time < nowHM();
  return `<button class="task ${log[st.id] ? 'done' : ''}" data-act="toggle" data-id="${st.id}" aria-pressed="${!!log[st.id]}">
  <span class="tick">${icon('check', 16)}</span>
  <span class="txt"><b>${esc(st.name)}</b><em>${st.product ? `${esc(st.product)} · ` : ''}${esc(st.note || '')}</em></span>
  <span class="when ${late ? 'late' : ''}">${st.time}${late ? ' · due' : ''}</span></button>`;
};

const quickAdd = (s) => `<div class="chips quick-add">${PRODUCTS.filter((p) => !p.items.every((i) => s.routine.steps.some((st) => st.id === i.id)))
  .map((p) => `<button class="chip btn-chip" data-act="routine-add" data-id="${p.id}">${icon('plus', 14)} ${p.name}</button>`).join('')}</div>`;

function todayTab(s) {
  const steps = s.routine.steps;
  if (!steps.length) return `<section class="card empty-state routine-today"><h2>Build your routine</h2>
    <p>Add the products you use, or create your own steps with your own times. Nothing else needs to be set up first.</p>
    <h3>Add a product</h3>${quickAdd(s)}
    <div class="row"><a class="btn primary" href="#routine/plan">${icon('plus', 18)} Create a custom step</a></div></section>`;

  const todayK = S.dkey(), key = ui.day && ui.day <= todayK ? ui.day : todayK, date = new Date(`${key}T00:00:00`);
  const items = S.stepsOn(s, date), log = s.logs[key] || {}, done = items.filter((i) => log[i.id]).length, start = S.startKey(s);
  const group = (name) => { const list = items.filter((i) => S.period(i.time) === name); return list.length ? `<div class="slot"><h3>${icon(name === 'Morning' ? 'sun' : name === 'Evening' ? 'moon' : 'spark', 18)} ${name}</h3>${list.map(taskRow(log, key)).join('')}</div>` : ''; };
  const heat = S.lastN(s, 28).map((d) => `<button class="cell ${d.pct === null ? 'none' : d.pct >= 0.7 ? 'hi' : d.pct > 0 ? 'mid' : 'lo'} ${d.key === key ? 'sel' : ''}" data-act="day" data-d="${d.key}" ${d.key < start ? 'disabled' : ''}
    title="${niceDate(d.key)}${d.pct === null ? '' : `: ${Math.round(d.pct * 100)}%`}" aria-label="${niceDate(d.key)}"><span>${new Date(`${d.key}T00:00:00`).getDate()}</span></button>`).join('');

  return `<div class="grid routine-today">
    <section class="card summary"><div><span class="badge">Week ${S.weekOf(s)} of your routine</span><h2>Day ${S.daysIn(s)}</h2>
      <p>Started ${longDate(start)}. Missing a day is fine. Consistency over weeks matters more than one perfect day.</p>
      <div class="streak">${icon('flame', 18)} <b>${S.streak(s)}</b> day streak</div></div>${ring(S.consistency(s))}</section>
    <section class="card tasks"><div class="tasks-head"><h2>${key === todayK ? 'Today’s routine' : `Routine for ${niceDate(key)}`}</h2><span>${done} / ${items.length}</span></div>
      <div class="daynav"><button class="btn outline small" data-act="day-step" data-n="-1" ${key <= start ? 'disabled' : ''}>${icon('back', 14)} Previous</button>
        ${key !== todayK ? '<button class="btn small" data-act="day" data-d="' + todayK + '">Back to today</button>' : ''}
        <button class="btn outline small" data-act="day-step" data-n="1" ${key >= todayK ? 'disabled' : ''}>Next ${icon('arrow', 14)}</button></div>
      <div class="bar-track"><i style="width:${items.length ? (done / items.length) * 100 : 0}%"></i></div>
      ${items.length && done === items.length ? '<p class="perfect">Every step done.</p>' : ''}
      ${items.length ? ['Morning', 'Afternoon', 'Evening'].map(group).join('') : '<p class="muted">Nothing scheduled for this day.</p>'}</section>
    <aside class="side">
      <section class="card"><h3>Last 4 weeks</h3><p class="muted">Tap a day to view or fix it.</p><div class="heat">${heat}</div>
        <div class="legend small"><span class="key hi"><i></i>70%+</span><span class="key mid"><i></i>Some</span><span class="key lo"><i></i>None</span></div></section>
      <section class="card tip"><h3>${icon('spark', 18)} Tip of the day</h3><p>${TIPS[new Date().getDate() % TIPS.length]}</p></section>
    </aside>
    <section class="card wide"><h3>Weekly consistency</h3><p class="muted">Share of your routine completed each week.</p>${barChart(S.weeklyConsistency(s))}</section></div>`;
}

// ---------- Plan & reminders ----------
function stepForm() {
  const st = S.load().routine.steps.find((x) => x.id === ui.editStep), d = st?.days;
  return `<form id="step" class="card stack-form"><h2>${st ? 'Edit step' : 'Add a custom step'}</h2>
    <label class="field">Step name<input name="name" required maxlength="60" placeholder="e.g. Scalp massage, Evening gummy" value="${esc(st?.name || '')}"></label>
    <div class="fields"><label>Time<input type="time" name="time" required value="${st?.time || '08:00'}"></label>
      <label>Starts on<input type="date" name="from" max="${S.dkey()}" required value="${st?.from || S.dkey()}"></label>
      <label>Product (optional)<input name="product" maxlength="40" value="${esc(st?.product || '')}"></label></div>
    <fieldset><legend>Days</legend><div class="daypick">${WEEKDAYS.map(([k, n]) => `<label><input type="checkbox" name="days" value="${k}" ${!d || d.includes(+k) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></fieldset>
    <label class="field">Note (optional)<input name="note" maxlength="120" placeholder="e.g. On a dry scalp, as per the label" value="${esc(st?.note || '')}"></label>
    <label class="check"><input type="checkbox" name="remind" ${st && !st.remind ? '' : 'checked'}> Include in my calendar reminders</label>
    <div class="row"><button class="btn primary">${icon('check', 18)} ${st ? 'Save changes' : 'Add step'}</button>${st ? '<button type="button" class="btn outline" data-act="step-cancel">Cancel</button>' : ''}</div></form>`;
}

function planTab(s) {
  const steps = [...s.routine.steps].sort((a, b) => a.time.localeCompare(b.time));
  const list = steps.length ? `<section class="card"><h3>Your steps</h3><ul class="history steps-list">${steps.map((st) => `<li>
    <div class="rec-main"><b>${esc(st.name)}</b><span>${st.time} · ${daysText(st.days)}${st.product ? ` · ${esc(st.product)}` : ''}${st.remind ? '' : ' · no reminder'}</span></div>
    <span class="acts"><button class="link" data-act="step-edit" data-id="${st.id}">Edit</button><button class="link" data-act="step-del" data-id="${st.id}">Delete</button></span></li>`).join('')}</ul></section>`
    : '<section class="card"><p class="muted">No steps yet. Add a product below or create a custom step.</p></section>';
  const times = [...new Set(steps.filter((x) => x.remind).map((x) => x.time))].join(', ');
  return `<div class="stack">${list}
    <section class="card"><h3>Add a product</h3><p class="muted">Adds that product's usual steps. You can change the times afterwards.</p>${quickAdd(s) || '<p class="muted">All products are already in your routine.</p>'}</section>
    ${stepForm()}
    <section class="card"><h3>${icon('download', 18)} Reminders</h3>
      <p>${times ? `Download a calendar file with repeating reminders at ${times}. Open it to add them to your phone or computer calendar.` : 'Add a step with reminders turned on to create a calendar file.'}</p>
      <button class="btn outline small" data-act="ics">${icon('download', 16)} Download reminders (.ics)</button>
      <p class="note">Reminders come from your calendar app, so they work even when this page is closed. This app does not send notifications on its own.</p></section></div>`;
}

// ---------- Guidance ----------
const guideTab = (s) => `<div class="stack"><p class="note">${icon('alert', 14)} This is general information. Your product label and your doctor's advice always come first, and nothing here is a dose or a prescription.</p>
  ${PRODUCTS.map((p) => `<details class="card guide"><summary><span><b>${p.name}</b><small>${p.type}</small></span>${s.routine.steps.some((st) => p.items.some((i) => i.id === st.id)) ? '<span class="badge">In your routine</span>' : ''}</summary>
    <h4>How to use</h4><p>${p.usage.how}</p>
    <h4>Tips</h4><ul class="ticks">${p.usage.tips.map((t) => `<li>${icon('check', 16)} ${t}</li>`).join('')}</ul>
    <h4>When to stop and ask</h4><p>${p.usage.stop}</p>
    <button class="btn outline small" data-act="routine-add" data-id="${p.id}">${icon('plus', 16)} Add to my routine</button></details>`).join('')}
  <section class="card"><h3>Good habits for any routine</h3><ul class="ticks">${TIPS.slice(0, 4).map((t) => `<li>${icon('check', 16)} ${t}</li>`).join('')}</ul></section></div>`;

// ---------- calendar file ----------
const ics = (t) => String(t).replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function downloadReminders(s) {
  const steps = s.routine.steps.filter((st) => st.remind);
  if (!steps.length) return toast('No steps have reminders turned on');
  const day = S.dkey().replaceAll('-', '');
  const events = steps.map((st) => `BEGIN:VEVENT\r\nUID:follicle360-${st.id}@local\r\nDTSTAMP:${day}T000000Z\r\nDTSTART:${day}T${st.time.replace(':', '')}00\r\nRRULE:${!st.days || st.days.length === 7 ? 'FREQ=DAILY' : `FREQ=WEEKLY;BYDAY=${st.days.map((d) => BYDAY[d]).join(',')}`}\r\nSUMMARY:${ics(`Follicle360: ${st.name}`)}\r\nBEGIN:VALARM\r\nTRIGGER:PT0M\r\nACTION:DISPLAY\r\nDESCRIPTION:${ics(`${st.name}. Follow your product label.`)}\r\nEND:VALARM\r\nEND:VEVENT`);
  const file = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Follicle360//EN\r\n${events.join('\r\n')}\r\nEND:VCALENDAR`;
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([file], { type: 'text/calendar' })), download: 'follicle360-reminders.ics' });
  document.body.append(a); a.click(); a.remove();
  toast('Reminders downloaded. Open the file to add them.');
}

export const routine = {
  id: 'routine', nav: 'Routine', kicker: 'Daily steps & reminders', icon: 'routine', title: 'Routine & Guidance',
  pain: 'I keep forgetting to use it on busy days.',
  lead: 'Build your own daily routine, tick steps off, set calendar reminders and read general usage guidance for each product.',
  tabs: [['today', 'Today'], ['plan', 'Plan & reminders'], ['guide', 'Product guidance']],
  status(s) {
    if (!s.routine.steps.length) return 'Build your routine';
    const items = S.stepsOn(s), log = s.logs[S.dkey()] || {};
    return `${items.filter((i) => log[i.id]).length}/${items.length} today · ${S.streak(s)}-day streak`;
  },

  render(s, tab) { return tab === 'plan' ? planTab(s) : tab === 'guide' ? guideTab(s) : todayTab(s); },

  actions: {
    toggle(el) { const s = S.load(); S.toggle(s, el.dataset.id, ui.day && ui.day <= S.dkey() ? ui.day : S.dkey()); ui.refresh(); },
    day(el) { if (!el.disabled) { ui.day = el.dataset.d; ui.refresh(); } },
    'day-step'(el) {
      const cur = ui.day || S.dkey(), next = S.dkey(S.addDays(new Date(`${cur}T00:00:00`), +el.dataset.n));
      if (next <= S.dkey() && next >= S.startKey(S.load())) { ui.day = next; ui.refresh(); }
    },
    'routine-add'(el) {
      const s = S.load(), n = S.addProduct(s, el.dataset.id);
      toast(n ? 'Added to your routine' : 'Already in your routine'); ui.refresh();
    },
    'step-edit'(el) { ui.editStep = el.dataset.id; ui.refresh(); document.getElementById('step')?.scrollIntoView({ behavior: 'smooth' }); },
    'step-cancel'() { ui.editStep = null; ui.refresh(); },
    'step-del'(el) {
      if (!confirm('Delete this step? Past ticks for it are no longer counted.')) return;
      const s = S.load(); s.routine.steps = s.routine.steps.filter((x) => x.id !== el.dataset.id); S.save(s);
      if (ui.editStep === el.dataset.id) ui.editStep = null;
      ui.refresh();
    },
    ics() { downloadReminders(S.load()); },
  },
  submits: {
    step(f) {
      const s = S.load(), days = f.getAll('days').map(Number);
      if (!days.length) return toast('Pick at least one day');
      const data = { name: f.get('name').trim(), time: f.get('time'), from: f.get('from'), product: f.get('product').trim(), note: f.get('note').trim(), days: days.length === 7 ? null : days, remind: f.has('remind') };
      const st = s.routine.steps.find((x) => x.id === ui.editStep);
      if (st) Object.assign(st, data); else s.routine.steps.push({ id: S.uid(), ...data });
      S.save(s); toast(st ? 'Step updated' : 'Step added'); ui.editStep = null; ui.refresh();
    },
  },
};
