import { expect, test } from 'vitest';
import { ShipGrid } from '../../src/core/grid';
import { resolveMimics, withMimicsResolved } from '../../src/core/mimic';

test('mimic touching two lenses and one pulse copies lens', () => {
  const g = new ShipGrid();
  const m = g.place('mimic', { x: 0, y: -2 }, 0)!;
  g.place('pulse', { x: 0, y: -1 }, 0);
  g.place('lens', { x: -1, y: -2 }, 0); g.place('lens', { x: 1, y: -2 }, 0);
  expect(resolveMimics(g).get(m.uid)).toBe('lens');
});

test('tie: one pulse and one lens → pulse', () => {
  const g = new ShipGrid();
  const m = g.place('mimic', { x: 0, y: -2 }, 0)!;
  g.place('lens', { x: 1, y: -2 }, 0); // placed first: lower uid, but a modifier
  g.place('pulse', { x: 0, y: -1 }, 0);
  expect(resolveMimics(g).get(m.uid)).toBe('pulse');
});

test('tie within family → lowest-uid neighbour', () => {
  const g = new ShipGrid();
  const m = g.place('mimic', { x: 0, y: -2 }, 0)!;
  g.place('needle', { x: 1, y: -2 }, 0);
  g.place('cryo', { x: -1, y: -2 }, 0);
  g.place('pulse', { x: 0, y: -1 }, 0); // connects to the cockpit; one of each weapon → needle has the lowest uid
  expect(resolveMimics(g).get(m.uid)).toBe('needle');
});

test("mimic touching only the cockpit → 'cockpit'", () => {
  const g = new ShipGrid();
  const m = g.place('mimic', { x: 1, y: 0 }, 1)!;
  expect(resolveMimics(g).get(m.uid)).toBe('cockpit');
});

test("two mimics touching each other and the cockpit → both 'cockpit'", () => {
  const g = new ShipGrid();
  const a = g.place('mimic', { x: 1, y: 0 }, 1)!;
  const b = g.place('mimic', { x: 1, y: -1 }, 0)!;
  const r = resolveMimics(g);
  expect(r.get(a.uid)).toBe('cockpit');
  expect(r.get(b.uid)).toBe('cockpit');
});

test("a resolved grid has no 'mimic' ids and keeps every uid, cell and facing", () => {
  const g = new ShipGrid();
  g.place('pulse', { x: 0, y: -1 }, 0);
  g.place('mimic', { x: 0, y: -2 }, 2);
  g.place('mirror', { x: 1, y: -2 }, 0, '\\');
  g.place('mirror', { x: -1, y: -2 }, 0, '\\');
  g.place('mimic', { x: 1, y: 0 }, 1);
  const { grid, mimics } = withMimicsResolved(g);
  expect(grid.parts().some(p => p.id === 'mimic')).toBe(false);
  expect(mimics).toEqual(new Set([2, 5]));
  const before = g.parts().map(p => [p.uid, p.x, p.y, p.facing]);
  const after = grid.parts().map(p => [p.uid, p.x, p.y, p.facing]);
  expect(after).toEqual(before);
  expect(grid.byUid(2)).toMatchObject({ id: 'mirror', orient: '/' });
  expect(grid.byUid(5)!.id).toBe('cockpit');
  // The source grid is untouched.
  expect(g.byUid(2)!.id).toBe('mimic');
});

test('re-resolves after a jettison', () => {
  const g = new ShipGrid();
  const m = g.place('mimic', { x: 0, y: -2 }, 0)!;
  g.place('pulse', { x: 0, y: -1 }, 0);
  const l1 = g.place('lens', { x: -1, y: -2 }, 0)!;
  const l2 = g.place('lens', { x: 1, y: -2 }, 0)!;
  expect(resolveMimics(g).get(m.uid)).toBe('lens');
  g.jettison(l1.uid); g.jettison(l2.uid);
  expect(resolveMimics(g).get(m.uid)).toBe('pulse');
});

test('review #6: a Mimic copying a Mirror takes its orientation from its facing, so Rotate flips it', () => {
  const g = new ShipGrid();
  g.place('mirror', { x: 0, y: -1 }, 0, '/');
  const m = g.place('mimic', { x: 0, y: -2 }, 0)!;
  expect(withMimicsResolved(g).grid.byUid(m.uid)!.orient).toBe('/');
  g.rotate(m.uid);
  expect(withMimicsResolved(g).grid.byUid(m.uid)!.orient).toBe('\\');
});
