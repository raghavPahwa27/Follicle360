// Tool 2 - Product Trust: packaging, seal, batch and expiry checklist with a ready-to-send complaint message.
// It checks what you can see on the pack. It cannot prove a product is genuine, and it says so.
import { extractLabel } from '../label-ocr.js';
import { PRODUCTS, PACK_STEPS } from '../data.js';
import * as S from '../store.js';
import * as P from '../photos.js';
import { ui, toast, imageBlob, esc, niceDate, longDate } from '../ui.js';
import { icon } from '../icons.js';

const daysUntil = (key) => Math.round((new Date(`${key}T00:00:00`) - new Date(`${S.dkey()}T00:00:00`)) / 864e5);

function complaint(p) {
  const n = p.photoIds?.length;
  return `Hello Team,\n\nI received my order on ${longDate(p.date)} and found the following problem(s) with the ${p.product}:\n${p.issues.map((i) => `- ${i}`).join('\n')}\n\nBatch number: ${p.batch || 'not readable'}\nExpiry date: ${p.expiry ? longDate(p.expiry) : 'not readable'}\nOrder reference: ${p.order || 'not provided'}\n\n${n ? `I have ${n} photo${n > 1 ? 's' : ''} of the pack and can share ${n > 1 ? 'them' : 'it'} on request.` : 'I can share photos of the pack on request.'} Please arrange a replacement or refund and confirm the next steps.\n\nThank you.`;
}

const issuesOf = (p) => p.issues.length;

function resultCard(last) {
  if (!last) return '';
  if (!last.issues.length) return `<section class="card result good"><span class="badge">${icon('check', 14)} Checks passed</span><h2>Nothing wrong spotted on this pack</h2>
    <p>Saved to your pack records with batch ${esc(last.batch || 'n/a')}, so you can quote it if you ever need support. This checklist covers what you can see. It cannot prove that a product is genuine, so buy from the brand's own store or trusted sellers.</p></section>`;
  const msg = complaint(last);
  return `<section class="card result bad"><span class="badge red">${icon('alert', 14)} ${last.issues.length} issue${last.issues.length > 1 ? 's' : ''} found</span>
    <h2>Don't use this pack until it is checked</h2><ul class="ticks bad">${last.issues.map((i) => `<li>${icon('alert', 16)} ${esc(i)}</li>`).join('')}</ul>
    <h3>Your complaint message</h3><textarea id="complaint" rows="10" readonly>${esc(msg)}</textarea>
    <div class="row"><button class="btn primary" data-act="copy">${icon('copy', 18)} Copy message</button>
    <a class="btn outline" href="mailto:?subject=${encodeURIComponent(`Issue with my order: ${last.product}`)}&body=${encodeURIComponent(msg)}">Open in email</a></div>
    <p class="note">Keep the photos and the original packaging. The batch number helps the brand trace the production batch; keep your order reference to identify the purchase.</p></section>`;
}

