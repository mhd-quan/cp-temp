// Ấn bản: a change made to the whole page at once is shown as one turn of the
// page, a view transition. From a point (a new appearance, chosen at its
// control) the new paper spreads from there over the old page; otherwise (the
// reader's paper, size, leading, measure or face) the old page dissolves into
// the new, so nothing snaps into its new place (foundation.css, turns of the
// page; docs/motion.md).
//
// Frosted glass keeps its blur through either. The page is turned from
// pictures of itself, and Safari pictures a layer without what lies behind it:
// the bar and an open sheet went clear, the text beneath them sharp, until the
// turn was over. So each glass layer in view is taken out of the page's
// picture and drawn over it on its own (view-transition-class glass), its
// blur laid live beneath it over the turning page; in a spread, the spread is
// cut through it at the same radius, from the same point.

const GLASS =
  '.bar, .sheet:popover-open, .menu:popover-open, .search-sheet[open], .to-top[data-shown="true"], .jump, .quiz-sheet:popover-open';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const canLift = () => CSS.supports('view-transition-class', 'glass');

// The spread as a polygon of 96 sides, for the new glass, and the same
// outline cut out of the whole plane, for the old: the two share one edge, so
// no seam of both tints or of neither runs along the spread. Each is written
// out twice, at no size and at full reach, and the browser moves every point
// between the two on the page's own curve: a point of the outline is the
// centre plus the radius in its direction, so it lies on the page's circle
// in every frame. (It was one outline of 192 calc()s of a radius animated as
// a custom property: every frame restyled and recut each layer of glass.)
const SIDES = 96;
const ring = (x: number, y: number, radius: number) =>
  Array.from({ length: SIDES }, (_, index) => {
    const angle = (index / SIDES) * 2 * Math.PI;
    const px = (x - radius * Math.cos(angle)).toFixed(1);
    const py = (y + radius * Math.sin(angle)).toFixed(1);
    return `${px}px ${py}px`;
  });
// The plane is the layer and its shadow: a larger one made Chromium draw the
// old glass through a mask too large to keep at full scale.
const plane = (box: DOMRect, y: number, points: string[]) => {
  const [near, farX, farY] = [-160, box.width + 160, box.height + 160];
  return `polygon(evenodd,${near}px ${near}px,${farX}px ${near}px,${farX}px ${farY}px,${near}px ${farY}px,${near}px ${y}px,${points.join(',')},${points[0]},${near}px ${y}px)`;
};
const spreadRules = (name: string, box: DOMRect, from: { x: number; y: number }, reach: number) => {
  const x = Math.round(from.x - box.left);
  const y = Math.round(from.y - box.top);
  const [start, end] = [ring(x, y, 0), ring(x, y, reach)];
  const run = 'var(--d-spread) var(--ease-spread) both';
  return [
    `@keyframes ${name}-in{from{clip-path:polygon(${start.join(',')})}to{clip-path:polygon(${end.join(',')})}}`,
    `@keyframes ${name}-out{from{clip-path:${plane(box, y, start)}}to{clip-path:${plane(box, y, end)}}}`,
    `::view-transition-new(${name}){animation:${name}-in ${run}}`,
    `::view-transition-old(${name}){animation:${name}-out ${run}}`,
  ];
};

let current: ViewTransition | undefined;
let glassStyle: HTMLStyleElement | undefined;
let lifted: HTMLElement[] = [];

/** The turn under way, if any (the chrome waits for it to end). */
export const turning = () => current;

const lowerGlass = () => {
  for (const layer of lifted) {
    layer.style.removeProperty('view-transition-name');
    layer.style.removeProperty('view-transition-class');
  }
  lifted = [];
  if (glassStyle) glassStyle.textContent = '';
};

const liftGlass = (from?: { x: number; y: number }, reach = 0) => {
  lowerGlass();
  if (!canLift()) return;
  const rules: string[] = [];
  for (const layer of document.querySelectorAll<HTMLElement>(GLASS)) {
    const box = layer.getBoundingClientRect();
    const style = getComputedStyle(layer);
    const blur =
      style.getPropertyValue('backdrop-filter') ||
      style.getPropertyValue('-webkit-backdrop-filter');
    if (!box.width || box.bottom <= 0 || box.top >= innerHeight) continue;
    if (style.visibility !== 'visible' || !blur || blur === 'none') continue;
    const name = `glass-${lifted.length}`;
    layer.style.setProperty('view-transition-name', name);
    layer.style.setProperty('view-transition-class', 'glass');
    lifted.push(layer);
    rules.push(
      `::view-transition-group(${name}){border-radius:${style.borderRadius};-webkit-backdrop-filter:${blur};backdrop-filter:${blur}}`,
    );
    if (from) rules.push(...spreadRules(name, box, from, reach));
  }
  glassStyle ??= document.head.appendChild(document.createElement('style'));
  glassStyle.textContent = lifted.length ? rules.join('') : '';
};

/** Make a change to the whole page as one turn: spread from a point on
 * screen, or dissolved. Without view transitions, or with reduced motion,
 * the change is simply made. */
export function turnPage(apply: () => void, from?: Element | null) {
  const root = document.documentElement;
  if (reduced() || !('startViewTransition' in document)) {
    apply();
    return;
  }
  delete root.dataset.appearing;
  delete root.dataset.reflowing;
  const box = from?.getBoundingClientRect();
  const point = box?.width
    ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    : undefined;
  let reach = 0;
  if (point) {
    reach = Math.ceil(
      Math.hypot(Math.max(point.x, innerWidth - point.x), Math.max(point.y, innerHeight - point.y)),
    );
    root.style.setProperty('--spread-from', `${Math.round(point.x)}px ${Math.round(point.y)}px`);
    root.style.setProperty('--spread-reach', `${reach}px`);
  }
  const kind = point ? 'appearing' : 'reflowing';
  root.dataset[kind] = '';
  // Either way, the new page holds still while it turns (foundation.css).
  root.dataset.turning = '';
  liftGlass(point, reach);
  const transition = document.startViewTransition(apply);
  current = transition;
  transition.finished.finally(() => {
    // A second change made during the turn has taken over from this one.
    if (current !== transition) return;
    current = undefined;
    lowerGlass();
    delete root.dataset[kind];
    delete root.dataset.turning;
  });
}
