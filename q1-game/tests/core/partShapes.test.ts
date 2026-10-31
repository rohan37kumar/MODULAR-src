import { expect, test } from 'vitest';
import { isNode, PARTS, PART_IDS } from '../../src/data/parts';
import {
  DIAMOND,
  diamondPoints,
  FAMILY_COLOUR, FRAME, PART_SHAPES, PORTED, REPAIR_CORE_SHAPE, WRENCH_SHAPE, octagonPoints, partColour, type ShapePath,
} from '../../src/data/partShapes';

const allSets: [string, ShapePath[]][] = [
  ...PART_IDS.map(id => [id, PART_SHAPES[id]] as [string, ShapePath[]]),
  ['wrench', WRENCH_SHAPE],
  ['repairCore', REPAIR_CORE_SHAPE],
];

const sideLengths = (pts: [number, number][]): number[] =>
  pts.map(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length];
    return Math.hypot(nx - x, ny - y);
  });

test('every PartId has between 1 and 4 paths', () => {
  expect(Object.keys(PART_SHAPES).sort()).toEqual([...PART_IDS].sort());
  for (const id of PART_IDS) {
    expect(PART_SHAPES[id].length, id).toBeGreaterThanOrEqual(1);
    expect(PART_SHAPES[id].length, id).toBeLessThanOrEqual(4);
  }
});

test('every point is finite and within ±0.44', () => {
  for (const [name, paths] of allSets) {
    for (const p of paths) {
      for (const [x, y] of p.pts) {
        expect(Number.isFinite(x) && Number.isFinite(y), name).toBe(true);
        expect(Math.abs(x), `${name} x=${x}`).toBeLessThanOrEqual(0.44);
        expect(Math.abs(y), `${name} y=${y}`).toBeLessThanOrEqual(0.44);
      }
    }
  }
});

test('every path has at least 2 points, and closed paths at least 3', () => {
  for (const [name, paths] of allSets) {
    expect(paths.length, name).toBeGreaterThan(0);
    for (const p of paths) {
      expect(p.pts.length, name).toBeGreaterThanOrEqual(p.closed ? 3 : 2);
    }
  }
});

test('partColour: orbit and echo are violet, the mimic pink, the rest use their family colour', () => {
  expect(partColour('orbit')).toBe(0xb388ff);
  expect(partColour('echo')).toBe(0xb388ff);
  expect(partColour('mimic')).toBe(0xf48fb1);
  expect(partColour('cockpit')).toBe(FAMILY_COLOUR.core);
  expect(partColour('beam')).toBe(0xffb000);
  expect(partColour('mirror')).toBe(0xffffff);
  expect(partColour('magnet')).toBe(0x39ff88);
});

test('FRAME is a regular octagon', () => {
  expect(FRAME.closed).toBe(true);
  expect(FRAME.pts).toHaveLength(8);
  const sides = sideLengths(FRAME.pts);
  for (const len of sides) expect(Math.abs(len - sides[0]), `side ${len}`).toBeLessThan(1e-3);
  const xs = FRAME.pts.map(p => p[0]);
  const ys = FRAME.pts.map(p => p[1]);
  expect(Math.max(...xs)).toBeCloseTo(0.42, 6);
  expect(Math.min(...xs)).toBeCloseTo(-0.42, 6);
  expect(Math.max(...ys)).toBeCloseTo(0.42, 6);
  expect(Math.min(...ys)).toBeCloseTo(-0.42, 6);
  // Flat top edge, so a muzzle port can sit in it.
  expect(FRAME.pts.filter(([, y]) => y === -0.42)).toHaveLength(2);
});

test('PORTED is FRAME with a top-edge gap of ±0.09', () => {
  expect(PORTED.closed).toBe(false);
  expect(PORTED.pts).toEqual([[0.09, -0.42], ...FRAME.pts.slice(1), FRAME.pts[0], [-0.09, -0.42]]);
});

test('path 0 is the module frame: PORTED for parts that route a shot, FRAME for the rest', () => {
  for (const id of PART_IDS) {
    expect(PART_SHAPES[id][0], id).toBe(isNode(id) ? DIAMOND : PARTS[id].routes ? PORTED : FRAME);
  }
});

test('every part draws an icon inside its frame', () => {
  for (const id of PART_IDS) expect(PART_SHAPES[id].length, id).toBeGreaterThanOrEqual(2);
});

test('icons keep clear of the octagon frame (only a muzzle may run out through the port)', () => {
  // Clear zone: 0.06 inside every frame edge. Frame edges: |x|=0.42, |y|=0.42, |x|+|y|=0.594.
  const clear = (x: number, y: number) => Math.abs(x) <= 0.36 && Math.abs(y) <= 0.36 && Math.abs(x) + Math.abs(y) <= 0.51;
  const inPort = (x: number, y: number) => Math.abs(x) <= 0.06 && y < 0 && y >= -0.42;
  for (const id of PART_IDS.filter(i => !isNode(i))) {
    for (const p of PART_SHAPES[id].slice(1)) {
      const pts = p.pts;
      const segs = p.closed ? pts.length : pts.length - 1;
      for (let i = 0; i < segs; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        for (let k = 0; k <= 10; k++) {
          const x = ax + ((bx - ax) * k) / 10;
          const y = ay + ((by - ay) * k) / 10;
          const ok = clear(x, y) || (PARTS[id].routes && inPort(x, y));
          expect(ok, `${id} (${x.toFixed(3)}, ${y.toFixed(3)})`).toBe(true);
        }
      }
    }
  }
});

test('octagonPoints matches FRAME scaled to a cell of width s', () => {
  const unit = octagonPoints(0, 0, 0.84);
  expect(unit).toHaveLength(8);
  unit.forEach((q, i) => {
    expect(q.x).toBeCloseTo(FRAME.pts[i][0], 2);
    expect(q.y).toBeCloseTo(FRAME.pts[i][1], 2);
  });
  const big = octagonPoints(10, 20, 100);
  const xs = big.map(q => q.x);
  const ys = big.map(q => q.y);
  expect(Math.min(...xs)).toBeCloseTo(-40, 6);
  expect(Math.max(...xs)).toBeCloseTo(60, 6);
  expect(Math.min(...ys)).toBeCloseTo(-30, 6);
  expect(Math.max(...ys)).toBeCloseTo(70, 6);
  const sides = sideLengths(big.map(q => [q.x, q.y] as [number, number]));
  for (const len of sides) expect(len).toBeCloseTo(sides[0], 6);
});

test('node icons sit inside the diamond with a margin (|x| + |y| ≤ 0.30, the diamond edge is 0.36)', () => {
  for (const id of PART_IDS.filter(isNode)) {
    for (const p of PART_SHAPES[id].slice(1)) for (const [x, y] of p.pts) expect(Math.abs(x) + Math.abs(y), id).toBeLessThanOrEqual(0.3);
  }
});
test('diamondPoints matches DIAMOND scaled to a cell of width s', () => {
  const pts = diamondPoints(10, 20, 100);
  DIAMOND.pts.forEach(([x, y], i) => { expect(pts[i].x).toBeCloseTo(10 + x * 100); expect(pts[i].y).toBeCloseTo(20 + y * 100); });
});
