// La bàn Tư tưởng, at the door: the cube in motion, drawn on a canvas, and the motion itself.
// Free of the page (no DOM): it runs in a worker on an OffscreenCanvas wherever the browser
// offers one (door.worker.ts), on the page's own canvas where not (drift.ts). The page tells
// it what a reader does (a hand near, the door on screen or not, the colours, the size); it
// keeps the springs, the cube's own clock and the drawing. While the cube moves the page does
// no work at all: no element changes, nothing is laid out or restyled, and the drawing, a few
// dozen strokes and dots a frame, is done beside the page, not on its thread.
//
// The first page's cube turns by itself, about all three of its axes, on a path that never
// comes round to the same place (`wander`): a cloud of points turning is how an eye reads its
// depth, so the compass's spread shows without a hand on it. Every change of pace, the lean
// toward a hand and the setting off and coming to rest, is a critically damped spring, so
// nothing jumps, overshoots or bounces, and the cube can be caught mid-turn.

import { frame, type Point3, project, unit, VIEWS, type View } from './compass.ts';

/** Degrees the cube leans toward a hand at most, left and right, then up and down. */
const YAW = 11;
const PITCH = 7;
/** Pixels the cube drifts toward the hand at most, under the name laid over it. */
const SHIFT = 6;
/** The lean's spring response, in seconds. */
const RESPONSE = 0.6;

// ---------- the first page's own turn ----------
// Each of the three turns is the sum of two swells whose lengths are no whole multiple of one
// another (they stand in the golden ratio, or the square root of two): together they never
// repeat, so the turn cannot be learnt; each is bounded, so the cube is never seen from below,
// edge on or askew. At TEMPO 1.4, over ten minutes of two hundred visits, it never turns faster
// than 13° a second, nor changes speed by more than 4° a second in a second.
const PHI = (1 + Math.sqrt(5)) / 2;
/** A swell: how large, and how many seconds of the path it takes to come round. */
type Swell = readonly [size: number, seconds: number];
/** How much faster than the clock the path is run: the one setting for the turn's speed. */
const TEMPO = 1.4;
/** Degrees a second of the path the cube turns about its upright, on average. */
const TURN = 3;
/** That pace swells by these (degrees a second): now and then it slows, rests and turns back. */
const TURN_SWELLS: readonly Swell[] = [
  [3.5, 19],
  [2, 19 * PHI],
];
/** How far it is seen from above, about its rest (degrees): between 16° and 40°. */
const PITCH_SWELLS: readonly Swell[] = [
  [8, 13 * Math.SQRT2],
  [4, 27],
];
/** Its lean about the line of sight (degrees): the least, as the turn that unsettles most. */
const ROLL_SWELLS: readonly Swell[] = [
  [3.5, 23],
  [1.5, 23 * PHI],
];
/** Seconds of the path over which the swells grow from nothing: it sets off from rest. */
const GROW = 4;
/** The response, in seconds, of the pace at which it sets off, stops for a hand and goes on. */
const PACE = 1.2;

/** A dot's radius, in the sketch's units (door.css: a round cap 5.2 wide). */
const DOT = 2.6;

const TAU = 2 * Math.PI;
const smooth = (x: number) => x * x * (3 - 2 * x);

export interface Colours {
  front: string;
  back: string;
  axis: string;
  floor: string;
  /**
   * One for each family's dots, in the drawing's order, already laid on the paper at the
   * opacity the drawing gives its dots together (drift.ts): drawn solid, the nearer dot covers
   * the other where two overlap, as in the drawing, and no layer is composed for them.
   */
  dots: string[];
}

export interface SceneInit {
  /** Each family's dots, as the drawing keeps them: "x y z,x y z…", 0–100 on each dimension. */
  families: string[];
  colours: Colours;
  size: Size;
  wander: boolean;
  /** Where in its course each swell starts, drawn from this: a new path on each visit. */
  seed: number;
}

