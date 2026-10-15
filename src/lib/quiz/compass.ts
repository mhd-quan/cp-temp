import { AXES, type AxisId } from './types.ts';

// La bàn Tư tưởng in three dimensions. Twelve axes cannot be drawn at once; three can, and
// these three are the ones a reader already carries: how the economy is run (left and right),
// how hard a state governs (the political compass's vertical), and how one meets change.
// The front face of the cube is the familiar two-dimensional compass; the depth is the third.
// Kept free of the DOM: the page draws the cube once from these strings, and orbit.ts turns it.

export interface Dimension {
  id: 'economy' | 'rule' | 'change';
  name: string;
  /** The ends at 0 and at 100. */
  poles: [string, string];
  /** The axes it is the mean of; −1 reads an axis from its other end. */
  axes: [AxisId, 1 | -1][];
}

export const DIMENSIONS: readonly Dimension[] = [
  {
    id: 'economy',
    name: 'Kinh tế',
    poles: ['Định hướng', 'Tự do kinh tế'],
    axes: [
      ['economy', 1],
      ['distribution', 1],
    ],
  },
  {
    id: 'rule',
    name: 'Cai trị',
    poles: ['Mềm mỏng', 'Cứng rắn'],
    axes: [
      ['power', -1],
      ['liberty', -1],
    ],
  },
  {
    id: 'change',
    name: 'Thay đổi',
    poles: ['Bảo thủ', 'Cách mạng'],
    axes: [['change', 1]],
  },
];

export type Point3 = [number, number, number];

/** A place in the cube, 0–100 on each dimension, from positions on the twelve axes (AXES order). */
export function compass(scores: readonly number[]): Point3 {
  return DIMENSIONS.map(
    (dimension) =>
      dimension.axes.reduce(
        (sum, [id, sign]) =>
          sum + (sign === 1 ? scores[AXES.indexOf(id)] : 100 - scores[AXES.indexOf(id)]),
        0,
      ) / dimension.axes.length,
  ) as Point3;
}

/** How the cube is turned, in degrees: about the vertical, then toward the reader. */
export interface View {
  yaw: number;
  pitch: number;
}

/** The turned cube, and each face looked at straight on, as its two dimensions name it. */
export const VIEWS: Record<'free' | 'front' | 'top' | 'side', View & { name: string }> = {
  free: { yaw: -32, pitch: 28, name: 'Ba chiều' },
  front: { yaw: 0, pitch: 0, name: 'Kinh tế × Cai trị' },
  top: { yaw: 0, pitch: 90, name: 'Kinh tế × Thay đổi' },
  side: { yaw: 90, pitch: 0, name: 'Thay đổi × Cai trị' },
};

/** Drawing units: the view box runs ±BOX, the cube's half side is HALF. */
export const BOX = 170;
export const HALF = 84;
/** Distance of the eye, in half sides: far enough that the cube keeps its shape. */
const EYE = 7;

export interface Projected {
  x: number;
  y: number;
  /** Toward the reader, −√3 … √3 half sides. */
  depth: number;
  /** How much nearer things are drawn larger. */
  scale: number;
}

/** A point of the cube, −1 … 1 on each dimension, on the page. */
export function project([x, y, z]: Point3, view: View): Projected {
  const yaw = (view.yaw * Math.PI) / 180;
  const pitch = (view.pitch * Math.PI) / 180;
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
  const depth = y * Math.sin(pitch) + z1 * Math.cos(pitch);
  const scale = EYE / (EYE - depth);
  return { x: x1 * HALF * scale, y: -y2 * HALF * scale, depth, scale };
}

/** 0–100 on each dimension to the cube's −1 … 1. */
export const unit = (point: Point3): Point3 => point.map((value) => value / 50 - 1) as Point3;

const r = (value: number) => (Math.round(value * 10) / 10).toString();

/** The twelve edges, each as its two corners, and the two faces it joins. */
const EDGES: { from: Point3; to: Point3; faces: [number, number][] }[] = [];
for (let axis = 0; axis < 3; axis++)
  for (const a of [-1, 1])
    for (const b of [-1, 1]) {
      const [p, q] = [0, 1, 2].filter((i) => i !== axis);
      const from = [0, 0, 0] as Point3;
      const to = [0, 0, 0] as Point3;
      from[axis] = -1;
      to[axis] = 1;
      from[p] = to[p] = a;
      from[q] = to[q] = b;
      EDGES.push({
        from,
        to,
        faces: [
          [p, a],
          [q, b],
        ],
      });
    }

