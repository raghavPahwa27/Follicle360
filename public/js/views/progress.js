// Tool 4 - Progress Tracker: dated photos, photo timeline, comparison, weekly self-check-ins and charts.
// Indicators are subjective self-reports — not medical measurements.
// Never create an arbitrary clinical score. Display individual observations and trends.
import { journey } from '../journey.js';
import { PHASES, ANGLES } from '../data.js';
import * as S from '../store.js';
import * as P from '../photos.js';
import { lineChart, multiLine } from '../charts.js';
import { ui, toast, imageBlob, esc, niceDate, longDate, daysBetween } from '../ui.js';
import { icon } from '../icons.js';

// New 1–5 indicator definitions (direction: 'lo-good' means 1 is best, 'hi-good' means 5 is best)
const INDICATORS = [
  { key: 'shedding', label: 'Hair shed in shower drain', lo: 'Rare strands', hi: 'Heavy clumps', dir: 'lo-good' },
  { key: 'itch', label: 'Scalp itch and discomfort', lo: 'Calm and clear', hi: 'Constant itch', dir: 'lo-good' },
  { key: 'thickness', label: 'Perceived thickness & density', lo: 'Much thinner', hi: 'Noticeably fuller', dir: 'hi-good' },
];

// Routine adherence is auto-calculated from logs — shown in the summary but not entered manually.

const photoLabel = (p) => `${niceDate(p.date)} · ${p.label}`;
const img = (p, alt) => (P.url(p.id) ? `<img src="${P.url(p.id)}" alt="${esc(alt)}">` : '<div class="ph">Loading photo…</div>');

// ---------- Week key ----------
// One check-in per calendar week (ISO: Mon–Sun). Key = "YYYY-Www"
function isoWeek(dateKey) {
  const d = new Date(`${dateKey}T00:00:00`);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = (d - startOfWeek1) / 864e5;
  const week = Math.floor(diff / 7) + 1;
  const yr = d.getFullYear();
  return `${yr}-W${String(week).padStart(2, '0')}`;
}

// Week number within a treatment (from product start date)
function treatmentWeek(state) {
  if (!state.routine.steps.length) return null;
  const start = S.startKey(state);
  return Math.ceil(S.daysIn(state) / 7);
}

