// Tool 1 - Product Finder: concern questionnaire, suitability guidance and product options.
// General guidance only. It never diagnoses, and it points to a doctor whenever the answers suggest one.
import { PRODUCT_IMAGES } from '../product-images.js';
import { PRODUCTS, PHASES } from '../data.js';
import * as S from '../store.js';
import { ui, esc, toast } from '../ui.js';
import { icon } from '../icons.js';
import { value } from './value.js';

const QUESTIONS = [
  ['concern', 'What is your main concern?', [['fall', 'Hair fall', 'More hair in the shower or on the comb'], ['thin', 'Thinning', 'Less density at the hairline or crown'], ['both', 'Both', ''], ['maintain', 'Just keeping hair healthy', 'No clear loss']]],
  ['duration', 'How long has it been going on?', [['new', 'Under 6 months', ''], ['mid', '6 months to 2 years', ''], ['long', 'More than 2 years', '']]],
  ['pattern', 'Where do you notice it?', [['none', 'All over / not sure', ''], ['hairline', 'Receding hairline', ''], ['crown', 'Crown', '']]],
  ['topical', 'Are you comfortable with a daily scalp product?', [['yes', 'Yes', 'Applied once or twice a day'], ['no', 'Prefer to start gentler', '']]],
  ['sensitive', 'Do you have a sensitive scalp, allergies or a skin condition?', [['no', 'No', ''], ['yes', 'Yes', 'Irritation, eczema, psoriasis']]],
  ['redflag', 'Have you noticed any of these?', [['no', 'None of these', ''], ['yes', 'Yes', 'Sudden or patchy hair loss, scalp pain, redness, scaling or sores']]],
];

const LEVELS = {
  foundation: { title: 'Foundation care', text: 'Start with gentle products that support scalp and hair health. Many people begin here before considering anything more active.', products: ['kit', 'shampoo', 'gummies'] },
  regrowth: { title: 'Active regrowth support', text: 'Your answers suggest thinning, and you are comfortable with a daily scalp product. Topical minoxidil is among the most studied non-prescription options, so it may be worth considering. Read the label and ask a doctor or pharmacist if unsure.', products: ['kit', 'minoxidil', 'serum'] },
  doctor: { title: 'Talk to a doctor first', text: 'Your answers suggest a doctor should look at this before you choose products. A doctor or dermatologist can look for the cause and advise on the safest options for you.', products: [] },
};

// Older saved results may lack fields required by the current renderer.
function savedResult(raw) {
  if (!raw || !Object.hasOwn(LEVELS, raw.level) || !Array.isArray(raw.products) || !Array.isArray(raw.why)) return null;
  return { ...raw, why: raw.why.filter(w => typeof w === 'string'), answers: { ...(raw.answers || {}), additional: typeof raw.answers?.additional === 'string' ? raw.answers.additional : '' } };
}

const DOCTOR_QS = ['What could be causing my hair loss?', 'Which treatments are suitable for my scalp and health history?', 'How long should I try something before reviewing it?'];

// Per-product reasons — explains why each product is in the suggestion list.
const PRODUCT_REASONS = {
  kit:       'A starter kit bundles several gentle steps into one habit, making it easier to build consistency from day one.',
  shampoo:   'A regular wash keeps the scalp clean, which supports any other products you use and reduces build-up.',
  gummies:   'A daily supplement adds nutritional support. It works best alongside your topical routine, not as a replacement.',
  minoxidil: 'Topical minoxidil has strong evidence for pattern hair loss and suits people comfortable with a once- or twice-daily scalp product.',
  serum:     'A leave-on scalp serum adds an extra step for people who want more. The evidence for peptide blends is still limited, so treat it as an optional addition.',
  minoxifin: 'A topical regrowth-support product for adults who prefer an alternative to plain minoxidil. Read the label for its exact ingredients and strength.',
};

