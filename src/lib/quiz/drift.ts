// La bàn Tư tưởng, at the door (components/edition/CompassDoor.astro): the page's side of the
// cube in motion. The motion and the drawing are doorScene.ts's, in a worker on an
// OffscreenCanvas where the browser has one, on a canvas here where it has not. This side
// only watches what a reader does and tells the scene; while the cube moves it does nothing.
//
// On the first page the cube turns by itself (`wander`). It eases to a stop for a hand or a
// key that comes to the door, and stops when it is off screen, when the page is not in view,
// or when no one has touched the page for a while; the page and the name over the cube never
// move, a still frame around the turn. A mouse that comes near makes the cube lean a little
// toward the hand, as if to look at it, and settle back when the hand goes; only a hand that
// moves is answered (pointermove), never the page scrolling beneath one at rest. With reduced
// motion, or without a script, the drawing stays as the page set it: the cube at rest (the
// SVG), which the canvas covers from its first frame on.

import { CENTRE, REACH, SKETCH_WIDTH } from './doorReach.ts';
import type { Colours, SceneInit, SceneInput, SceneOutput, Size } from './doorScene.ts';

/** How far from the cube a hand is still near, in widths of the cube. */
const NEAR = 1.1;
/** Seconds with no hand, key or scroll on the page after which it comes to rest, until one is. */
const IDLE = 90;

const ratio = () => devicePixelRatio || 1;

/**
 * Leans the cube in `stage` toward a hand moving anywhere in `region`; with `wander`, it also
 * turns by itself while it is on screen.
 */
