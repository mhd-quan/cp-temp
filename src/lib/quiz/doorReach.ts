// The door's drawing and the canvas that moves it (drift.ts, doorScene.ts) share these, in
// the sketch's units (compass.ts, SKETCH; door.css lays both out from the same numbers).

/** The drawing's width: its box is 280 units wide and 290 tall. */
export const SKETCH_WIDTH = 280;
/**
 * The cube's centre in the drawing's box: 134 units down, and 145.35 in, the drawing being
 * moved right by 5.35 so its outline at rest stands centred (door.css).
 */
export const CENTRE = { x: 145.35, y: 134 } as const;
/**
 * The canvas about that centre: as far as the cube reaches on its path, leaned toward a hand
 * and rolled, with room for a dot and the drift.
 */
export const REACH = { left: 148, top: 150, width: 296, height: 310 } as const;