/**
 * The canvas in the screen's own pixels, laid on whole ones, so each pixel drawn is one shown
 * and nothing is stretched (drift.ts); the screen's pixels to a CSS pixel; the sketch's units
 * in screen pixels; and where the cube's centre falls on the canvas, to a fraction of a pixel,
 * exactly where the drawing it takes the place of has it.
 */
export interface Size {
  width: number;
  height: number;
  dpr: number;
  unit: number;
  x: number;
  y: number;
}

export type SceneInput =
  /** Toward a hand: `x`, `y` its side, −1 … 1; `near`, 0 … 1, how near it is. */
  | { kind: 'lean'; x: number; y: number; near: number }
  | { kind: 'go'; on: boolean }
  | { kind: 'halt' }
  | { kind: 'colours'; colours: Colours }
  | ({ kind: 'size' } & Size);

export type SceneOutput = { kind: 'drawn' };

type Surface = HTMLCanvasElement | OffscreenCanvas;
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

interface Spring {
  value: number;
  velocity: number;
  target: number;
}

function step(spring: Spring, dt: number, response: number) {
  const omega = TAU / response;
  spring.velocity +=
    (-omega * omega * (spring.value - spring.target) - 2 * omega * spring.velocity) * dt;
  spring.value += spring.velocity * dt;
}