const form = (s) => `<form id="pack" class="card stack-form"><h2>Check your product label & packaging</h2><p>Use the batch number and expiry printed on your product. A batch identifies a production run, not an individual bottle. These checks cannot prove authenticity.</p>
  <fieldset class="label-scan"><legend>Read your pack label from a photo</legend><p>Photograph the batch number and expiry close up, in good light. Text is read on this device; your photo is not sent to an AI service.</p><div class="fields two"><label>Take a photo<input type="file" accept="image/*" capture="environment" data-change="scan-label"></label><label>Upload a photo<input type="file" accept="image/*" data-change="scan-label"></label></div><p class="hint">Camera capture is available on supported phones. You can always upload or type the details below.</p><div id="ocr-status" role="status" aria-live="polite"></div><details id="ocr-details" hidden><summary>Text read from photo</summary><pre id="ocr-text" style="white-space:pre-wrap"></pre></details></fieldset>
  <label class="field">Product<input name="product" list="plist" placeholder="Choose or type a product" required></label>
  <datalist id="plist">${PRODUCTS.map((p) => `<option value="${p.name}">`).join('')}</datalist>
  ${PACK_STEPS.map((st) => `<fieldset class="yn"><legend>${st.q}</legend><label class="opt"><input type="radio" name="${st.id}" value="yes" checked><span>Yes</span></label><label class="opt"><input type="radio" name="${st.id}" value="no"><span>No</span></label></fieldset>`).join('')}
  <div class="fields"><label>Batch number<input maxlength="64" name="batch" data-change="label-edited" placeholder="From the label"></label><label>Expiry date<input type="date" name="expiry" data-change="label-edited"></label><label>Order reference<input name="order" placeholder="Optional"></label></div>
  <label class="label-review"><input type="checkbox" name="labelReviewed"><span>I checked the batch number and expiry against the printed label.</span></label><button type="button" class="btn outline" data-act="verify-label">${S.mode() === 'demo' ? 'Check sample batch record' : 'Check label details'}</button><div id="label-verdict" role="status" aria-live="polite"></div>
  ${S.mode() === 'demo' ? '<p class="hint"><b>Demo lookup only:</b> try BATCH-024 with expiry 30 Jun 2027 for a match, or BATCH-010 with expiry 31 Jan 2025 for an expired sample. These are fictional records, not Man Matters data.</p>' : '<p class="hint">We can check the date you enter, but cannot verify your batch against manufacturer records. For authenticity questions, <a href="https://manmatters.com/contactus" target="_blank" rel="noopener">contact Man Matters</a> with your label photos and order details.</p>'}
  <p class="muted hint">Batch and expiry are usually printed on the carton and the bottle label (look for "Batch", "B.No." or "Exp"). If only a month is printed, pick the last day of that month.</p>
  <label class="field">Anything else you noticed (optional)<textarea name="other" rows="2" placeholder="e.g. cap was loose, label looked smudged"></textarea></label>
  <label class="photo">${icon('camera', 18)}<span><b>Add photos as evidence (optional)</b><small>Pack, seal, batch label. Stored only on this device.</small></span><input type="file" name="photo" accept="image/*" multiple></label>
  <button class="btn primary big">Check my pack</button></form>`;

const records = (s) => (s.packs.length ? `<section class="card"><h3>Pack records</h3><ul class="history rec">${[...s.packs].reverse().map((p) =>
  `<li><div class="rec-main"><b>${esc(p.product)}</b><span>${niceDate(p.date)}${p.batch ? ` · Batch ${esc(p.batch)}` : ''}${p.expiry ? ` · Exp ${niceDate(p.expiry)}` : ''}</span>
    ${(p.photoIds || []).map((id) => P.url(id)).filter(Boolean).length ? `<div class="mini">${p.photoIds.map((id) => P.url(id) && `<a href="${P.url(id)}" target="_blank" rel="noopener"><img src="${P.url(id)}" alt="Evidence photo"></a>`).join('')}</div>` : ''}</div>
    <b class="${issuesOf(p) ? 'neg' : 'pos'}">${issuesOf(p) ? `${issuesOf(p)} issue${issuesOf(p) > 1 ? 's' : ''}` : 'OK'}</b>
    <span class="acts">${issuesOf(p) ? `<button class="link" data-act="pack-view" data-id="${p.id}">Complaint</button>` : ''}<button class="link" data-act="pack-del" data-id="${p.id}">Delete</button></span></li>`).join('')}</ul></section>` : '');

