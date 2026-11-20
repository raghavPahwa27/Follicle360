// Main dashboard: five independent tools. Open any of them, in any order.
import * as S from '../store.js';
import { icon } from '../icons.js';
import { journey } from '../journey.js';
import { ui, esc, toast } from '../ui.js';
import { seedDemo } from '../demo.js';

export const hub = {
  render(s, modules) {
    const cards = modules.map((m, i) => `<a class="tool" style="--i:${i}" href="#${m.id}">
      <span class="step">${m.kicker}</span>
      <span class="ico">${icon(m.icon, 24)}</span>
      <h3>${m.title}</h3>
      <p class="pain">“${esc(m.pain)}”</p>
      <span class="status">${esc(m.status(s))}</span>
      <span class="go">Open ${icon('arrow', 16)}</span></a>`).join('');
    return `<section class="card demo-switch"><div><h2>Choose your walkthrough</h2><p>Normal mode keeps your own records. The 2-month demo contains eight weeks of fictional history, stored separately.</p></div><div class="row"><button class="btn ${S.mode()==='normal'?'primary':'outline'}" data-act="normal" aria-pressed="${S.mode()==='normal'}">Normal mode</button><button class="btn ${S.mode()==='demo'?'primary':'outline'}" data-act="demo" aria-pressed="${S.mode()==='demo'}">2-month demo</button></div></section><section class="hero">
        <div class="hero-text">
          <span class="badge">Hair-care companion</span>
          <h1>Five tools for your hair-care routine, all in one place.</h1>
          <p>Choose a product, check your pack, follow a routine, track your photos and plan your next refill. Every tool works on its own, so start wherever you need.</p>
          <div class="hero-actions"><a class="btn accent" href="#finder">${icon('compass', 18)} Find a product</a><a class="btn outline-light" href="https://manmatters.com/booking-listing" target="_blank" rel="noopener noreferrer" aria-label="Consult a doctor on Man Matters (opens in a new tab)">Consult a doctor ↗</a>
            </div>
        </div>
        <div class="orbit" aria-hidden="true"><i></i><b>5</b><span>tools<br>1 app</span></div>
      </section>
      ${journey(s)}<h2 class="section-title">Pick a tool</h2>
      <div class="tools">${cards}</div>
      <p class="privacy">${icon('lock', 14)} No sign-up. Your data and photos stay on this device.</p>`;
  },
  actions: {
    async demo(el) { el.disabled = true; try { await seedDemo(); location.hash = ''; location.reload(); } catch { toast('Demo could not be loaded. Check device storage.'); el.disabled = false; } },
    normal() { S.setMode('normal'); location.hash = ''; location.reload(); },
    async reset() {
      if (confirm('Delete all your data and photos from this device?')) { await S.reset(); location.hash = ''; location.reload(); }
    },
  },
};