// Adherence for the current week (Mon–Sun)
function weekAdherence(state) {
  const today = S.dkey();
  const d = new Date(`${today}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // 0=Mon
  const days = [...Array(dow + 1)].map((_, i) => S.dkey(S.addDays(d, i - dow)));
  const vals = days.map((k) => S.pctOn(state, new Date(`${k}T00:00:00`))).filter((v) => v !== null);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) : null;
}

// Sorted observations, newest first
const newestFirst = (obs) => [...obs].reverse();

// ---------- Photos ----------
function photosTab(s) {
  const photos = S.sortedPhotos(s), first = photos[0]?.date;
  const upload = `<form id="photo" class="card stack-form"><h2>Add a dated photo</h2>
    <p class="muted">Use the same light, angle and distance each time, with hair wet or dry the same way. Photos stay on this device.</p>
    <label class="photo">${icon('camera', 18)}<span><b>Choose or take a photo</b><small>JPG, PNG or HEIC from your camera or gallery</small></span><input type="file" name="photo" accept="image/*" required></label>
    <div class="fields"><label>Date taken<input type="date" name="date" value="${S.dkey()}" max="${S.dkey()}" required></label>
      <label>Angle<select name="label">${ANGLES.map((a) => `<option>${a}</option>`).join('')}</select></label>
      <label>Note (optional)<input name="note" maxlength="80" placeholder="e.g. after wash"></label></div>
    <button class="btn primary">${icon('plus', 18)} Save photo</button></form>`;
  const grid = photos.length ? `<section class="card"><h3>Photo timeline</h3><p class="muted">Oldest first. ${photos.length} photo${photos.length > 1 ? 's' : ''}.</p>
    <div class="shots">${photos.map((p) => `<figure class="shot">
      ${P.url(p.id) ? `<a href="${P.url(p.id)}" target="_blank" rel="noopener" title="Open full size"><img src="${P.url(p.id)}" alt="Hair photo, ${esc(photoLabel(p))}" loading="lazy"></a>` : '<div class="ph">Loading…</div>'}
      <figcaption><b>${longDate(p.date)}</b><span>${esc(p.label)}${p.date !== first ? ` · +${daysBetween(first, p.date)} days` : ' · first photo'}</span>
        ${p.note ? `<em>${esc(p.note)}</em>` : ''}<button class="link" data-act="photo-del" data-id="${p.id}">Delete</button></figcaption></figure>`).join('')}</div></section>`
    : `<section class="card empty-state"><h3>No photos yet</h3><p>Add your first photo above. It becomes the starting point you compare against later.</p></section>`;
  return `<div class="stack">${upload}${grid}</div>`;
}

// ---------- Compare ----------
function compareTab(s) {
  const photos = S.sortedPhotos(s);
  if (photos.length < 2) return `<section class="card empty-state stack-narrow"><h3>Add at least two photos to compare</h3>
    <p>Photos from two different dates are needed. You have ${photos.length}.</p><a class="btn primary" href="#progress/photos">${icon('camera', 18)} Add photos</a></section>`;
  const has = (id) => photos.some((p) => p.id === id);
  const c = ui.cmp;
  if (!has(c.a)) c.a = photos[0].id;
  if (!has(c.b)) c.b = photos.at(-1).id;
  const A = photos.find((p) => p.id === c.a), B = photos.find((p) => p.id === c.b);
  const opts = (sel) => photos.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(photoLabel(p))}</option>`).join('');
  const gap = daysBetween(A.date, B.date);
  const view = c.mode === 'side'
    ? `<div class="sbs"><figure>${img(A, 'Photo A')}<figcaption><b>${longDate(A.date)}</b> ${esc(A.label)}</figcaption></figure><figure>${img(B, 'Photo B')}<figcaption><b>${longDate(B.date)}</b> ${esc(B.label)}</figcaption></figure></div>`
    : `<div class="compare" style="--pos:50%">${P.url(B.id) ? `<img class="after" src="${P.url(B.id)}" alt="Photo B, ${esc(photoLabel(B))}"><img class="before" src="${P.url(A.id)}" alt="Photo A, ${esc(photoLabel(A))}">` : ''}
        <i class="divider"></i><input type="range" min="0" max="100" value="50" data-compare aria-label="Drag to compare the two photos"></div>
      <div class="ends"><span>${longDate(A.date)}</span><span>${longDate(B.date)}</span></div>`;
  return `<div class="stack"><section class="card"><h3>Compare any two dates</h3>
    <div class="fields two"><label>Photo A (left)<select data-change="cmp-a">${opts(c.a)}</select></label><label>Photo B (right)<select data-change="cmp-b">${opts(c.b)}</select></label></div>
    <div class="row seg"><button class="btn small ${c.mode === 'side' ? 'outline' : 'primary'}" data-act="cmp-mode" data-m="slider" aria-pressed="${c.mode !== 'side'}">Slider</button>
      <button class="btn small ${c.mode === 'side' ? 'primary' : 'outline'}" data-act="cmp-mode" data-m="side" aria-pressed="${c.mode === 'side'}">Side by side</button>
      <button class="btn outline small" data-act="cmp-swap">Swap</button></div>
    ${A.id === B.id ? '<p class="note">Pick two different photos to see a change.</p>' : `<p class="muted gapline">${Math.abs(gap)} day${Math.abs(gap) === 1 ? '' : 's'} between these photos.</p>`}
    ${A.label !== B.label ? `<p class="note">${icon('alert', 14)} These photos show different angles, so they are not a fair comparison.</p>` : ''}
    ${view}</section>
    <p class="note">${icon('alert', 14)} Lighting, hair length, wet or dry hair and camera angle all change how hair looks. Treat comparisons as a personal record, not a medical assessment.</p></div>`;
}

