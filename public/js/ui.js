// Small helpers and shared UI state used by every screen.
// `ui` only holds temporary screen state (what is open right now). Real data lives in store.js.
export const ui = { result: null, editStep: null, day: null, cmp: { a: null, b: null, mode: 'slider' }, order: null, orderForm: false, msgType: 'delay', quiz: false, refresh() {} };

export const $ = (sel) => document.querySelector(sel);
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
const at = (k) => new Date(`${k}T00:00:00`);
export const niceDate = (k) => (k ? at(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(at(k).getFullYear() !== new Date().getFullYear() && { year: 'numeric' }) }) : '—');
export const longDate = (k) => (k ? at(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const daysBetween = (a, b) => Math.round((at(b) - at(a)) / 864e5);
export const rupee = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 2600);
}

// Resize a photo before saving. 1280px keeps enough detail to compare hair density.
export const imageBlob = (file, max = 1280) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.85);
  };
  img.onerror = () => reject(new Error('read'));
  img.src = URL.createObjectURL(file);
});