/** Whether the face on dimension `axis` at `side` (±1) turns toward the reader. */
function facing(axis: number, side: number, view: View): boolean {
  const normal = [0, 0, 0] as Point3;
  normal[axis] = side;
  const yaw = (view.yaw * Math.PI) / 180;
  const pitch = (view.pitch * Math.PI) / 180;
  const z1 = -normal[0] * Math.sin(yaw) + normal[2] * Math.cos(yaw);
  return normal[1] * Math.sin(pitch) + z1 * Math.cos(pitch) > 1e-6;
}

const segment = (from: Point3, to: Point3, view: View) => {
  const a = project(from, view);
  const b = project(to, view);
  return `M${r(a.x)} ${r(a.y)}L${r(b.x)} ${r(b.y)}`;
};

/** The frame of the cube at a view: the edges in front, those behind, the floor and the axes. */
export function frame(view: View) {
  let front = '';
  let back = '';
  for (const edge of EDGES) {
    const seen = edge.faces.some(([axis, side]) => facing(axis, side, view));
    if (seen) front += segment(edge.from, edge.to, view);
    else back += segment(edge.from, edge.to, view);
  }
  const floor = (
    [
      [-1, -1, -1],
      [1, -1, -1],
      [1, -1, 1],
      [-1, -1, 1],
    ] as Point3[]
  )
    .map((corner, i) => {
      const p = project(corner, view);
      return `${i ? 'L' : 'M'}${r(p.x)} ${r(p.y)}`;
    })
    .join('');
  const axes = [0, 1, 2]
    .map((axis) => {
      const from = [0, 0, 0] as Point3;
      const to = [0, 0, 0] as Point3;
      from[axis] = -1;
      to[axis] = 1;
      return segment(from, to, view);
    })
    .join('');
  return { front, back, floor: `${floor}Z`, axes };
}

/** Where a pole's name stands, just outside the cube, and how clearly it reads at this view. */
export function poleAt(axis: number, side: 0 | 1, view: View) {
  const end = [0, 0, 0] as Point3;
  end[axis] = side ? 1.3 : -1.3;
  const p = project(end, view);
  const centre = project([0, 0, 0], view);
  // An axis seen end on draws its two names over each other at the centre: they fade.
  const length = Math.hypot(p.x - centre.x, p.y - centre.y) / (1.3 * HALF);
  const clear = Math.min(1, Math.max(0, (length - 0.3) / 0.35));
  return {
    left: ((p.x + BOX) / (2 * BOX)) * 100,
    top: ((p.y + BOX) / (2 * BOX)) * 100,
    opacity: clear * (p.depth < -0.2 ? 0.6 : 1),
  };
}

export interface CubeDot {
  at: Point3;
  family: string;
  name: string;
  /** 0–1: how near the dot stands to the reader's answers, for its ink. */
  near?: number;
}

export interface CubeSeal extends CubeDot {
  id: string;
  rank: number;
}

const esc = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );

const at = (point: Point3) => point.map((value) => Math.round(value)).join(' ');

/**
 * The cube's stage, drawn at a view, ready for orbit.ts to turn: every dot, seal and the
 * reader carry their place (0–100 on each dimension) in data-p, and the page script
 * redraws from those alone. The pole names are page text over the drawing, so they keep
 * the house's type at any size, and so is the name a dot shows under the pointer (orbit.ts):
 * the drawing carries no title elements of its own.
 */
