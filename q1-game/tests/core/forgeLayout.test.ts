import { test, expect } from 'vitest';
import {
  cellCenter, computeForgeLayout, diamondPoints, hitRect, MIN_TOUCH, nearestSlot, NODE_FRAME, pointToCell, pointToGrid, type Rect,
} from '../../src/game/forgeLayout';

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const onScreen = (r: Rect, w: number, h: number): boolean =>
  r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h;

const SCREENS: [number, number][] = [
  [1280, 720], // desktop landscape
  [390, 844], // phone portrait
  [1920, 1080],
  [1024, 768],
  [800, 600],
  [768, 1024],
  [360, 640],
];

for (const [w, h] of SCREENS) {
  test(`${w}×${h}: buttons and grid fit on screen without overlapping`, () => {
    const L = computeForgeLayout(w, h);
    expect(L.portrait).toBe(h > w);
    const btns = [L.buttons.rotate, L.buttons.jettison, L.buttons.accept];
    const size = L.cell * 7;
    const grid: Rect = { x: L.gridX, y: L.gridY, w: size, h: size };

    expect(onScreen(grid, w, h)).toBe(true);
    for (const b of btns) {
      expect(b.w).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(b.h).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(onScreen(b, w, h)).toBe(true);
      expect(overlaps(b, grid)).toBe(false);
    }
    for (let i = 0; i < btns.length; i++)
      for (let j = i + 1; j < btns.length; j++) expect(overlaps(btns[i], btns[j])).toBe(false);

    // The info card fits on screen, clear of the grid and the buttons, with room for a name and a few lines.
    expect(onScreen(L.info, w, h)).toBe(true);
    expect(overlaps(L.info, grid)).toBe(false);
    for (const b of btns) expect(overlaps(L.info, b)).toBe(false);
    expect(L.info.h).toBeGreaterThanOrEqual(64);
    expect(L.infoY).toBe(L.info.y);
    expect(L.tutorialY).toBeLessThan(L.gridY);
  });
}

test('landscape puts buttons right of the grid; portrait puts them below', () => {
  const land = computeForgeLayout(1280, 720);
  expect(land.buttons.rotate.x).toBeGreaterThanOrEqual(land.gridX + land.cell * 7);
  const port = computeForgeLayout(390, 844);
  expect(port.buttons.rotate.y).toBeGreaterThanOrEqual(port.gridY + port.cell * 7);
  expect(port.gridY + port.cell * 7).toBeLessThanOrEqual(844 * 0.7 + 1e-6);
});

test('cell size follows min(w, h) × 0.8 / 7 on roomy screens', () => {
  expect(computeForgeLayout(1280, 720).cell).toBeCloseTo((720 * 0.8) / 7);
  expect(computeForgeLayout(390, 844).cell).toBeCloseTo((390 * 0.8) / 7);
});

for (const [w, h] of [[1280, 720], [390, 844]] as const) {
  test(`${w}×${h}: pointToCell(cellCenter(c)) round-trips all 49 cells`, () => {
    const L = computeForgeLayout(w, h);
    for (let y = -3; y <= 3; y++)
      for (let x = -3; x <= 3; x++) {
        const p = cellCenter(L, { x, y });
        expect(pointToCell(L, p.x, p.y)).toEqual({ x, y });
      }
  });

  test(`${w}×${h}: points just outside the grid give null`, () => {
    const L = computeForgeLayout(w, h);
    const size = L.cell * 7;
    const mid = { x: L.gridX + size / 2, y: L.gridY + size / 2 };
    expect(pointToCell(L, L.gridX - 0.5, mid.y)).toBeNull();
    expect(pointToCell(L, L.gridX + size + 0.5, mid.y)).toBeNull();
    expect(pointToCell(L, mid.x, L.gridY - 0.5)).toBeNull();
    expect(pointToCell(L, mid.x, L.gridY + size + 0.5)).toBeNull();
    // Just inside the corners still hit the corner cells.
    expect(pointToCell(L, L.gridX + 0.5, L.gridY + 0.5)).toEqual({ x: -3, y: -3 });
    expect(pointToCell(L, L.gridX + size - 0.5, L.gridY + size - 0.5)).toEqual({ x: 3, y: 3 });
  });
}

for (const [w, h] of [[1280, 720], [390, 844]] as const) {
  test(`${w}×${h}: nearestSlot round-trips all 64 node slots, rim included`, () => {
    const L = computeForgeLayout(w, h);
    for (let y = -3.5; y <= 3.5; y++)
      for (let x = -3.5; x <= 3.5; x++) {
        const p = cellCenter(L, { x, y });
        const s = nearestSlot(L, p.x + L.cell * 0.1, p.y - L.cell * 0.1);
        expect({ x: s.x, y: s.y }).toEqual({ x, y });
        expect(s.dist).toBeCloseTo(Math.SQRT2 * 0.1);
      }
  });

  test(`${w}×${h}: nearestSlot clamps to the rim and measures the distance`, () => {
    const L = computeForgeLayout(w, h);
    // A cell centre is equidistant from its four corners.
    const c = cellCenter(L, { x: 0, y: 0 });
    expect(nearestSlot(L, c.x, c.y).dist).toBeCloseTo(Math.SQRT1_2);
    // Half a cell past the top-left corner of the grid still finds the corner slot, 0.5√2 away.
    const far = nearestSlot(L, L.gridX - L.cell * 0.5, L.gridY - L.cell * 0.5);
    expect({ x: far.x, y: far.y }).toEqual({ x: -3.5, y: -3.5 });
    expect(far.dist).toBeCloseTo(Math.SQRT1_2);
    expect(pointToGrid(L, c.x, c.y).x).toBeCloseTo(0);
  });
}

test('diamondPoints: top, right, bottom, left at NODE_FRAME × s', () => {
  const pts = diamondPoints(100, 50, 40);
  const h = NODE_FRAME * 40;
  expect(pts).toEqual([{ x: 100, y: 50 - h }, { x: 100 + h, y: 50 }, { x: 100, y: 50 + h }, { x: 100 - h, y: 50 }]);
});

test('hitRect is inclusive of edges and rejects outside points', () => {
  const r: Rect = { x: 10, y: 20, w: 30, h: 40 };
  expect(hitRect(r, 10, 20)).toBe(true);
  expect(hitRect(r, 40, 60)).toBe(true);
  expect(hitRect(r, 25, 40)).toBe(true);
  expect(hitRect(r, 9.9, 40)).toBe(false);
  expect(hitRect(r, 25, 60.1)).toBe(false);
});
