// Router and page shell. Five independent tools live in js/views/. Each exposes render(), actions, submits and changes.
// Routes look like #tool or #tool/tab, so every screen can be bookmarked and the browser Back button works.
import { revealOnScroll } from './motion.js';
import { ui, $ } from './ui.js';
import * as S from './store.js';
import { icon } from './icons.js';
import { hub } from './views/hub.js';
import { finder } from './views/finder.js';
import { trust } from './views/trust.js';
import { routine } from './views/routine.js';
import { progress } from './views/progress.js';
import { orders } from './views/orders.js';
import { value } from './views/value.js';
import { coach, coachFAB, coachPanel } from './coach.js';

const TOOLS = [finder, trust, routine, progress, orders]; // dashboard order; none depends on another
const MODULES = Object.fromEntries(TOOLS.map((m) => [m.id, m]));
const merge = (key) => Object.assign({}, key === 'actions' ? hub.actions : {}, ...TOOLS.map((m) => m[key]));
const ACTIONS = merge('actions'), SUBMITS = merge('submits'), CHANGES = merge('changes');

const LOGO = `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#265289"/>
  <circle cx="16" cy="16" r="10" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
  <path d="M16 23V13M16 13c0-3 2-5 5-5 0 3-2 5-5 5zM16 18c0-2-1.5-4-4-4 0 2 1.5 4 4 4z" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="25" cy="8" r="3" fill="#FFCA67"/></svg>`;

function route() {
  const [id = '', t] = location.hash.slice(1).split('/'), m = MODULES[id === 'orders' ? 'refill' : id];
  return { id: m ? id : '', m, tab: m?.tabs?.find((x) => x[0] === t)?.[0] || m?.tabs?.[0]?.[0] };
}

const moduleHead = (m) => `<div class="mhead"><a class="back" href="#">${icon('back', 16)} All tools</a><h1>${m.title}</h1><p>${m.lead}</p></div>`;
const tabsNav = (m, tab) => (m.tabs ? `<nav class="tabs" aria-label="${m.title} sections">${m.tabs.map(([k, l]) => `<a href="#${m.id}/${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav>` : '');

let lastRoute;
function render() {
  const s = S.load(), { id, m, tab } = route();
  const content = m ? `${moduleHead(m)}${tabsNav(m, tab)}${m.render(s, tab)}` : hub.render(s, TOOLS);

  $('#app').innerHTML = `<header class="topbar"><div class="bar">
      <a class="brand" href="#">${LOGO}<span>Follicle<b>360</b></span></a>
      <nav class="steps" aria-label="Tools"><a href="#" class="home-link ${!id ? 'on' : ''}" aria-label="Home" ${!id ? 'aria-current="page"' : ''}><i><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10 12 3l9 7v11h-6v-7H9v7H3z"/></svg></i><span>Home</span></a>${TOOLS.map((t) => `<a href="#${t.id}" class="${t.id === id ? 'on' : ''}" aria-label="${t.title}" title="${t.title}"><i>${icon(t.icon, 14)}</i><span>${t.nav}</span></a>`).join('')}</nav>
    </div></header>
    <main class="page">${S.mode() === 'demo' ? '<div class="demo-banner"><b>DEMO MODE · 2 months / 8 weeks</b><span>Fictional records · your normal data is separate</span><button class="btn outline small" data-act="normal">Return to normal mode</button></div>' : ''}${content}</main>
    <footer class="foot"><p>Follicle360 is an independent concept inspired by Man Matters. It offers general information, not medical advice.</p>
      ${S.isEmpty(s) ? '' : `<button class="link" data-act="reset">${S.mode() === 'demo' ? 'Delete demo data' : 'Delete my data'}</button>`}</footer>
    ${coachFAB()}${coachPanel()}`;

  if (id !== lastRoute) { // entering a different tool: scroll up and let the tool load what it needs (e.g. photos)
    window.scrollTo(0, 0); lastRoute = id;
    if (m?.enter) m.enter().then(() => route().id === id && render()).catch(() => {});
  }
  revealOnScroll(document.querySelector('main.page'), `${id}/${tab || ''}`);
  // Scroll coach messages to bottom after render
  if (coach.open) setTimeout(() => { document.getElementById('coach-msgs')?.scrollTo(0, 1e9); }, 40);
}
ui.refresh = render;

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  // Coach actions handled here
  if (act === 'coach-toggle') { coach.toggle(); return; }
  if (act === 'coach-clear') { coach.clear(); return; }
  ACTIONS[act]?.(el, e);
});
document.addEventListener('change', (e) => {
  value.onChange(e);
  const el = e.target.closest('[data-change]');
  if (el?.dataset.change === 'coach-context') { coach.setContextAllowed(el.checked); return; }
  if (el) CHANGES[el.dataset.change]?.(el);
});
document.addEventListener('input', (e) => {
  if (e.target.matches('[data-compare]')) e.target.parentElement.style.setProperty('--pos', `${e.target.value}%`);
  value.onInput(e);
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  // Coach form
  if (e.target.id === 'coach-form') {
    const q = new FormData(e.target).get('q')?.trim();
    e.target.reset();
    if (q) coach.send(q);
    return;
  }
  SUBMITS[e.target.id]?.(new FormData(e.target), e.target);
});

window.addEventListener('hashchange', render);
S.migrate().catch(() => {}).finally(render);