function recommend(a) {
  let level;
  if (a.redflag === 'yes' || a.sensitive === 'yes' || (a.duration === 'long' && a.concern !== 'fall' && a.concern !== 'maintain')) level = 'doctor';
  else if ((a.concern === 'thin' || a.concern === 'both') && a.topical === 'yes') level = 'regrowth';
  else level = 'foundation';

  const why = [];
  if (a.redflag === 'yes') why.push('Sudden or patchy loss, scalp pain, redness or scaling should be checked by a doctor.');
  if (a.sensitive === 'yes') why.push('A sensitive scalp, allergies or a skin condition means products are best chosen with medical advice.');
  if (a.duration === 'long' && level === 'doctor' && a.redflag !== 'yes' && a.sensitive !== 'yes') why.push('Thinning for more than two years is worth a professional check.');
  if (level === 'regrowth') why.push('You are comfortable with a daily scalp product and describe thinning, not only hair fall.');
  if (level === 'foundation' && (a.concern === 'thin' || a.concern === 'both')) why.push('You prefer to start gentler, so this starts with foundation care. You can review a more active step later.');
  if (a.concern === 'fall') why.push('Hair fall on its own is commonly approached with foundation care first.');
  if (a.concern === 'maintain') why.push('With no clear loss, a simple routine to keep your hair healthy is usually enough.');
  if (a.pattern !== 'none' && level !== 'doctor') why.push(`Thinning at the ${a.pattern === 'hairline' ? 'hairline' : 'crown'} is a common pattern, so dated photos can help you track it.`);
  if (a.additional && a.additional.trim()) why.push(`You also mentioned: "${a.additional.trim().slice(0, 120)}${a.additional.trim().length > 120 ? '\u2026' : ''}"`);

  const products = LEVELS[level].products.filter((id) => !(a.concern === 'maintain' && id === 'kit'));
  return { level, why, products, answers: a, date: S.dkey() };
}

const question = ([name, label, opts], saved) => `<fieldset><legend>${label}</legend><div class="options two">${opts.map(([v, t, small], i) =>
  `<label class="opt"><input type="radio" name="${name}" value="${v}" ${(saved ? saved === v : i === 0) ? 'checked' : ''}><span><b>${t}</b>${small ? `<small>${small}</small>` : ''}</span></label>`).join('')}</div></fieldset>`;

const productImage = p => {
  const image = PRODUCT_IMAGES[p.id];
  return image ? `<figure class="product-image"><a href="${esc(image.url)}" target="_blank" rel="noopener noreferrer" aria-label="View ${esc(image.name)} on Man Matters"><img src="${esc(image.src)}" alt="${esc(image.name)} — official Man Matters product image" loading="lazy" width="300" height="300"></a><figcaption>Pictured: ${esc(image.name)}<br><a href="${esc(image.url)}" target="_blank" rel="noopener noreferrer">View on Man Matters ↗</a></figcaption></figure>` : '';
};

const productCard = (p, suggested, reason) => `<article class="card prod">
  ${productImage(p)}
  <div class="prod-head"><h3>${p.name}</h3><span class="chip">${p.type}</span>${suggested ? '<span class="badge yellow">Suggested by your answers</span>' : ''}</div>
  <p>${p.about}</p>
  ${suggested && reason ? `<div class="finder-reason"><b>${icon('check', 15)} Why suggested for you</b><p>${esc(reason)}</p></div>` : ''}
  <h4>May suit</h4><p>${p.mayFit}</p>
  <h4>Check before buying or using</h4><ul class="ticks">${p.check.map((c) => `<li>${icon('check', 16)} ${c}</li>`).join('')}</ul>
  <div class="row"><button class="btn outline small" data-act="finder-add" data-id="${p.id}">${icon('plus', 16)} Add to my routine</button>
    <a class="btn small" href="#routine/guide">Usage guidance</a></div></article>`;