// ---------- Weekly check-in ----------
function indicatorSlider(ind, savedValue) {
  const v = savedValue ?? 3;
  return `<div class="ind-slider">
    <div class="ind-label"><b>${ind.label}</b><span class="ind-val" id="ind-val-${ind.key}">${v}</span></div>
    <input type="range" name="${ind.key}" min="1" max="5" value="${v}" class="slider-track" id="slider-${ind.key}"
      style="--val:${v}"
      oninput="this.style.setProperty('--val',this.value);document.getElementById('ind-val-${ind.key}').textContent=this.value"
      aria-label="${ind.label}">
    <div class="ends"><span>${ind.lo}</span><span>${ind.hi}</span></div>
  </div>`;
}

function weeklyTab(s) {
  const obs = s.observations;
  const curWeekKey = isoWeek(S.dkey());
  const curObs = obs.find((o) => o.weekKey === curWeekKey);
  const tWeek = treatmentWeek(s);
  const adherence = weekAdherence(s);
  const adherenceText = adherence !== null ? `${adherence}% this week` : 'No routine steps yet';

  const weekBanner = tWeek ? `<div class="week-banner"><span class="badge">${icon('flame', 14)} Treatment week ${tWeek}</span>${curObs ? '<span class="badge" style="background:var(--green-soft);color:var(--green)">Check-in saved this week</span>' : '<span class="due">Check-in due</span>'}</div>` : '';

  const form = `<form id="obs" class="card">
    <h3>Weekly check-in ${curObs ? '(editing this week)' : ''}</h3>
    ${weekBanner}
    <p class="muted">Rate each indicator honestly. These are your personal observations — not measurements, not a score. Record one check-in per week.</p>
    <div class="ind-summary">
      <div class="ind-pill"><small>Routine adherence</small><b>${adherenceText}</b></div>
    </div>
    <label class="field">Product for this check-in<select name="product"><option value="">General observation (no product)</option>${[...new Set(s.routine.steps.map(st=>st.product).filter(Boolean))].map(p=>`<option value="${esc(p)}" ${curObs?.product===p?'selected':''}>${esc(p)}</option>`).join('')}</select></label>
    ${INDICATORS.map((ind) => indicatorSlider(ind, curObs?.[ind.key])).join('')}
    <label class="field"><span>Notes (optional)</span><textarea name="note" rows="3" maxlength="400" placeholder="e.g. stressful week, started new shampoo, noticed less shedding after day 3">${esc(curObs?.note || '')}</textarea></label>
    <button class="btn primary">${icon('check', 18)} Save this week's check-in</button>
  </form>`;

  const hist = obs.length ? `<section class="card"><h3>Previous check-ins</h3>
    <ul class="history rec">${newestFirst(obs).map((o) => {
    const adh = o.adherence !== undefined ? `Adherence ${o.adherence}%` : '';
    return `<li><div class="rec-main"><b>${longDate(o.date)}${o.weekKey ? ` · Week of ${o.weekKey.replace('W', 'W ')}` : ''}</b>
        <span>Shedding ${o.shedding}/5 · Scalp itch ${o.itch ?? o.density ?? '—'}/5 · Thickness ${o.thickness ?? o.growth ?? '—'}/5${adh ? ` · ${adh}` : ''}</span>
        ${o.note ? `<em>${esc(o.note)}</em>` : ''}</div>
        <span class="acts"><button class="link" data-act="obs-del" data-id="${o.id}">Delete</button></span></li>`;
  }).join('')}</ul></section>` : '';

  return `<div class="stack">${form}${hist}
    <p class="note">${icon('alert', 14)} These indicators reflect your personal impressions. Changes in shedding alone do not confirm whether a treatment is working. See a doctor if anything worries you.</p></div>`;
}

