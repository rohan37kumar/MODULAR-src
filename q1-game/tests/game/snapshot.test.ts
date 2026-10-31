import { expect, test } from 'vitest';
import type { ShipJSON } from '../../src/core/types';
import {
  cellCentre, comboColumns, comboLines, fitCellSize, formatCount, formatRunTime, gridBounds, mulberry32, rgba,
  seedFromShip, shipCells, whiten,
} from '../../src/game/snapshot';

const ship: ShipJSON = {
  parts: [
    { id: 'beam', x: 0, y: -1, facing: 0 },
    { id: 'mirror', x: 0, y: -2, facing: 0, orient: '\\' },
    { id: 'bomb', x: 2, y: 1, facing: 1 },
  ],
};

test('shipCells adds the implicit cockpit first and drops stray cockpits and duplicate cells', () => {
  const cells = shipCells({
    parts: [
      { id: 'cockpit', x: 1, y: 1, facing: 0 },
      { id: 'pulse', x: 0, y: 0, facing: 0 },
      { id: 'lens', x: 1, y: 0, facing: 2 },
      { id: 'prism', x: 1, y: 0, facing: 0 },
    ],
  });
  expect(cells).toEqual([
    { id: 'cockpit', x: 0, y: 0, facing: 0 },
    { id: 'lens', x: 1, y: 0, facing: 2, orient: undefined },
  ]);
});

test('gridBounds spans every cell, including the cockpit', () => {
  expect(gridBounds(shipCells(ship))).toEqual({ minX: 0, maxX: 2, minY: -2, maxY: 1, cols: 3, rows: 4 });
  expect(gridBounds(shipCells({ parts: [] }))).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0, cols: 1, rows: 1 });
  expect(gridBounds([])).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0, cols: 1, rows: 1 });
});

test('fitCellSize fits the tighter axis and caps a tiny ship', () => {
  expect(fitCellSize(7, 7, 760, 700, 150)).toBeCloseTo(100);
  expect(fitCellSize(7, 2, 760, 700, 150)).toBeCloseTo(760 / 7);
  expect(fitCellSize(1, 1, 760, 700, 150)).toBe(150);
  expect(fitCellSize(0, 0, 760, 700, 150)).toBe(150);
});

test('cellCentre centres the bounding box on the target point', () => {
  const b = gridBounds(shipCells(ship)); // x 0..2, y -2..1
  expect(cellCentre(1, -0.5, b, 100, 540, 490)).toEqual({ x: 540, y: 490 });
  expect(cellCentre(0, -2, b, 100, 540, 490)).toEqual({ x: 440, y: 340 });
  expect(cellCentre(2, 1, b, 100, 540, 490)).toEqual({ x: 640, y: 640 });
});

test('formatRunTime is m:ss', () => {
  expect(formatRunTime(0)).toBe('0:00');
  expect(formatRunTime(9_999)).toBe('0:09');
  expect(formatRunTime(61_000)).toBe('1:01');
  expect(formatRunTime(7 * 60_000 + 42_500)).toBe('7:42');
  expect(formatRunTime(75 * 60_000)).toBe('75:00');
  expect(formatRunTime(-5)).toBe('0:00');
  expect(formatRunTime(NaN)).toBe('0:00');
});

test('formatCount adds thousands separators', () => {
  expect(formatCount(0)).toBe('0');
  expect(formatCount(999)).toBe('999');
  expect(formatCount(1234)).toBe('1,234');
  expect(formatCount(1234567.8)).toBe('1,234,567');
});

test('comboLines dedupes fired combos in order and flags new ones', () => {
  const lines = comboLines(['slugRound', 'halo', 'slugRound', 'trident'], ['halo']);
  expect(lines.map(l => l.id)).toEqual(['slugRound', 'halo', 'trident']);
  expect(lines.map(l => l.isNew)).toEqual([false, true, false]);
  expect(lines[0]).toMatchObject({ name: 'Slug Round', colour: 0xffe14d });
});

test('comboLines never drops a discovery, and ignores unknown ids', () => {
  const lines = comboLines(['halo', 'bogus' as never], ['trident']);
  expect(lines.map(l => [l.id, l.isNew])).toEqual([['halo', false], ['trident', true]]);
  expect(comboLines([], [])).toEqual([]);
});

test('comboColumns uses one column up to 6, then two with the left one taller', () => {
  expect(comboColumns([1, 2, 3, 4, 5, 6])).toEqual([[1, 2, 3, 4, 5, 6]]);
  expect(comboColumns([1, 2, 3, 4, 5, 6, 7])).toEqual([[1, 2, 3, 4], [5, 6, 7]]);
  const all = Array.from({ length: 15 }, (_, i) => i);
  const cols = comboColumns(all);
  expect(cols.map(c => c.length)).toEqual([8, 7]);
  expect(cols.flat()).toEqual(all);
});

test('seedFromShip is deterministic and layout-sensitive', () => {
  expect(seedFromShip(ship)).toBe(seedFromShip(JSON.parse(JSON.stringify(ship))));
  const turned: ShipJSON = { parts: ship.parts.map(p => (p.id === 'bomb' ? { ...p, facing: 2 } : p)) };
  expect(seedFromShip(turned)).not.toBe(seedFromShip(ship));
  expect(seedFromShip({ parts: [] })).not.toBe(seedFromShip(ship));
});

test('mulberry32 repeats for the same seed and stays in [0, 1)', () => {
  const a = mulberry32(42), b = mulberry32(42), c = mulberry32(43);
  const sa = Array.from({ length: 50 }, a);
  expect(Array.from({ length: 50 }, b)).toEqual(sa);
  expect(Array.from({ length: 50 }, c)).not.toEqual(sa);
  for (const v of sa) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  }
});

test('colour helpers', () => {
  expect(rgba(0x00e5ff, 0.5)).toBe('rgba(0,229,255,0.5)');
  expect(rgba(0xff6e40)).toBe('rgba(255,110,64,1)');
  expect(whiten(0x000000, 1)).toBe(0xffffff);
  expect(whiten(0x00e5ff, 0)).toBe(0x00e5ff);
  expect(whiten(0x000000, 0.5)).toBe(0x808080);
});