/** A small, steady source of chance from one number (mulberry32). */
function chance(seed: number) {
  let state = Math.floor(seed * 2 ** 32) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

const settled = (spring: Spring) =>
  Math.abs(spring.value - spring.target) < 0.02 && Math.abs(spring.velocity) < 0.2;

/** Starts the scene on `canvas`; returns what receives the page's word. */
export function scene(
  canvas: Surface,
  init: SceneInit,
  tell: (output: SceneOutput) => void,
): (input: SceneInput) => void {
  const context = canvas.getContext('2d') as Context;
  const families = init.families.map((places) =>
    places.split(',').map((place) => unit(place.split(' ').map(Number) as Point3)),
  );
  let { colours, size } = init;

  const rest: View = VIEWS.free;
  const lean = {
    yaw: { value: 0, velocity: 0, target: 0 } as Spring,
    pitch: { value: 0, velocity: 0, target: 0 } as Spring,
  };
  let near = 0;
  const pace: Spring = { value: 0, velocity: 0, target: 0 };
  let going = false;
  let clock = 0;
  const random = chance(init.seed);
  const course = (swells: readonly Swell[]) => swells.map(() => random() * TAU);
  const phases = {
    turn: course(TURN_SWELLS),
    pitch: course(PITCH_SWELLS),
    roll: course(ROLL_SWELLS),
  };
  const swell = (swells: readonly Swell[], from: number[], t: number) =>
    swells.reduce(
      (sum, [size, seconds], i) => sum + size * Math.sin((TAU * t) / seconds + from[i]),
      0,
    );
  /** Degrees turned about the upright by path time `t`: the swelling pace, summed. */
  const turned = (t: number) =>
    TURN * t +
    TURN_SWELLS.reduce(
      (sum, [size, seconds], i) =>
        sum +
        ((size * seconds) / TAU) *
          (Math.cos(phases.turn[i]) - Math.cos((TAU * t) / seconds + phases.turn[i])),
      0,
    );

  const resize = () => {
    canvas.width = size.width;
    canvas.height = size.height;
  };

  const draw = () => {
    const grown = init.wander ? smooth(Math.min(1, clock / GROW)) : 0;
    const view: View = {
      yaw: rest.yaw + (init.wander ? turned(clock) : 0) + lean.yaw.value,
      pitch: rest.pitch + grown * swell(PITCH_SWELLS, phases.pitch, clock) + lean.pitch.value,
    };
    const roll = init.wander ? grown * swell(ROLL_SWELLS, phases.roll, clock) : 0;
    // The sketch's units to screen pixels; the origin at the cube's centre, drifted with the
    // lean (the name over the cube stays where it is) and rolled about that centre.
    const { unit, dpr } = size;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(
      unit,
      0,
      0,
      unit,
      size.x + (lean.yaw.value / YAW) * SHIFT * dpr,
      size.y + (lean.pitch.value / PITCH) * SHIFT * dpr,
    );
    context.rotate((roll * Math.PI) / 180);
    const lines = frame(view);
    // Hairlines one CSS pixel wide, and their dashes, whatever the size (door.css).
    const px = dpr / unit;
    context.lineWidth = px;
    context.fillStyle = colours.floor;
    context.fill(new Path2D(lines.floor));
    context.strokeStyle = colours.back;
    context.setLineDash([2 * px, 3 * px]);
    context.stroke(new Path2D(lines.back));
    context.strokeStyle = colours.axis;
    context.setLineDash([px, 3 * px]);
    context.stroke(new Path2D(lines.axes));
    context.setLineDash([]);
    families.forEach((places, f) => {
      context.fillStyle = colours.dots[f];
      context.beginPath();
      for (const at of places) {
        const p = project(at, view);
        context.moveTo(p.x + DOT, p.y);
        context.arc(p.x, p.y, DOT, 0, TAU);
      }
      context.fill();
    });
    context.strokeStyle = colours.front;
    context.stroke(new Path2D(lines.front));
  };

  // A frame each time the screen shows one, in a worker as on the page; a timer only where a
  // worker has no frames of its own.
  const ask =
    typeof requestAnimationFrame === 'function'
      ? (next: (time: number) => void) => requestAnimationFrame(next)
      : (next: (time: number) => void) =>
          setTimeout(() => next(performance.now()), 1000 / 60) as unknown as number;
  const drop =
    typeof cancelAnimationFrame === 'function'
      ? (id: number) => cancelAnimationFrame(id)
      : (id: number) => clearTimeout(id);
  let frameId = 0;
  let last = 0;

  const tick = (time: number) => {
    const dt = Math.min(0.05, (time - last) / 1000 || 1 / 60);
    last = time;
    // At full pace while it may go, slowing to a stop as a hand comes near.
    pace.target = going ? 1 - near : 0;
    for (let t = 0; t < dt; t += 0.008) {
      const h = Math.min(0.008, dt - t);
      step(lean.yaw, h, RESPONSE);
      step(lean.pitch, h, RESPONSE);
      step(pace, h, PACE);
      clock += Math.max(0, pace.value) * TEMPO * h;
    }
    const leaning = !(settled(lean.yaw) && settled(lean.pitch));
    if (!leaning)
      for (const spring of [lean.yaw, lean.pitch]) {
        spring.value = spring.target;
        spring.velocity = 0;
      }
    const moving = pace.target > 0 || pace.value > 0.002;
    if (!moving) pace.value = pace.velocity = 0;
    draw();
    frameId = leaning || moving ? ask(tick) : 0;
  };
  const run = () => {
    if (frameId) return;
    if (!going && pace.value === 0 && settled(lean.yaw) && settled(lean.pitch)) return;
    last = performance.now();
    frameId = ask(tick);
  };

  resize();
  draw();
  tell({ kind: 'drawn' });

  return (input) => {
    switch (input.kind) {
      case 'lean':
        lean.yaw.target = input.x * YAW * input.near;
        lean.pitch.target = input.y * PITCH * input.near;
        near = input.near;
        run();
        break;
      case 'go':
        going = init.wander && input.on;
        run();
        break;
      case 'halt':
        drop(frameId);
        frameId = 0;
        going = false;
        pace.value = pace.velocity = 0;
        break;
      case 'colours':
        colours = input.colours;
        if (!frameId) draw();
        break;
      case 'size': {
        const { kind: _, ...next } = input;
        if ((Object.keys(next) as (keyof Size)[]).every((key) => next[key] === size[key])) break;
        size = next;
        resize();
        draw();
        break;
      }
    }
  };
}