export const trust = {
  id: 'trust', nav: 'Trust', kicker: 'Packaging & batch checks', icon: 'shield', title: 'Product Trust',
  pain: 'Did my order arrive the way it should?',
  lead: 'Check the packaging, seal, batch number and expiry date in two minutes. If something is wrong, get a complete complaint message ready to send.',
  status: (s) => (s.packs.length ? `${s.packs.length} pack${s.packs.length > 1 ? 's' : ''} checked` : '2-minute pack checklist'),

  render(s) {
    return `<div class="stack">${resultCard(ui.result)}${form(s)}${records(s)}</div>`;
  },
  async enter() { await P.load(S.load().packs.flatMap((p) => p.photoIds || [])); },

  changes: {
    'label-edited'(input) {
      const form=input.closest('form'); form.elements.labelReviewed.checked=false;
      form.querySelector('#label-verdict').textContent='';
    },
    async 'scan-label'(input) {
      const form=input.closest('form'), status=form.querySelector('#ocr-status');
      const file=input.files?.[0]; if(!file) return;
      const fields=form.querySelectorAll('[data-change="scan-label"]');
      fields.forEach(el=>el.disabled=true);
      form.elements.labelReviewed.checked=false;
      form.querySelector('#label-verdict').textContent='';
      form.querySelector('#ocr-details').hidden=true;
      try {
        const result=await extractLabel(file,text=>{status.textContent=text;});
        form.elements.batch.value=result.batch; form.elements.expiry.value=result.expiry;
        form.querySelector('#ocr-text').textContent=result.text;
        form.querySelector('#ocr-details').hidden=false;
        status.textContent=(result.batch ? 'Batch candidate found. ' : 'Batch not read; type it below. ')+result.note;
      } catch(error) { status.textContent=error.message+' Manual entry is still available.'; }
      finally {fields.forEach(el=>el.disabled=false); input.value='';}
    },
  },
  actions: {
    async 'verify-label'(button) {
      const form=button.closest('form'), output=form.querySelector('#label-verdict');
      const batch=form.elements.batch.value.trim(), expiry=form.elements.expiry.value;
      if(!batch || !expiry || !form.elements.labelReviewed.checked) {output.textContent='Enter batch and expiry, then confirm you checked them against the label.';return;}
      const date = new Date(`${expiry}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || !Number.isFinite(+date) || date.toISOString().slice(0,10) !== expiry) {
        output.textContent='Enter a valid expiry date from the label.'; return;
      }
      if (S.mode() !== 'demo') {
        const remaining = daysUntil(expiry);
        const verdict = remaining < 0 ? 'The entered expiry date has passed' : remaining === 0 ? 'The entered expiry date is today' : 'The entered expiry date has not passed';
        output.innerHTML=`<h3>${verdict}</h3><p>Batch ${esc(batch)} · Entered expiry: ${esc(niceDate(expiry))}</p><p>Batch authenticity is unverified. Complete the packaging checklist and contact the brand if anything looks wrong.</p>`;
        return;
      }
      button.disabled=true; output.textContent='Checking demo batch records…';
      try {
        const response=await fetch('/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({batch,expiry}),signal:AbortSignal.timeout(10000)});
        const data=await response.json();if(!response.ok) throw new Error(data.error || 'Check failed');
        const labels={matched:'Batch and expiry match a demo record',expired:'An entered or sample-record expiry date has passed',mismatch:'Batch found, but expiry does not match the demo record',unknown:'No sample record found — this says nothing about authenticity'};
        output.innerHTML=`<h3>${esc(labels[data.status])}</h3><p>${data.product ? esc(data.product.product)+' · Registry expiry: '+esc(data.product.expiry) : 'No manufacturer connection is available in this demo.'}</p><p>Batch checks do not prove authenticity. Continue the packaging checklist below.</p>`;
      } catch(error) {output.textContent='Could not check the registry. '+error.message;}
      finally {button.disabled=false;}
    },
    copy() {
      const t = document.getElementById('complaint');
      t.select();
      (navigator.clipboard?.writeText(t.value) || Promise.reject()).catch(() => document.execCommand('copy'));
      toast('Message copied');
    },
    'pack-view'(el) { ui.result = S.load().packs.find((p) => p.id === el.dataset.id); ui.refresh(); window.scrollTo(0, 0); },
    async 'pack-del'(el) {
      if (!confirm('Delete this pack record and its photos?')) return;
      const s = S.load(), p = s.packs.find((x) => x.id === el.dataset.id);
      for (const id of p?.photoIds || []) await P.remove(id).catch(() => {});
      s.packs = s.packs.filter((x) => x.id !== el.dataset.id); S.save(s);
      if (ui.result?.id === el.dataset.id) ui.result = null;
      ui.refresh();
    },
  },
  submits: {
    async pack(f) {
      const issues = PACK_STEPS.filter((st) => f.get(st.id) === 'no').map((st) => st.issue);
      const expiry = f.get('expiry'), other = f.get('other').trim();
      if (expiry) { const d = daysUntil(expiry); if (d < 0) issues.push('Product is past its expiry date'); else if (d < 90) issues.push('Product expires in under 3 months'); }
      if (other) issues.push(other);
      const entry = { id: S.uid(), date: S.dkey(), product: f.get('product').trim(), batch: f.get('batch').trim(), expiry, order: f.get('order').trim(), other, issues, photoIds: [] };
      let failed = false;
      for (const file of f.getAll('photo').filter((x) => x.size)) {
        try { const id = S.uid(); await P.put(id, await imageBlob(file)); entry.photoIds.push(id); } catch { failed = true; }
      }
      const s = S.load(); s.packs.push(entry); S.save(s);
      ui.result = entry; ui.refresh(); window.scrollTo(0, 0);
      if (failed) toast('Saved, but a photo could not be stored');
    },
  },
};