// ---------- Charts ----------
function chartsTab(s) {
  const obs = s.observations, photos = s.photos, start = S.trackStart(s);
  if (!obs.length && !photos.length) return `<section class="card empty-state"><h3>Nothing to chart yet</h3><p>Add a photo or a weekly check-in and your charts appear here.</p>
    <div class="row"><a class="btn primary" href="#progress/photos">Add a photo</a><a class="btn outline" href="#progress/checkin">Add a check-in</a></div></section>`;
  const weeks = start ? Math.floor(daysBetween(start, S.dkey()) / 7) + 1 : 0;
  const cur = PHASES.find((p) => weeks >= p.from && weeks <= p.to);
  const tWeek = treatmentWeek(s);
  const labels = obs.map((o) => niceDate(o.date));

  const stats = `<div class="stats three"><div class="stat"><small>Tracking for</small><b>${weeks}<em>week${weeks === 1 ? '' : 's'}</em></b></div>
    <div class="stat"><small>Photos</small><b>${photos.length}</b></div><div class="stat"><small>Check-ins</small><b>${obs.length}</b></div></div>`;

  // Individual indicator charts — no combined score
  const indCharts = obs.length >= 2 ? `<section class="card"><h3>Your indicator trends</h3>
    <p class="muted">1 is the low end, 5 is the high end for each indicator. Trend direction means different things for each one.</p>
    ${multiLine([
    { name: 'Shedding (1=rare)', cls: 's1', values: obs.map((o) => o.shedding || 1) },
    { name: 'Scalp itch (1=calm)', cls: 's2', values: obs.map((o) => o.itch ?? o.density ?? 3) },
    { name: 'Thickness (5=fuller)', cls: 's3', values: obs.map((o) => o.thickness ?? o.growth ?? 3) },
  ], labels, 'Individual indicator trends')}
    <p class="muted">Look for the direction over several weeks. Week-to-week swings are normal.</p></section>`
    : obs.length === 1 ? `<section class="card empty-state"><h3>Add one more check-in to see trends</h3><a class="btn primary" href="#progress/checkin">Add check-in</a></section>` : '';

  // Routine adherence chart
  const adhObs = obs.filter((o) => o.adherence !== undefined);
  const adhChart = adhObs.length >= 2 ? `<section class="card"><h3>Routine adherence over time</h3>
    <p class="muted">Share of your routine completed each week that you recorded a check-in.</p>
    ${lineChart(adhObs.map((o) => ({ label: niceDate(o.date), value: o.adherence })), 'Routine adherence')}</section>` : '';

  const expect = cur ? `<section class="card"><h3>What to look for over time</h3><ol class="timeline">${PHASES.map((ph) => {
    const state = ph === cur ? 'current' : ph.to < weeks ? 'past' : 'future';
    return `<li class="${state}"><span class="node">${state === 'past' ? icon('check', 12) : ''}</span><div><small>${ph.weeks}</small><h4>${ph.title} ${state === 'current' ? '<span class="here">You are here</span>' : ''}</h4><p>${ph.expect}</p></div></li>`;
  }).join('')}</ol></section>` : '';

  return `<div class="stack">${journey(s)}${stats}${tWeek ? `<div class="stats"><div class="stat"><small>Treatment week</small><b>${tWeek}</b></div></div>` : ''}${indCharts}${adhChart}${expect}
    <p class="note">${icon('alert', 14)} Results vary and are never guaranteed. If hair loss is sudden, patchy or worrying you, see a doctor or dermatologist.</p></div>`;
}

