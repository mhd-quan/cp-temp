// La bàn Tư tưởng: the glint on the results' glass. A mouse resting on a tile
// brings a soft spot of light under the glass, where a window would catch in
// it, and the spot follows the hand. Built as the reading lamp is
// (lib/editionLamp.ts): one gradient rastered once, moved by transform and
// eased by a CSS transition on the compositor; the tile is measured once per
// visit, and again only after the page has scrolled. A tile carried under a
// resting hand by a scroll stays dark until the hand moves (editionHand.ts).
// Phones, the keyboard and reduced motion have no glint (quiz.css).

import { handRests } from '../editionHand';

interface Glint {
  tile: HTMLElement;
  spot: HTMLElement;
  box: DOMRect | null;
}

const glints = new WeakMap<HTMLElement, Glint>();

function glintOf(tile: HTMLElement): Glint {
  let glint = glints.get(tile);
  if (glint) {
    // The verdict's tile is refilled with each result.
    if (!glint.spot.isConnected) tile.prepend(glint.spot);
    return glint;
  }
  const spot = document.createElement('span');
  spot.className = 'tile__glint';
  spot.setAttribute('aria-hidden', 'true');
  tile.prepend(spot);
  glint = { tile, spot, box: null };
  glints.set(tile, glint);
  return glint;
}

function aim(glint: Glint, x: number, y: number) {
  glint.box ??= glint.tile.getBoundingClientRect();
  const { left, top, width, height } = glint.box;
  const at = (value: number, low: number, size: number) =>
    Math.round(Math.min(Math.max(value - low, 0), size));
  glint.spot.style.transform = `translate3d(${at(x, left, width)}px, ${at(y, top, height)}px, 0)`;
}

/** Lights the tiles of `scope` under a mouse. Returns a function that stops it. */
export function initGlints(scope: HTMLElement): () => void {
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  let current: Glint | null = null;
  let point = { x: 0, y: 0 };
  let queued = 0;

  const follow = (event: PointerEvent) => {
    point = { x: event.clientX, y: event.clientY };
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      if (!current) return;
      if (!('lit' in current.tile.dataset)) light(current);
      else aim(current, point.x, point.y);
    });
  };
  // Switched on where the hand is: placed first, without gliding there.
  const light = (glint: Glint) => {
    glint.box = null;
    glint.tile.dataset.lampPlace = '';
    aim(glint, point.x, point.y);
    glint.tile.dataset.lit = '';
    requestAnimationFrame(() => requestAnimationFrame(() => delete glint.tile.dataset.lampPlace));
  };
  const leave = () => {
    if (!current) return;
    current.tile.removeEventListener('pointermove', follow as EventListener);
    delete current.tile.dataset.lit;
    current = null;
  };
  const over = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !hover.matches) return;
    const tile = (event.target as Element).closest<HTMLElement>('.tile');
    if (tile === current?.tile) return;
    leave();
    if (!tile || !scope.contains(tile)) return;
    current = glintOf(tile);
    point = { x: event.clientX, y: event.clientY };
    if (!handRests()) light(current);
    tile.addEventListener('pointermove', follow as EventListener, { passive: true });
  };
  const moved = () => {
    if (current) current.box = null;
  };

  scope.addEventListener('pointerover', over as EventListener, { passive: true });
  scope.addEventListener('pointerleave', leave);
  addEventListener('scroll', moved, { passive: true });
  return () => {
    leave();
    scope.removeEventListener('pointerover', over as EventListener);
    scope.removeEventListener('pointerleave', leave);
    removeEventListener('scroll', moved);
  };
}
