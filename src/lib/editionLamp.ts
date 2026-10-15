// Ấn bản: the reading lamp (đèn đọc). A pointer resting on a story brings a
// lamp over its print: the sheet dims by a shade, and a wide, soft pool of
// warm light follows the hand. Phones have no hover: there the lamp comes on
// under the finger when a story is tapped, for the moment before the page
// turns into the essay.
//
// Kept to the compositor. The shade is a flat layer exactly the size of the
// plate, so it can never leave an edge uncovered. The light is one gradient,
// rastered once, that fades to nothing at its rim and is moved by transform;
// its easing toward the hand is a CSS transition, so it glides on the
// compositor thread even while the page is busy. The pointer is only read
// while a story is lit, and the plate is measured once per visit (again only
// after the page has scrolled).
//
// A story that slides under a resting hand as the page scrolls stays dark
// until the hand moves (editionHand.ts): the lamp answers the hand, never
// the page moving beneath it.

import { handRests } from './editionHand';

const LIT = '.printed, .slip';

interface Lamp {
  plate: HTMLElement;
  light: HTMLElement;
  box: DOMRect | null;
  reach: number;
}

const lamps = new WeakMap<HTMLElement, Lamp>();
const lit = new Set<Lamp>();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

function lampOf(plate: HTMLElement) {
  let lamp = lamps.get(plate);
  if (lamp) return lamp;
  const print = plate.querySelector<HTMLElement>('.plate__print');
  if (!print) return null;
  const shade = document.createElement('span');
  shade.className = 'plate__shade';
  const light = document.createElement('span');
  light.className = 'plate__light';
  for (const layer of [shade, light]) layer.setAttribute('aria-hidden', 'true');
  print.append(shade, light);
  lamp = { plate, light, box: null, reach: 0 };
  lamps.set(plate, lamp);
  return lamp;
}

function measure(lamp: Lamp) {
  const box = lamp.plate.getBoundingClientRect();
  lamp.box = box;
  // A wide pool: most of the plate is inside it, the brightest part is soft.
  lamp.reach = Math.round(Math.min(Math.max(Math.max(box.width, box.height) * 0.85, 240), 480));
  lamp.light.style.setProperty('--lamp-r', `${lamp.reach}px`);
  return box;
}

// The pool is centred on the hand, held inside the plate (a hand resting on
// the headline below lights the foot of the print, never beyond it).
function aim(lamp: Lamp, point?: { x: number; y: number }) {
  const box = lamp.box ?? measure(lamp);
  const x =
    point && !reduced.matches
      ? Math.min(Math.max(point.x - box.left, 0), box.width)
      : box.width / 2;
  const y =
    point && !reduced.matches
      ? Math.min(Math.max(point.y - box.top, 0), box.height)
      : box.height * 0.42;
  lamp.light.style.transform = `translate3d(${Math.round(x - lamp.reach)}px, ${Math.round(y - lamp.reach)}px, 0)`;
}

function light(story: Element, point?: { x: number; y: number }, quick = false) {
  for (const plate of story.querySelectorAll<HTMLElement>('.plate')) {
    const lamp = lampOf(plate);
    if (!lamp) continue;
    if (lit.has(lamp)) {
      aim(lamp, point);
      continue;
    }
    // Switched on where the hand is: placed first, without gliding there.
    measure(lamp);
    plate.dataset.lampPlace = '';
    aim(lamp, point);
    plate.toggleAttribute('data-lamp-quick', quick);
    plate.dataset.lit = '';
    lit.add(lamp);
    requestAnimationFrame(() => requestAnimationFrame(() => delete plate.dataset.lampPlace));
  }
}

function extinguish(except?: Element | null) {
  for (const lamp of lit) {
    if (except?.contains(lamp.plate)) continue;
    delete lamp.plate.dataset.lit;
    lamp.box = null;
    lit.delete(lamp);
  }
}

export function initLamps() {
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  let current: Element | null = null;
  let point = { x: 0, y: 0 };
  let queued = 0;

  const follow = (event: PointerEvent) => {
    point = { x: event.clientX, y: event.clientY };
    queued ||= requestAnimationFrame(() => {
      queued = 0;
      if (current) light(current, point);
    });
  };
  const leave = () => {
    current?.removeEventListener('pointermove', follow as EventListener);
    current = null;
    extinguish();
  };

  // A mouse: the lamp comes on when the hand enters a story, and is read only
  // while it stays there. A story the page carried under a resting hand is
  // lit by the hand's first move (follow), not by its arrival.
  document.addEventListener(
    'pointerover',
    (event) => {
      if (event.pointerType !== 'mouse' || !hover.matches) return;
      const story = (event.target as Element).closest(LIT);
      if (story === current) return;
      leave();
      if (!story) return;
      current = story;
      point = { x: event.clientX, y: event.clientY };
      if (!handRests()) light(story, point);
      story.addEventListener('pointermove', follow as EventListener, { passive: true });
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', leave);
  // The page moved under the hand: measure again on the next movement.
  addEventListener(
    'scroll',
    () => {
      for (const lamp of lit) lamp.box = null;
    },
    { passive: true },
  );

  // A finger: the lamp comes on under it when a story is tapped. A touch that
  // turns into a scroll is cancelled before the lamp shows.
  let pending = 0;
  let expire = 0;
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'mouse') return;
      const story = (event.target as Element).closest(LIT);
      if (!story) return;
      const at = { x: event.clientX, y: event.clientY };
      clearTimeout(pending);
      pending = window.setTimeout(() => light(story, at, true), 60);
    },
    { passive: true },
  );
  document.addEventListener('pointercancel', () => {
    clearTimeout(pending);
    extinguish();
  });
  document.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse') return;
    clearTimeout(expire);
    // Held while the page turns; let go if the tap led nowhere.
    expire = window.setTimeout(() => extinguish(current), 1400);
  });
  addEventListener('pageshow', () => extinguish());

  // Keyboard: the lamp stands over the story that has focus.
  document.addEventListener('focusin', (event) => {
    const target = event.target as Element;
    const story = target.closest(LIT);
    if (!story || !target.matches(':focus-visible')) return;
    extinguish(story);
    light(story);
  });
  document.addEventListener('focusout', (event) => {
    if (!(event.relatedTarget as Element | null)?.closest(LIT) && !current) extinguish();
  });
}
