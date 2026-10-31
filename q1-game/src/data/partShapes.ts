import type { Family, PartId } from '../core/types';
import { NODE_IDS, PARTS } from './parts';

/**
 * Vector icons for every part, drawn as stroked polylines (closed paths also get a faint fill).
 *
 * Conventions:
 * - Unit cell from -0.5 to 0.5, centred on 0,0, y down. Every point stays within ±0.44.
 * - Every icon faces UP: the muzzle / emitter / exhaust points to -y. The renderer rotates by facing.
 * - Mirror is drawn as '/' (bottom-left to top-right); the renderer flips it horizontally for '\'.
 * - Every part sits in the same regular-octagon module frame (path 0). Parts that route a shot along a
 *   line (PARTS[id].routes: cockpit, pulse, beam, needle, cryo, thruster, saw) get a frame with a gap
 *   in the top edge: the "muzzle port", so facing reads at a glance even at 26 px.
 * - Icons are one bold symbol each and keep 0.06 clear of every frame edge (|x|, |y| ≤ 0.36 and
 *   |x| + |y| ≤ 0.51). Only a muzzle may run out through the port (|x| ≤ 0.06).
 * - No weld nodes: the diamond gaps where four octagons meet stay dark (user decision).
 */
export interface ShapePath { pts: [number, number][]; closed: boolean }

type Pt = [number, number];

const r3 = (n: number): number => {
  const v = Math.round(n * 1000) / 1000;
  return v === 0 ? 0 : v; // no -0
};
const closed = (pts: Pt[]): ShapePath => ({ pts: pts.map(([x, y]) => [r3(x), r3(y)] as Pt), closed: true });
const open = (pts: Pt[]): ShapePath => ({ pts: pts.map(([x, y]) => [r3(x), r3(y)] as Pt), closed: false });

const rad = (deg: number): number => (deg * Math.PI) / 180;
/** The point at radius r and angle deg (0 = +x, 90 = +y i.e. down) around cx,cy. */
const polar = (cx: number, cy: number, r: number, deg: number): Pt => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];

/** Arc points from a0 to a1 (degrees; 0 = +x, 90 = +y i.e. down), both ends included. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, segs: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= segs; i++) out.push(polar(cx, cy, r, a0 + ((a1 - a0) * i) / segs));
  return out;
}
/** A closed circle as `segs` points (no duplicate end point). */
const circle = (cx: number, cy: number, r: number, segs: number): Pt[] => arc(cx, cy, r, 0, 360, segs).slice(0, segs);

/** A circular bulge from (x0,y) to (x1,y) with sagitta `s` (negative bulges up). */
function bulge(x0: number, x1: number, y: number, s: number, segs: number): Pt[] {
  const c = Math.abs(x1 - x0) / 2;
  const mid = (x0 + x1) / 2;
  const R = (c * c + s * s) / (2 * Math.abs(s));
  const out: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const x = x0 + ((x1 - x0) * i) / segs;
    const dx = x - mid;
    out.push([x, y + Math.sign(s) * (Math.sqrt(R * R - dx * dx) - (R - Math.abs(s)))]);
  }
  return out;
}

const rotate = (pts: Pt[], deg: number, scale = 1): Pt[] => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return pts.map(([x, y]) => [(x * c - y * s) * scale, (x * s + y * c) * scale] as Pt);
};

// ---- Module frames -------------------------------------------------------------------------

/** Regular octagon, flat sides at ±0.42 (corner cut at 0.42 · tan 22.5° ≈ 0.174). Clockwise from top-left. */
export const FRAME = closed([
  [-0.174, -0.42], [0.174, -0.42], [0.42, -0.174], [0.42, 0.174],
  [0.174, 0.42], [-0.174, 0.42], [-0.42, 0.174], [-0.42, -0.174],
]);

/** The same octagon as an open path with a muzzle port (gap of ±0.09) in the top edge. */
export const PORTED = open([[0.09, -0.42], ...FRAME.pts.slice(1), FRAME.pts[0], [-0.09, -0.42]]);

/**
 * A regular octagon (same orientation as FRAME: flat top) centred on cx,cy, `s` wide flat to flat.
 * Screen-space points for Phaser's fillPoints / strokePoints (Forge selection and highlight outlines).
 */
export function octagonPoints(cx: number, cy: number, s: number): { x: number; y: number }[] {
  const h = s / 2;
  const c = h * Math.tan(Math.PI / 8);
  return ([[-c, -h], [c, -h], [h, -c], [h, c], [c, h], [-c, h], [-h, c], [-h, -c]] as Pt[])
    .map(([x, y]) => ({ x: cx + x, y: cy + y }));
}

// ---- Shared pieces -------------------------------------------------------------------------

