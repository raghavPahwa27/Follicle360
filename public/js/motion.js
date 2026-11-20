// Animate once as each section enters view; never hide content if JS or observers fail.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let observer, routeKey, seen = new Set();
const animations = new Set();
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    observer?.disconnect();
    for (const animation of animations) animation.cancel();
    animations.clear();
  }
});
export function revealOnScroll(root, route) {
  observer?.disconnect();
  for (const animation of animations) animation.cancel();
  animations.clear();
  if (route !== routeKey) { routeKey = route; seen = new Set(); }
  if (!root || reducedMotion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const sections = [...root.querySelectorAll('.card, .tool, .stats')]
    .filter(el => !el.parentElement.closest('.card, .tool, .stats'));
  observer = new IntersectionObserver(entries => {
    let stagger = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target, key = sections.indexOf(el);
      observer.unobserve(el);
      if (seen.has(key)) continue;
      seen.add(key);
      const animation = el.animate([
        { opacity: 0, transform: 'translateY(22px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 520, delay: Math.min(stagger++ * 65, 195), easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' });
      animations.add(animation);
      animation.onfinish = animation.oncancel = () => animations.delete(animation);
    }
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
  sections.forEach(el => observer.observe(el));
}