export function drift(stage: HTMLElement, region: HTMLElement, { wander = false } = {}): void {
  const hand = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if ((!hand && !wander) || reduced.matches) return;
  const svg = stage.querySelector('svg');
  if (!svg) return;

  // What the scene is to do: always sent whole, so a scene started late (or again) is told
  // where things stand.
  const state = {
    go: false,
    lean: { x: 0, y: 0, near: 0 },
    size: null as Size | null,
  };
  let send: ((input: SceneInput) => void) | null = null;
  const tell = (input: SceneInput) => send?.(input);

  // The drawing's colours, as the page's styles set them now (door.css): read again when the
  // reader changes the appearance. The dots, seen through together in the drawing, come laid
  // on the paper at that opacity by the page's own mixing, so the scene draws them solid.
  const probe = document.createElement('span');
  probe.hidden = true;
  stage.append(probe);
  const colours = (): Colours => {
    const of = (selector: string) => getComputedStyle(svg.querySelector(selector) as Element);
    const opacity = Number(of('.cube__dots').opacity) || 1;
    const laid = (colour: string) => {
      probe.style.color = `color-mix(in srgb, ${colour} ${opacity * 100}%, var(--paper))`;
      return getComputedStyle(probe).color;
    };
    return {
      front: of('.cube__edge--front').stroke,
      back: of('.cube__edge--back').stroke,
      axis: of('.cube__axis').stroke,
      floor: of('.cube__floor').fill,
      dots: [...svg.querySelectorAll('.cube__dots [data-p]')].map((path) =>
        laid(getComputedStyle(path).stroke),
      ),
    };
  };

  // The canvas laid on whole screen pixels: its corner and its size rounded to them, and the
  // cube's centre placed on it to the fraction of a pixel where the drawing has it. Each pixel
  // the scene draws is then one the screen shows, never stretched or shifted between them,
  // and the hairlines stay as sharp as the drawing's. Laid again when the box changes size,
  // when the type has settled and when the screen's pixels change (a zoom, another screen).
  let canvas: HTMLCanvasElement | null = null;
  const lay = () => {
    if (!canvas) return;
    const dpr = ratio();
    const box = stage.getBoundingClientRect();
    const x = box.left + scrollX;
    const y = box.top + scrollY;
    const unit = (box.width / SKETCH_WIDTH) * dpr;
    const cx = x * dpr + CENTRE.x * unit;
    const cy = y * dpr + CENTRE.y * unit;
    const left = Math.round(cx - REACH.left * unit);
    const top = Math.round(cy - REACH.top * unit);
    const width = Math.round(REACH.width * unit);
    const height = Math.round(REACH.height * unit);
    Object.assign(canvas.style, {
      left: `${left / dpr - x}px`,
      top: `${top / dpr - y}px`,
      width: `${width / dpr}px`,
      height: `${height / dpr}px`,
    });
    state.size = { width, height, dpr, unit, x: cx - left, y: cy - top };
    tell({ kind: 'size', ...state.size });
  };
  new ResizeObserver(lay).observe(stage);
  addEventListener('resize', lay, { passive: true });
  document.fonts?.ready.then(lay);
  const fresh = () => {
    canvas?.remove();
    canvas = document.createElement('canvas');
    canvas.className = 'cube__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(canvas);
    lay();
    return canvas;
  };
  const begin = (): SceneInit => ({
    families: [...svg.querySelectorAll<SVGElement>('.cube__dots [data-p]')].map(
      (path) => path.dataset.p ?? '',
    ),
    colours: colours(),
    size: state.size as Size,
    wander,
    seed: Math.random(),
  });
  // The canvas covers the drawing from its first frame, the same cube at the same place.
  const shown = (output: SceneOutput) => {
    if (output.kind === 'drawn') svg.style.visibility = 'hidden';
  };
  const ready = (receive: (input: SceneInput) => void) => {
    send = receive;
    if (state.size) receive({ kind: 'size', ...state.size });
    receive({ kind: 'go', on: state.go });
    receive({ kind: 'lean', ...state.lean });
  };
  const here = async () => {
    const surface = fresh();
    const { scene } = await import('./doorScene.ts');
    ready(scene(surface, begin(), shown));
  };
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    const surface = fresh();
    if (!('transferControlToOffscreen' in surface) || typeof Worker !== 'function') {
      here();
      return;
    }
    try {
      const worker = new Worker(new URL('./door.worker.ts', import.meta.url), { type: 'module' });
      const init = begin();
      const offscreen = surface.transferControlToOffscreen();
      worker.addEventListener('message', (event: MessageEvent<SceneOutput>) => shown(event.data));
      // A worker that cannot start leaves the drawing to the page.
      worker.addEventListener('error', () => {
        worker.terminate();
        send = null;
        here();
      });
      worker.postMessage({ kind: 'start', canvas: offscreen, init }, [offscreen]);
      ready((input) => worker.postMessage(input));
    } catch {
      here();
    }
  };

  // The appearance changed: the drawing takes its new colours.
  const recolour = () => send && tell({ kind: 'colours', colours: colours() });
  new MutationObserver(recolour).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolour);

  // ---------- the first page's own turn ----------
  let seen = false;
  let held = false;
  let present = performance.now();
  let idle = 0;
  const decide = () => {
    const go =
      wander &&
      seen &&
      !held &&
      !reduced.matches &&
      document.visibilityState === 'visible' &&
      performance.now() - present < IDLE * 1000;
    if (go === state.go) return;
    state.go = go;
    tell({ kind: 'go', on: go });
  };
  /** Off screen, out of view or asked to be still: stopped where it is, to set off from rest. */
  const halt = () => {
    state.go = false;
    tell({ kind: 'halt' });
  };
  if (wander) {
    new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      if (!seen) return halt();
      start();
      decide();
    }).observe(stage);
    document.addEventListener('visibilitychange', () =>
      document.visibilityState === 'visible' ? decide() : halt(),
    );
    reduced.addEventListener('change', () => (reduced.matches ? halt() : decide()));
    region.addEventListener('focusin', () => {
      held = true;
      decide();
    });
    region.addEventListener('focusout', () => {
      held = false;
      decide();
    });
    // Someone is reading: a page left open and untouched lets the cube come to rest. The
    // clock is wound at most once a second, however busy the hand.
    const back = () => {
      const now = performance.now();
      if (now - present < 1000 && state.go) return;
      present = now;
      clearTimeout(idle);
      idle = window.setTimeout(decide, IDLE * 1000 + 50);
      decide();
    };
    back();
    for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll'])
      addEventListener(type, back, { passive: true });
  }
  if (!hand) return;

  // The cube's place on the page (not on the screen, so a scroll never puts it out of date)
  // is read when the hand comes into the region, never on every move: the page is not
  // measured while the hand travels over it. A new width of the window reads it again.
  let place: { x: number; y: number; size: number } | null = null;
  const measure = () => {
    const box = stage.getBoundingClientRect();
    place = {
      x: box.left + scrollX + box.width / 2,
      y: box.top + scrollY + box.height / 2,
      size: Math.max(box.width, 1),
    };
  };
  region.addEventListener('pointerenter', () => {
    measure();
    start();
  });
  addEventListener('resize', () => (place = null), { passive: true });

  region.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || reduced.matches) return;
    if (!place) measure();
    if (!place) return;
    const dx = (event.pageX - place.x) / place.size;
    const dy = (event.pageY - place.y) / place.size;
    // Full lean within the cube itself, fading to none a little way beyond it.
    const near = Math.max(0, Math.min(1, (NEAR - Math.hypot(dx, dy)) / (NEAR - 0.5)));
    const clamp = (value: number) => Math.max(-1, Math.min(1, value * 2));
    state.lean = { x: clamp(dx), y: clamp(dy), near };
    tell({ kind: 'lean', ...state.lean });
  });
  region.addEventListener('pointerleave', () => {
    state.lean = { x: 0, y: 0, near: 0 };
    tell({ kind: 'lean', ...state.lean });
  });
}