export const progress = {
  id: 'progress', nav: 'Progress', kicker: 'Photos & charts', icon: 'trend', title: 'Progress Tracker',
  pain: 'Is anything changing? I can\u2019t tell from the mirror.',
  lead: 'Keep dated photos, compare any two dates, record weekly check-ins and watch your personal trends on a chart.',
  tabs: [['charts', 'Charts'], ['photos', 'Photos'], ['compare', 'Compare'], ['checkin', 'Weekly check-in']],
  status(s) {
    if (!s.photos.length && !s.observations.length) return 'Add your first photo';
    return `${s.photos.length} photo${s.photos.length === 1 ? '' : 's'} · ${s.observations.length} check-in${s.observations.length === 1 ? '' : 's'}`;
  },
  render(s, tab) {
    const content = tab === 'photos' ? photosTab(s) : tab === 'compare' ? compareTab(s) : tab === 'checkin' ? weeklyTab(s) : chartsTab(s);
    const reset = S.mode() === 'normal' ? `<section class="card" style="margin-top:24px"><h3>Reset progress</h3><p>Delete your progress photos and weekly check-ins to start a fresh record. Your routine, completion history, product checks and refill plan stay saved.</p><button class="btn outline small" data-act="progress-reset" ${!s.photos.length && !s.observations.length ? 'disabled' : ''}>Reset progress</button></section>` : '';
    return content + reset;
  },
  async enter() { await P.load(S.load().photos.map((p) => p.id)); },

  actions: {
    async 'progress-reset'(button) {
      if (S.mode() !== 'normal') return;
      const s = S.load();
      if (!s.photos.length && !s.observations.length) return;
      if (!confirm('Delete all progress photos and weekly check-ins in normal mode? This cannot be undone. Your routine, completion history, product checks, refill plan and demo data will be kept.')) return;
      button.disabled = true;
      const keep = new Set(s.packs.flatMap(p => p.photoIds || []));
      const ids = s.photos.map(p => p.id).filter(id => !keep.has(id));
      s.photos = []; s.observations = [];
      if (!S.save(s)) { button.disabled = false; toast('Could not reset progress. Please try again.'); return; }
      let failed = false;
      for (const id of ids) { try { await P.remove(id); } catch { failed = true; } }
      ui.cmp.a = null; ui.cmp.b = null;
      ui.refresh();
      toast(failed ? 'Progress reset, but some stored photo files could not be removed.' : 'Progress reset. Ready for a fresh record.');
    },
    'cmp-mode'(el) { ui.cmp.mode = el.dataset.m; ui.refresh(); },
    'cmp-swap'() { [ui.cmp.a, ui.cmp.b] = [ui.cmp.b, ui.cmp.a]; ui.refresh(); },
    async 'photo-del'(el) {
      if (!confirm('Delete this photo from this device?')) return;
      const s = S.load();
      await P.remove(el.dataset.id).catch(() => { });
      s.photos = s.photos.filter((p) => p.id !== el.dataset.id); S.save(s); ui.refresh();
    },
    'obs-del'(el) {
      if (!confirm('Delete this check-in?')) return;
      const s = S.load(); s.observations = s.observations.filter((o) => o.id !== el.dataset.id); S.save(s); ui.refresh();
    },
  },
  changes: {
    'journey-product'(el) { ui.journeyProduct = el.value; ui.refresh(); },
    'cmp-a'(el) { ui.cmp.a = el.value; ui.refresh(); },
    'cmp-b'(el) { ui.cmp.b = el.value; ui.refresh(); },
  },
  submits: {
    async photo(f, form) {
      const file = f.get('photo'), btn = form.querySelector('button');
      if (!file?.size) return toast('Choose a photo first');
      btn.disabled = true;
      try {
        const id = S.uid();
        await P.put(id, await imageBlob(file));
        const s = S.load();
        s.photos.push({ id, date: f.get('date'), label: f.get('label'), note: f.get('note').trim() });
        S.save(s); toast('Photo saved'); ui.refresh();
      } catch { toast('That photo could not be read or stored. Try a JPG or PNG.'); btn.disabled = false; }
    },
    obs(f) {
      const s = S.load();
      const today = S.dkey();
      const weekKey = isoWeek(today);
      const adherence = weekAdherence(s);
      const data = {
        date: today,
        product: f.get('product') || '',
        weekKey,
        shedding: +f.get('shedding'),
        itch: +f.get('itch'),
        thickness: +f.get('thickness'),
        note: f.get('note').trim(),
        adherence: adherence !== null ? adherence : undefined,
        // keep legacy fields for backwards compat with old data / charts
        density: +f.get('itch'),
        growth: +f.get('thickness'),
      };
      // Replace any existing check-in for this week
      s.observations = s.observations.filter((o) => o.weekKey !== weekKey && o.date !== today)
        .concat({ id: S.uid(), ...data })
        .sort((a, b) => a.date.localeCompare(b.date));
      S.save(s); toast('Check-in saved'); location.hash = 'progress/charts';
    },
  },
};