/** Pointy-top hexagon vertices, starting at the top and going clockwise. */
const hex = (cx: number, cy: number, r: number): Pt[] => [-90, -30, 30, 90, 150, 210].map(a => polar(cx, cy, r, a));

const CRYO_HEX = hex(0, 0.08, 0.2);

// Wrench pickup (built along a vertical axis, head up, then turned 45° so the head is top-right).
const WRENCH_LOCAL: Pt[] = (() => {
  const hc = -0.24; // head centre (local y)
  const hr = 0.16; // head radius
  const hw = 0.05; // handle half-width
  const jw = 0.06; // jaw half-width
  const jaw = -0.22; // jaw floor (local y)
  const aHandle = (Math.atan2(Math.sqrt(hr * hr - hw * hw), hw) * 180) / Math.PI; // ~71.8°
  const aJaw = (Math.atan2(-Math.sqrt(hr * hr - jw * jw), jw) * 180) / Math.PI; // ~-68°
  return [
    [-hw, 0.34], [hw, 0.34],
    ...arc(0, hc, hr, aHandle, aJaw, 8),
    [jw, jaw], [-jw, jaw],
    // Left half mirrors the right: from the jaw (~248°) back round through 180° to the handle (~108°).
    ...arc(0, hc, hr, 180 - aJaw, 180 - aHandle, 8),
  ];
})();

// Orbit Ring: a 0.32 × 0.12 ellipse tilted -25°, with the satellite riding it at parameter -0.6 rad.
const ORBIT_TILT = -25;
const ORBIT_ELLIPSE = rotate(circle(0, 0, 1, 14).map(([x, y]) => [x * 0.32, y * 0.12] as Pt), ORBIT_TILT);
const [satX, satY] = rotate([[0.32 * Math.cos(-0.6), 0.12 * Math.sin(-0.6)]], ORBIT_TILT)[0];

/** Saw: a ring blade with 6 hooked teeth, one tip pointing up at the muzzle port. */
const SAW_BLADE: Pt[] = [0, 1, 2, 3, 4, 5].flatMap(k => {
  const a = -90 + 60 * k;
  return [polar(0, 0, 0.31, a), polar(0, 0, 0.21, a)]; // tip, then a radial drop to the root
});

/**
 * Overclock: a gear (5 teeth on its leading side) whose trailing side smears into 3 speed ticks.
 * The ticks are zero-width spikes in the gear outline, so the whole gear is one bold path.
 */
const OVERCLOCK_GEAR: Pt[] = (() => {
  const cx = 0.06;
  const root = 0.17;
  const tip = 0.25;
  const out: Pt[] = [];
  for (const a of [-90, -45, 0, 45, 90]) {
    out.push(polar(cx, 0, root, a - 13), polar(cx, 0, tip, a - 9), polar(cx, 0, tip, a + 9), polar(cx, 0, root, a + 13));
  }
  for (const [a, endX] of [[135, -0.3], [180, -0.35], [225, -0.3]] as const) {
    const r = polar(cx, 0, root, a);
    out.push(r, [endX, r[1]], r);
  }
  return out;
})();

/** Relay: a zig-zag hop arrow from the bottom-left node to the top-right node. */
const RELAY_A: Pt = [-0.2, 0.2];
const RELAY_B: Pt = [0.2, -0.2];
const RELAY_ARROW: Pt[] = (() => {
  const k = Math.SQRT1_2;
  // s runs along the diagonal from node A (d = up-right), o across it (p = down-right).
  const at = (s: number, o: number): Pt => [RELAY_A[0] + (s + o) * k, RELAY_A[1] + (o - s) * k];
  const tipPt = at(0.44, 0);
  return [at(0.11, 0), at(0.18, 0.07), at(0.26, -0.07), at(0.32, 0), tipPt, at(0.35, 0.065), tipPt, at(0.35, -0.065)];
})();

/** Mimic's Ξ: one horizontal bar as a thin closed slab. */
const bar = (hw: number, y: number): Pt[] => [[-hw, y - 0.035], [hw, y - 0.035], [hw, y + 0.035], [-hw, y + 0.035]];

// ---- The parts -----------------------------------------------------------------------------

