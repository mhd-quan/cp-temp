// La bàn Tư tưởng: turning the cube (compass.ts) under the hand. The cube follows a drag one
// to one, keeps the hand's speed when let go and slows as a spun globe does, and can be
// caught again at any moment; a press on a named view, or an arrow key, turns it there on a
// critically damped spring from wherever it is, so nothing jumps and nothing bounces. Where
// a mouse rests over a cube that asks for it (the first page's), the cube leans a little
// toward it. With reduced motion every turn is immediate and nothing coasts.

import { BOX, frame, type Point3, poleAt, project, unit, VIEWS, type View } from './compass.ts';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const r = (value: number) => (Math.round(value * 10) / 10).toString();

/** Degrees per second below which a coasting cube stops. */
const REST = 4;
/** Share of its speed a coasting cube keeps after a millisecond (Apple's scroll deceleration). */
const COAST = 0.997;
/** A view or a key settles in about this long, in seconds (a spring's response). */
const RESPONSE = 0.42;
/** A drag starts only past this many pixels, so a tap on a seal stays a tap. */
const SLOP = 5;
/** The cube is never turned past looking straight down or straight up. */
const PITCH = 90;

interface Mark {
  element: SVGGraphicsElement;
  at: Point3;
  kind: 'dot' | 'seal' | 'you';
  /** Where it was last drawn, in drawing units. */
  x: number;
  y: number;
}

interface Spring {
  value: number;
  velocity: number;
  target: number;
}

/** One step of a critically damped spring toward its target. */
function step(spring: Spring, dt: number) {
  const omega = (2 * Math.PI) / RESPONSE;
  const acceleration =
    -omega * omega * (spring.value - spring.target) - 2 * omega * spring.velocity;
  spring.velocity += acceleration * dt;
  spring.value += spring.velocity * dt;
}