function quizTab(s) {
  const r = savedResult(s.finder);
  if (!r || ui.quiz) {
    const a = r?.answers || {};
    return `<form id="quiz" class="card stack-form">${QUESTIONS.map((q) => question(q, a[q[0]])).join('')}
      <fieldset class="additional-info">
        <legend>Additional information <span class="optional-label">(optional)</span></legend>
        <p class="muted">Describe any other concerns, existing treatments, previous product experiences, allergies or preferences. This helps tailor the guidance to your situation.</p>
        <textarea name="additional" rows="4" maxlength="500" placeholder="e.g. I've tried minoxidil before and found it too greasy. I have mild dandruff and prefer fragrance-free products. I'm also taking biotin supplements.">${esc(a.additional || '')}</textarea>
        <p class="note skip-note">${icon('alert', 13)} This section is optional — you can leave it blank and still get guidance.</p>
      </fieldset>
      <button class="btn primary big">See my guidance</button>
      ${r ? '<button type="button" class="btn outline big" data-act="finder-cancel">Cancel</button>' : ''}</form>`;
  }
  const lv = LEVELS[r.level], items = PRODUCTS.filter((p) => r.products.includes(p.id));
  return `<div class="stack"><section class="card result">
      <span class="badge yellow">Your starting point</span>
      <h2>${lv.title}</h2><p>${lv.text}</p>
      <h3>Why this fits your answers</h3><ul class="ticks">${r.why.map((w) => `<li>${icon('check', 16)} ${esc(w)}</li>`).join('')}</ul>
      ${r.answers.additional ? `<div class="finder-extra"><b>${icon('spark', 14)} Your additional notes were considered</b><p>${esc(r.answers.additional.slice(0, 200))}${r.answers.additional.length > 200 ? '\u2026' : ''}</p></div>` : ''}
      ${items.length ? `<h3>Options to consider</h3><div class="chips">${items.map((p) => `<span class="chip">${p.name}</span>`).join('')}</div>
        <h3>What to expect</h3><p>${PHASES[0].expect} Results vary and are not guaranteed.</p>`
      : `<h3>Questions you could ask</h3><ul class="ticks">${DOCTOR_QS.map((q) => `<li>${icon('check', 16)} ${q}</li>`).join('')}</ul>`}
      <div class="row">
        <a class="btn outline" href="https://manmatters.com/booking-listing" target="_blank" rel="noopener noreferrer" aria-label="Consult a doctor on Man Matters (opens in a new tab)">Consult a doctor ↗</a>
        <a class="btn primary" href="#finder/options">${icon('tag', 18)} See product options</a>
        ${items.length ? `<button class="btn outline" data-act="finder-use">${icon('routine', 18)} Add these to my routine</button>` : ''}
        <button class="btn outline" data-act="retake">Retake questionnaire</button>
      </div>
      <p class="note">${icon('alert', 14)} General guidance, not a diagnosis or a prescription. Confirm with a doctor if you are unsure.</p>
    </section></div>`;
}

export const finder = {
  id: 'finder', nav: 'Finder', kicker: 'Questionnaire & options', icon: 'compass', title: 'Product Finder',
  pain: 'I don\u2019t know which product is right for me.',
  lead: 'Answer a few questions for general guidance on where to start, then compare product options and ingredients.',
  tabs: [['quiz', 'Questionnaire'], ['options', 'Product options'], ['ingredients', 'Ingredients & cost']],
  status: (s) => (savedResult(s.finder) ? `Result: ${LEVELS[s.finder.level].title}` : '1-minute questionnaire'),

  render(s, tab) {
    s = { ...s, finder: savedResult(s.finder) };
    if (tab === 'options') return `<div class="stack">${s.finder ? '' : `<p class="note">${icon('alert', 14)} Take the questionnaire to see which options suit your answers.</p>`}
      ${PRODUCTS.map((p) => productCard(p, s.finder?.products.includes(p.id), PRODUCT_REASONS[p.id])).join('')}
      <p class="note">${icon('alert', 14)} Product descriptions are general. The label on your pack is the final word on ingredients, strength and directions.</p></div>`;
    if (tab === 'ingredients') return value.render(s);
    return quizTab(s);
  },
  actions: {
    retake() { ui.quiz = true; ui.refresh(); },
    'finder-cancel'() { ui.quiz = false; ui.refresh(); },
    'finder-use'() {
      const s = S.load();
      s.finder.products.forEach((id) => S.addProduct(s, id));
      toast('Added to your routine'); location.hash = 'routine/plan';
    },
    'finder-add'(el) {
      const s = S.load(), n = S.addProduct(s, el.dataset.id);
      toast(n ? 'Added to your routine' : 'Already in your routine');
    },
  },
  submits: {
    quiz(f) {
      const s = S.load();
      s.finder = recommend(Object.fromEntries(f));
      S.save(s); ui.quiz = false; ui.refresh(); window.scrollTo(0, 0);
    },
    ...value.submits,
  },
};
