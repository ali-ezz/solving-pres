// The page's real size in CSS pixels.
// Fingerprint protection (Heros Shell, for one) can fake window.innerWidth /
// innerHeight, which would leave the 3D canvas drawn at the wrong size.
// The layout box of <html> (100% × 100% in styles.css) is what the browser
// actually lays out, and ResizeObserver reports it without going through any
// spoofable window property.
const root = document.documentElement;
const first = root.getBoundingClientRect();

export const viewport = {
  w: Math.round(first.width) || window.innerWidth,
  h: Math.round(first.height) || window.innerHeight,
};

const listeners = new Set();
export const onViewportResize = (fn) => listeners.add(fn);

new ResizeObserver(([entry]) => {
  const box = entry.contentBoxSize?.[0];
  const w = Math.round(box ? box.inlineSize : entry.contentRect.width);
  const h = Math.round(box ? box.blockSize : entry.contentRect.height);
  if (!w || !h || (w === viewport.w && h === viewport.h)) return;
  viewport.w = w;
  viewport.h = h;
  listeners.forEach((fn) => fn(viewport));
}).observe(root);