/** Turns one cube stage. Returns a function that stops it. */
export function orbit(stage: HTMLElement, { lean = false } = {}): () => void {
  const svg = stage.querySelector('svg') as SVGSVGElement;
  const paths = {
    front: svg.querySelector('.cube__edge--front') as SVGPathElement,
    back: svg.querySelector('.cube__edge--back') as SVGPathElement,
    floor: svg.querySelector('.cube__floor') as SVGPathElement,
    axes: svg.querySelector('.cube__axis') as SVGPathElement,
    drop: svg.querySelector('.cube__drop') as SVGPathElement | null,
    needle: svg.querySelector('.cube__needle') as SVGPathElement | null,
    shadow: svg.querySelector('.cube__shadow') as SVGEllipseElement | null,
  };
  const seals = svg.querySelector('.cube__seals') as SVGGElement;
  const marks: Mark[] = [...svg.querySelectorAll<SVGGraphicsElement>('[data-p]')].map(
    (element) => ({
      element,
      at: unit((element.dataset.p ?? '50 50 50').split(' ').map(Number) as Point3),
      kind: element.classList.contains('cube__dot')
        ? 'dot'
        : element.classList.contains('cube__seal')
          ? 'seal'
          : 'you',
      x: 0,
      y: 0,
    }),
  );
  const byElement = new Map(marks.map((mark) => [mark.element as Element, mark]));
  /** The name of the dot or seal under the pointer, set over the drawing in the page's type. */
  const tip = stage.querySelector<HTMLElement>('.cube__tip');
  let tipped: Mark | null = null;
  const placeTip = () => {
    if (!tip || !tipped) return;
    tip.style.left = `${r(((tipped.x + BOX) / (2 * BOX)) * 100)}%`;
    tip.style.top = `${r(((tipped.y + BOX) / (2 * BOX)) * 100)}%`;
  };
  const showTip = (mark: Mark | null) => {
    if (!tip || mark === tipped) return;
    tipped?.element.removeAttribute('data-tipped');
    tipped = mark;
    if (!mark) {
      tip.hidden = true;
      return;
    }
    mark.element.setAttribute('data-tipped', '');
    tip.textContent = mark.element.dataset.name ?? '';
    tip.dataset.family = mark.element.dataset.family ?? '';
    tip.hidden = false;
    placeTip();
  };
  const you = marks.find((mark) => mark.kind === 'you');
  const poles = [...stage.querySelectorAll<HTMLElement>('.cube__pole')];

  const yaw: Spring = { value: Number(stage.dataset.yaw), velocity: 0, target: 0 };
  const pitch: Spring = { value: Number(stage.dataset.pitch), velocity: 0, target: 0 };
  /** The lean toward a resting mouse, added to the turn. */
  const tilt = {
    yaw: { value: 0, velocity: 0, target: 0 },
    pitch: { value: 0, velocity: 0, target: 0 },
  };
  let mode: 'still' | 'coast' | 'spring' = 'still';
  let dragging = false;
  let frameId = 0;
  let last = 0;
  let order = '';

  const view = (): View => ({
    yaw: yaw.value + tilt.yaw.value,
    pitch: Math.max(-PITCH, Math.min(PITCH, pitch.value + tilt.pitch.value)),
  });

  function paint() {
    const now = view();
    const lines = frame(now);
    paths.front.setAttribute('d', lines.front);
    paths.back.setAttribute('d', lines.back);
    paths.floor.setAttribute('d', lines.floor);
    paths.axes.setAttribute('d', lines.axes);
    const depths: [number, SVGGraphicsElement][] = [];
    for (const mark of marks) {
      const p = project(mark.at, now);
      mark.x = p.x;
      mark.y = p.y;
      if (mark.kind === 'dot') {
        mark.element.setAttribute('cx', r(p.x));
        mark.element.setAttribute('cy', r(p.y));
        mark.element.setAttribute('r', r(2.6 * p.scale));
      } else mark.element.setAttribute('transform', `translate(${r(p.x)} ${r(p.y)})`);
      if (mark.kind === 'seal') depths.push([p.depth, mark.element]);
    }
    // Seals nearer the reader are drawn over those behind them.
    depths.sort((a, b) => a[0] - b[0]);
    const next = depths.map(([, element]) => element.dataset.profile).join();
    if (next !== order) {
      order = next;
      for (const [, element] of depths) seals.append(element);
    }
    if (you) {
      const p = project(you.at, now);
      const ground = project([you.at[0], -1, you.at[2]], now);
      const centre = project([0, 0, 0], now);
      paths.drop?.setAttribute('d', `M${r(p.x)} ${r(p.y)}L${r(ground.x)} ${r(ground.y)}`);
      paths.needle?.setAttribute('d', `M${r(centre.x)} ${r(centre.y)}L${r(p.x)} ${r(p.y)}`);
      paths.shadow?.setAttribute('cx', r(ground.x));
      paths.shadow?.setAttribute('cy', r(ground.y));
    }
    for (const pole of poles) {
      const at = poleAt(Number(pole.dataset.dim), Number(pole.dataset.side) as 0 | 1, now);
      pole.style.left = `${r(at.left)}%`;
      pole.style.top = `${r(at.top)}%`;
      pole.style.opacity = at.opacity.toFixed(2);
    }
    placeTip();
  }

  const settled = (spring: Spring) =>
    Math.abs(spring.value - spring.target) < 0.05 && Math.abs(spring.velocity) < 0.5;

  function tick(time: number) {
    const dt = Math.min(0.032, (time - last) / 1000 || 0.016);
    last = time;
    let moving = false;
    if (mode === 'coast') {
      const keep = COAST ** (dt * 1000);
      yaw.velocity *= keep;
      pitch.velocity *= keep;
      yaw.value += yaw.velocity * dt;
      pitch.value += pitch.velocity * dt;
      // At the top or the bottom the spin is caught, not stopped dead.
      if (Math.abs(pitch.value) > PITCH) {
        pitch.value = Math.sign(pitch.value) * PITCH;
        pitch.velocity = 0;
      }
      if (Math.hypot(yaw.velocity, pitch.velocity) < REST) mode = 'still';
      else moving = true;
    } else if (mode === 'spring') {
      // Small steps keep the spring stable on a slow frame.
      for (let t = 0; t < dt; t += 0.008) {
        step(yaw, Math.min(0.008, dt - t));
        step(pitch, Math.min(0.008, dt - t));
      }
      if (settled(yaw) && settled(pitch)) {
        yaw.value = yaw.target;
        pitch.value = pitch.target;
        yaw.velocity = pitch.velocity = 0;
        mode = 'still';
      } else moving = true;
    }
    for (const spring of [tilt.yaw, tilt.pitch]) {
      for (let t = 0; t < dt; t += 0.008) step(spring, Math.min(0.008, dt - t));
      if (!settled(spring)) moving = true;
      else spring.value = spring.target;
    }
    paint();
    frameId = moving || dragging ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (frameId) return;
    last = performance.now();
    frameId = requestAnimationFrame(tick);
  };

  /** Turns the cube to a view: on a spring from where it is, or at once. */
  function turnTo(target: View) {
    // The short way round.
    const turns = Math.round((yaw.value - target.yaw) / 360);
    yaw.target = target.yaw + turns * 360;
    pitch.target = target.pitch;
    if (reduced()) {
      yaw.value = yaw.target;
      pitch.value = pitch.target;
      yaw.velocity = pitch.velocity = 0;
      mode = 'still';
      paint();
      return;
    }
    mode = 'spring';
    run();
  }

  // The named views beside the cube, if any.
  const figure = stage.closest('[data-cube-figure]');
  const buttons = figure ? [...figure.querySelectorAll<HTMLButtonElement>('[data-view]')] : [];

  // ---------- the hand ----------
  let start: { x: number; y: number; id: number } | null = null;
  let history: { x: number; y: number; t: number }[] = [];
  let moved = false;
  const degrees = () => 200 / Math.max(160, stage.clientWidth);

  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    history = [{ x: event.clientX, y: event.clientY, t: event.timeStamp }];
    moved = false;
    // Caught mid-turn: it stops where it is, under the hand.
    if (mode !== 'still') {
      mode = 'still';
      yaw.velocity = pitch.velocity = 0;
    }
  };
  const move = (event: PointerEvent) => {
    if (start && event.pointerId === start.id) {
      const dx = event.clientX - history[history.length - 1].x;
      const dy = event.clientY - history[history.length - 1].y;
      if (!dragging) {
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < SLOP) return;
        dragging = moved = true;
        stage.setPointerCapture(event.pointerId);
        stage.dataset.dragging = '';
        showTip(null);
        tilt.yaw.target = tilt.pitch.target = 0;
        for (const button of buttons) button.setAttribute('aria-pressed', 'false');
        run();
      }
      const k = degrees();
      yaw.value += dx * k;
      // On a touch screen the cube turns about its vertical only: the page keeps its scroll.
      if (event.pointerType !== 'touch')
        pitch.value = Math.max(-PITCH, Math.min(PITCH, pitch.value + dy * k));
      history.push({ x: event.clientX, y: event.clientY, t: event.timeStamp });
      if (history.length > 6) history.shift();
      return;
    }
    if (!dragging && event.pointerType === 'mouse') {
      const target = (event.target as Element).closest('[data-name]');
      showTip(target ? (byElement.get(target) ?? null) : null);
    }
    if (lean && !dragging && event.pointerType === 'mouse') {
      const box = stage.getBoundingClientRect();
      tilt.yaw.target = ((event.clientX - box.left) / box.width - 0.5) * 18;
      tilt.pitch.target = ((event.clientY - box.top) / box.height - 0.5) * 12;
      if (!reduced()) run();
    }
  };
  const up = (event: PointerEvent) => {
    if (!start || event.pointerId !== start.id) return;
    start = null;
    if (!dragging) {
      // A tap names what it touched; a tap on nothing clears the name.
      if (event.pointerType !== 'mouse') {
        const target = (event.target as Element).closest('[data-name]');
        showTip(target ? (byElement.get(target) ?? null) : null);
      }
      return;
    }
    dragging = false;
    delete stage.dataset.dragging;
    // The hand's speed over its last few moves becomes the spin.
    const first = history[0];
    const final = history[history.length - 1];
    const span = Math.max(1, final.t - first.t);
    const recent = event.timeStamp - final.t < 80;
    const k = degrees();
    yaw.velocity = recent ? (((final.x - first.x) * k) / span) * 1000 : 0;
    pitch.velocity =
      recent && event.pointerType !== 'touch' ? (((final.y - first.y) * k) / span) * 1000 : 0;
    mode = reduced() || Math.hypot(yaw.velocity, pitch.velocity) < REST ? 'still' : 'coast';
    run();
  };
  // A drag that ends on a seal is not a press on it.
  const click = (event: MouseEvent) => {
    if (!moved) return;
    moved = false;
    event.stopPropagation();
    event.preventDefault();
  };
  const leave = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') showTip(null);
    tilt.yaw.target = tilt.pitch.target = 0;
    if (!reduced()) run();
    else {
      tilt.yaw.value = tilt.pitch.value = 0;
      paint();
    }
  };
  const key = (event: KeyboardEvent) => {
    const turn: Record<string, [number, number]> = {
      ArrowLeft: [-15, 0],
      ArrowRight: [15, 0],
      ArrowUp: [0, -15],
      ArrowDown: [0, 15],
    };
    const by = turn[event.key];
    if (!by) return;
    event.preventDefault();
    const base = mode === 'spring' ? { yaw: yaw.target, pitch: pitch.target } : view();
    turnTo({
      yaw: base.yaw + by[0],
      pitch: Math.max(-PITCH, Math.min(PITCH, base.pitch + by[1])),
    });
  };

  // Every mark's place, measured once from the cube as it was drawn.
  paint();
  stage.addEventListener('pointerdown', down);
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', leave);
  stage.addEventListener('click', click, true);
  stage.addEventListener('keydown', key);

  for (const button of buttons)
    button.addEventListener('click', () => {
      const target = VIEWS[button.dataset.view as keyof typeof VIEWS];
      if (!target) return;
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      turnTo(target);
    });

  return () => {
    cancelAnimationFrame(frameId);
    stage.removeEventListener('pointerdown', down);
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerup', up);
    stage.removeEventListener('pointercancel', up);
    stage.removeEventListener('pointerleave', leave);
    stage.removeEventListener('click', click, true);
    stage.removeEventListener('keydown', key);
  };
}