export function cubeStage(
  options: {
    dots: CubeDot[];
    seals?: CubeSeal[];
    you?: Point3;
    label: string;
    labelledBy?: string;
  },
  view: View = VIEWS.free,
): string {
  const { dots, seals = [], you } = options;
  const lines = frame(view);
  const place = (point: Point3) => project(unit(point), view);
  const dotMarks = dots
    .map((dot) => {
      const p = place(dot.at);
      const near = dot.near === undefined ? '' : ` style="--near:${dot.near.toFixed(2)}"`;
      return `<circle class="cube__dot" data-family="${dot.family}" data-p="${at(dot.at)}" cx="${r(p.x)}" cy="${r(p.y)}" r="${r(2.6 * p.scale)}" data-name="${esc(dot.name)}"${near}/>`;
    })
    .join('');
  const sealMarks = seals
    .map((seal) => ({ seal, p: place(seal.at) }))
    .sort((a, b) => a.p.depth - b.p.depth)
    .map(
      ({ seal, p }) =>
        `<g class="cube__seal" data-family="${seal.family}" data-p="${at(seal.at)}" data-profile="${seal.id}" data-name="${seal.rank}. ${esc(seal.name)}" transform="translate(${r(p.x)} ${r(p.y)})"><circle class="cube__seal-field" r="9.5"/><text class="cube__seal-rank" text-anchor="middle" dy=".36em">${seal.rank}</text></g>`,
    )
    .join('');
  let reader = '';
  if (you) {
    const p = place(you);
    const u = unit(you);
    const ground = project([u[0], -1, u[2]], view);
    const centre = project([0, 0, 0], view);
    reader = `<path class="cube__drop" d="M${r(p.x)} ${r(p.y)}L${r(ground.x)} ${r(ground.y)}"/><ellipse class="cube__shadow" cx="${r(ground.x)}" cy="${r(ground.y)}" rx="5" ry="2.4"/><path class="cube__needle" d="M${r(centre.x)} ${r(centre.y)}L${r(p.x)} ${r(p.y)}"/>`;
  }
  const youMark = you
    ? (() => {
        const p = place(you);
        return `<g class="cube__you" data-p="${at(you)}" transform="translate(${r(p.x)} ${r(p.y)})"><circle class="cube__you-ring" r="9"/><circle class="cube__you-dot" r="5"/></g>`;
      })()
    : '';
  const labels = DIMENSIONS.flatMap((dimension, axis) =>
    ([0, 1] as const).map((side) => {
      const pole = poleAt(axis, side, view);
      return `<span class="cube__pole caps" data-dim="${axis}" data-side="${side}" style="left:${r(pole.left)}%;top:${r(pole.top)}%;opacity:${pole.opacity.toFixed(2)}">${esc(dimension.poles[side])}</span>`;
    }),
  ).join('');
  const name = options.labelledBy
    ? `aria-labelledby="${options.labelledBy}"`
    : `aria-label="${esc(options.label)}"`;
  return `<div class="cube__stage" data-cube data-yaw="${view.yaw}" data-pitch="${view.pitch}" tabindex="0" role="img" ${name}>
  <svg class="cube__plot" viewBox="${-BOX} ${-BOX} ${2 * BOX} ${2 * BOX}" aria-hidden="true" focusable="false">
    <path class="cube__floor" d="${lines.floor}"/>
    <path class="cube__edge cube__edge--back" d="${lines.back}"/>
    <path class="cube__axis" d="${lines.axes}"/>
    <g class="cube__dots">${dotMarks}</g>
    ${reader}
    <g class="cube__seals">${sealMarks}</g>
    ${youMark}
    <path class="cube__edge cube__edge--front" d="${lines.front}"/>
  </svg>
  ${labels}
  <span class="cube__tip" aria-hidden="true" hidden></span>
</div>`;
}

/** The sketch's view box: the free view's cube leaned ±11° and ±7°, with room for a dot. */
export const SKETCH = [-140, -134, 280, 290] as const;

/**
 * The cube as a picture and nothing else: the door to the compass on the first page and on
 * Thể nghiệm (components/edition/CompassDoor.astro). Every variant is a dot in its family's
 * colour, and nothing is written on it: no names, no poles, no reader. A family's dots are
 * one path of zero-length strokes with round caps, so the first page carries a few bytes a
 * dot; each path keeps its dots' places in data-p, so drift.ts can lean the cube toward a
 * hand that comes near. `colours` gives a family's pigment by day and by night.
 */
export function cubeSketch(
  dots: { at: Point3; family: string }[],
  colours: (family: string) => { day: string; night: string },
  view: View = VIEWS.free,
): string {
  const lines = frame(view);
  const families = new Map<string, Point3[]>();
  for (const dot of dots) families.set(dot.family, [...(families.get(dot.family) ?? []), dot.at]);
  const marks = [...families]
    .map(([family, points]) => {
      const d = points
        .map((point) => {
          const p = project(unit(point), view);
          return `M${Math.round(p.x)} ${Math.round(p.y)}h0`;
        })
        .join('');
      const { day, night } = colours(family);
      return `<path style="--day:${day};--night:${night}" data-p="${points.map(at).join(',')}" d="${d}"/>`;
    })
    .join('');
  // Framed close: the cube at rest, and as far as drift.ts leans it, fills the drawing.
  return `<svg class="cube__plot" viewBox="${SKETCH.join(' ')}" aria-hidden="true" focusable="false"><path class="cube__floor" d="${lines.floor}"/><path class="cube__edge cube__edge--back" d="${lines.back}"/><path class="cube__axis" d="${lines.axes}"/><g class="cube__dots">${marks}</g><path class="cube__edge cube__edge--front" d="${lines.front}"/></svg>`;
}