export const PART_SHAPES: Record<PartId, ShapePath[]> = {
  // Cyan arrow ship with a small canopy; the nose sits in the muzzle port (it carries the pea-shooter).
  cockpit: [
    PORTED,
    closed([[0, -0.4], [0.24, 0.26], [0, 0.12], [-0.24, 0.26]]),
    closed([[0, -0.06], [0.07, 0.08], [-0.07, 0.08]]),
  ],

  // Boxy breech under a fat barrel that necks down into the port: fast bolts.
  pulse: [
    PORTED,
    closed([[-0.22, 0], [0.22, 0], [0.22, 0.22], [0.16, 0.28], [-0.16, 0.28], [-0.22, 0.22]]),
    closed([[-0.1, 0], [-0.1, -0.26], [-0.05, -0.32], [-0.05, -0.4], [0.05, -0.4], [0.05, -0.32], [0.1, -0.26], [0.1, 0]]),
  ],

  // Low emitter base under one long crystal lance.
  beam: [
    PORTED,
    closed([[-0.22, 0.28], [0.22, 0.28], [0.1, 0.1], [-0.1, 0.1]]),
    closed([[0, -0.4], [0.06, -0.28], [0, 0.1], [-0.06, -0.28]]),
  ],

  // Round turret base with a tapering needle.
  needle: [
    PORTED,
    closed(circle(0, 0.12, 0.2, 12)),
    closed([[-0.04, 0.12], [0, -0.4], [0.04, 0.12]]),
  ],

  // Cartoon bomb: round pod, cap, lit fuse curling up.
  bomb: [
    FRAME,
    closed(circle(0, 0.1, 0.23, 14)),
    closed([[-0.07, -0.2], [0.07, -0.2], [0.07, -0.12], [-0.07, -0.12]]),
    open([[0, -0.2], [0.04, -0.28], [0.1, -0.31], [0.16, -0.33]]),
  ],

  // One bold lightning bolt: chains in every direction.
  arc: [
    FRAME,
    closed([[-0.02, -0.34], [0.16, -0.34], [0.05, -0.06], [0.19, -0.06], [-0.1, 0.34], [-0.03, 0.04], [-0.17, 0.04]]),
  ],

  // Ice hex with a snowflake inside; the vertical spoke runs out as a barrel with a frost tip.
  cryo: [
    PORTED,
    closed(CRYO_HEX),
    open([
      CRYO_HEX[1], CRYO_HEX[4], [0, 0.08], CRYO_HEX[5], CRYO_HEX[2], [0, 0.08], CRYO_HEX[3],
      [0, -0.28], [-0.06, -0.34], [0, -0.28], [0.06, -0.34], [0, -0.28], [0, -0.4],
    ]),
  ],

  // '/' slab (bottom-left to top-right) with a glint line on its reflective face.
  mirror: [
    FRAME,
    closed([[-0.285, 0.215], [0.215, -0.285], [0.285, -0.215], [-0.215, 0.285]]),
    open([[-0.17, -0.03], [-0.03, -0.17]]),
  ],

  // Converging lens: parallel rays enter from below, bend at the lens, meet at a focus above.
  lens: [
    FRAME,
    closed([...bulge(-0.3, 0.3, 0.1, -0.11, 8), ...bulge(0.3, -0.3, 0.1, 0.11, 8).slice(1, -1)]),
    open([[-0.17, 0.32], [-0.17, 0.1], [0, -0.34], [0.17, 0.1], [0.17, 0.32]]),
  ],

  // A small world, a tilted orbit and a satellite riding it.
  orbit: [
    FRAME,
    closed(circle(0, 0, 0.09, 8)),
    closed(ORBIT_ELLIPSE),
    closed(circle(satX, satY, 0.05, 8)),
  ],

  // A source dot and two expanding wavefronts: the shot, repeated.
  echo: [
    FRAME,
    closed(circle(0, 0.24, 0.06, 8)),
    open(arc(0, 0.24, 0.2, -90 - 50, -90 + 50, 8)),
    open(arc(0, 0.24, 0.4, -90 - 42, -90 + 42, 12)),
  ],

  // Triangle prism; the ray leaves its apex as a three-way trident.
  prism: [
    FRAME,
    closed([[0, -0.08], [0.24, 0.27], [-0.24, 0.27]]),
    open([[-0.25, -0.25], [0, -0.08], [0, -0.36], [0, -0.08], [0.25, -0.25]]),
  ],

  // Combustion chamber and a bell flaring upward as one outline; flame tongues leave through the port.
  thruster: [
    PORTED,
    closed([
      [-0.12, 0.32], [0.12, 0.32], [0.12, 0.16], [0.06, 0.16],
      [0.24, -0.12], [-0.24, -0.12], [-0.06, 0.16], [-0.12, 0.16],
    ]),
    open([[-0.16, -0.2], [-0.08, -0.3], [-0.04, -0.24], [0, -0.4], [0.04, -0.24], [0.08, -0.3], [0.16, -0.2]]),
  ],

  // Horseshoe magnet opening up, with pole caps.
  magnet: [
    FRAME,
    closed([[-0.26, -0.24], ...arc(0, 0.06, 0.26, 180, 0, 10), [0.26, -0.24], [0.12, -0.24], ...arc(0, 0.06, 0.12, 0, 180, 6), [-0.12, -0.24]]),
    open([[-0.26, -0.12], [-0.12, -0.12]]),
    open([[0.12, -0.12], [0.26, -0.12]]),
  ],

  // Double-walled shield plate: thick armour.
  bulwark: [
    FRAME,
    closed([[-0.24, -0.26], [0.24, -0.26], [0.24, 0.06], [0, 0.32], [-0.24, 0.06]]),
    closed([[-0.13, -0.15], [0.13, -0.15], [0.13, 0.03], [0, 0.17], [-0.13, 0.03]]),
  ],

  // Medical cross.
  repair: [
    FRAME,
    closed([
      [-0.09, -0.28], [0.09, -0.28], [0.09, -0.09], [0.28, -0.09], [0.28, 0.09], [0.09, 0.09],
      [0.09, 0.28], [-0.09, 0.28], [-0.09, 0.09], [-0.28, 0.09], [-0.28, -0.09], [-0.09, -0.09],
    ]),
  ],

  // 6-tooth ring blade with a hub; a tooth points at the muzzle port.
  saw: [
    PORTED,
    closed(SAW_BLADE),
    closed(circle(0, 0, 0.08, 8)),
  ],

  // J-hook hanging from an eye, with a barbed point.
  hook: [
    FRAME,
    closed(circle(0.15, -0.26, 0.055, 8)),
    open([[0.15, -0.205], [0.15, 0.12], ...arc(0, 0.12, 0.15, 0, 180, 8).slice(1), [-0.15, -0.02], [-0.07, 0.06]]),
  ],

  // Gear with speed ticks streaming off its trailing side, and a hub.
  overclock: [
    FRAME,
    closed(OVERCLOCK_GEAR),
    closed(circle(0.06, 0, 0.07, 8)),
  ],

  // Two nodes joined by a zig-zag hop arrow.
  relay: [
    FRAME,
    closed(circle(RELAY_A[0], RELAY_A[1], 0.06, 8)),
    closed(circle(RELAY_B[0], RELAY_B[1], 0.06, 8)),
    open(RELAY_ARROW),
  ],

  // Ξ: three bars, the middle one short.
  mimic: [
    FRAME,
    closed(bar(0.24, -0.235)),
    closed(bar(0.14, 0)),
    closed(bar(0.24, 0.235)),
  ],
};

