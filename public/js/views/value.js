// Reused from the earlier "Compare" step, now a section of Product Finder:
// ingredient evidence guide, cost-per-month calculator and a label matcher. No AI is involved.
import { PRODUCT_IMAGES } from '../product-images.js';
import { INGREDIENTS, LEVELS } from '../data.js';
import * as S from '../store.js';
import { $, esc, rupee } from '../ui.js';
import { icon } from '../icons.js';

const monthly = (price, qty, use) => ([price, qty, use].every(Number.isFinite) && price > 0 && qty > 0 && use > 0 ? { perDay: price / (qty / use), perMonth: (price / (qty / use)) * 30, lasts: qty / use } : null);

function field(side, c) {
  const v = (n) => esc(c[`${side}${n}`] ?? '');
  return `<div class="calc-col"><h4>Product ${side.toUpperCase()}</h4>
    <label>Product & reference price<select name="${side}product" data-calc-product="${side}"><option value="">Select a product or enter your own</option>${Object.entries(PRODUCT_IMAGES).map(([id,p]) => `<option value="${id}" ${c[`${side}product`] === id ? 'selected' : ''}>${esc(p.name)} — ${rupee(p.price)}</option>`).join('')}</select></label>
    <label>Product name<input data-calc name="${side}name" placeholder="Your product" value="${v('name')}"></label>
    <label>Price paid (₹)<input data-calc type="number" min="0" step="any" name="${side}price" inputmode="decimal" value="${v('price')}"></label>
    <label>Amount in pack<input data-calc type="number" min="0" step="any" name="${side}qty" inputmode="decimal" placeholder="ml, gummies, washes" value="${v('qty')}"></label>
    <label>Used per day<input data-calc type="number" min="0" step="any" name="${side}use" inputmode="decimal" placeholder="same unit as above" value="${v('use')}"></label></div>`;
}

const EMPTY_CALC = '<p class="muted">Fill in price, pack size and daily use to see what you really pay each month.</p>';

function compute(c) {
  const v = (n) => parseFloat(c[n]);
  const a = monthly(v('aprice'), v('aqty'), v('ause')), b = monthly(v('bprice'), v('bqty'), v('buse'));
  const name = (side, d) => esc((c[`${side}name`] || '').trim() || d);
  const card = (side, m) => `<div class="stat"><small>${name(side, `Product ${side.toUpperCase()}`)}</small><b>${rupee(m.perMonth)}<em>/month</em></b>
    <span>${rupee(m.perDay)} per day · pack lasts ${Math.round(m.lasts)} days</span><span>6-month cost: <strong>${rupee(m.perMonth * 6)}</strong></span></div>`;
  if (!a && !b) return EMPTY_CALC;
  let out = `<div class="stats">${a ? card('a', a) : ''}${b ? card('b', b) : ''}</div>`;
  if (a && b) {
    const diff = Math.abs(a.perMonth - b.perMonth), cheaper = a.perMonth <= b.perMonth ? name('a', 'Product A') : name('b', 'Product B');
    out += `<p class="verdict">${cheaper} costs ${rupee(diff)} less per month (${rupee(diff * 6)} over 6 months). The cheaper option is not always the better fit, so check the ingredients and your label.</p>`;
  }
  return out;
}

const matches = (hits) => (hits.length
  ? `<ul class="matches">${hits.map((i) => `<li><b>${i.name}</b> <span class="lvl ${i.level}">${LEVELS[i.level]}</span><p>${i.what}</p></li>`).join('')}</ul>`
  : '<p class="muted">No well-known ingredients recognised in this text.</p>');

export const value = {
  render(s) {
    return `<div class="stack">
      <section class="card"><h2>Ingredient evidence guide</h2>
        <p class="muted">A general summary of the science behind common ingredients. It is not specific to any brand's formula, so always check your product's label.</p>
        ${INGREDIENTS.map((i) => `<details class="ing"><summary><b>${i.name}</b><span class="lvl ${i.level}">${LEVELS[i.level]}</span></summary><p>${i.what}</p></details>`).join('')}
      </section>
      <section class="card"><h2>Cost per month calculator</h2>
        <p class="muted">Price per pack hides the truth. Enter two products to compare what you actually pay each month. Select a product to fill its reference price, then enter the pack amount and your daily usage in the same unit. Prices were checked on 19 Nov 2026; edit the price to match your purchase. Usage is your input, not a dose recommendation. Your entries are saved on this device.</p>
        <form id="calc" class="calc"><div class="calc-grid">${field('a', s.calc)}${field('b', s.calc)}</div></form>
        <div id="calc-out" class="calc-out">${compute(s.calc)}</div>
      </section>
      <section class="card"><h2>Match a product label</h2>
        <p class="muted">Paste an ingredient list or marketing claims. We look for ingredients in the built-in guide above. Anything not in the guide is not explained here.</p>
        <form id="decode"><textarea name="text" rows="4" placeholder="e.g. Minoxidil 5%, Procapil, Redensyl, Biotin, Caffeine..." required></textarea>
          <button class="btn primary">${icon('compass', 18)} Check this label</button></form>
        <div id="decode-out"></div>
      </section></div>`;
  },
  submits: {
    decode(f) {
      const lower = f.get('text').toLowerCase();
      $('#decode-out').innerHTML = matches(INGREDIENTS.filter((i) => i.keys.some((k) => lower.includes(k))));
    },
  },
  onChange(e) {
    const side = e.target.dataset.calcProduct;
    if (!side) return;
    const form = e.target.closest('#calc'), product = PRODUCT_IMAGES[e.target.value];
    if (!form) return;
    form.elements[side+'name'].value = product?.name || '';
    form.elements[side+'price'].value = product?.price ?? '';
    form.elements[side+'qty'].value = '';
    form.elements[side+'use'].value = '';
    value.onInput(e);
  },
  // live update of the calculator without re-rendering (keeps typing focus) and save the entries
  onInput(e) {
    const form = e.target.closest('#calc');
    if (!form) return;
    const s = S.load();
    s.calc = Object.fromEntries(new FormData(form));
    S.save(s);
    $('#calc-out').innerHTML = compute(s.calc);
  },
};