// ---- Nodes -----------------------------------------------------------------------------------

/** A node's half-diagonal: the diamond fills the gap where four octagons meet (gap edge at 0.287 from the corner). */
export const NODE_HALF = 0.36;
/** Node frame: a square turned 45° (a diamond), centred on its cell corner. */
export const DIAMOND = closed([[0, -NODE_HALF], [NODE_HALF, 0], [0, NODE_HALF], [-NODE_HALF, 0]]);
/** A node keeps its part's icon, shrunk to fit inside the diamond. */
const NODE_ICON_SCALE = 0.5;
for (const id of NODE_IDS) {
  PART_SHAPES[id] = [DIAMOND, ...PART_SHAPES[id].slice(1).map(p => ({ ...p, pts: p.pts.map(([x, y]) => [x * NODE_ICON_SCALE, y * NODE_ICON_SCALE] as Pt) }))];
}

/** Screen-space diamond for a node at cx,cy in a cell `s` wide (Forge highlights). */
export function diamondPoints(cx: number, cy: number, s: number): { x: number; y: number }[] {
  const h = s * NODE_HALF;
  return [{ x: cx, y: cy - h }, { x: cx + h, y: cy }, { x: cx, y: cy + h }, { x: cx - h, y: cy }];
}

/** Forge Uplink pickup: an open-ended wrench lying diagonally, head top-right, with a hang hole. */
export const WRENCH_SHAPE: ShapePath[] = [
  closed(rotate(WRENCH_LOCAL, 45, 1.2)),
  closed(rotate(circle(0, 0.26, 0.035, 8), 45, 1.2)),
];

/** Hull repair core pickup: a hex cell with a cross. No module frame: it is loot, not a module. */
export const REPAIR_CORE_SHAPE: ShapePath[] = [
  closed(hex(0, 0, 0.4)),
  closed([
    [-0.07, -0.22], [0.07, -0.22], [0.07, -0.07], [0.22, -0.07], [0.22, 0.07], [0.07, 0.07],
    [0.07, 0.22], [-0.07, 0.22], [-0.07, 0.07], [-0.22, 0.07], [-0.22, -0.07], [-0.07, -0.07],
  ]),
];

export const FAMILY_COLOUR: Record<Family, number> = {
  core: 0x00e5ff,
  weapon: 0xffb000,
  modifier: 0xffffff,
  utility: 0x39ff88,
};

const VIOLET = 0xb388ff;
const MIMIC_PINK = 0xf48fb1;

/** Family colour, except Orbit Ring and Echo Coil (violet) and the Mimic (pink). */
export function partColour(id: PartId): number {
  if (id === 'orbit' || id === 'echo') return VIOLET;
  if (id === 'mimic') return MIMIC_PINK;
  return FAMILY_COLOUR[PARTS[id].family];
}
