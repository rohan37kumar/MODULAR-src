import { expect, test } from 'vitest';
import { ShipGrid } from '../../src/core/grid';
import { reflect } from '../../src/core/math';
import type { Dir } from '../../src/core/types';

test('new grid has only the cockpit', () => {
  const g = new ShipGrid();
  expect(g.parts()).toEqual([{ uid: 0, id: 'cockpit', x: 0, y: 0, facing: 0 }]);
});
test('attach on the top side lands above and faces up', () => {
  const p = new ShipGrid().attach('pulse', { x: 0, y: 0 }, { x: 0.1, y: -0.6 })!;
  expect([p.x, p.y, p.facing]).toEqual([0, -1, 0]);
});
test('attach on the right side faces right', () => {
  const p = new ShipGrid().attach('beam', { x: 0, y: 0 }, { x: 0.6, y: 0.1 })!;
  expect([p.x, p.y, p.facing]).toEqual([1, 0, 1]);
});
test('occupied target picks nearest free neighbour of the contacted cell', () => {
  const g = new ShipGrid(); g.place('pulse', { x: 0, y: -1 }, 0);
  const p = g.attach('lens', { x: 0, y: 0 }, { x: 0.2, y: -0.6 })!;
  expect([p.x, p.y, p.facing]).toEqual([1, 0, 1]);
});
test('returns null when every neighbour is occupied or out of bounds', () => {
  const g = new ShipGrid();
  for (const [x, y] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) g.place('lens', { x, y }, 0);
  expect(g.attach('pulse', { x: 0, y: 0 }, { x: 0, y: -0.6 })).toBeNull();
  const h = new ShipGrid();
  for (let y = -1; y >= -3; y--) h.place('lens', { x: 0, y }, 0);
  const edge = h.attach('pulse', { x: 0, y: -3 }, { x: 0, y: -3.6 })!; // (0,-4) out of bounds
  expect(Math.abs(edge.x)).toBe(1); expect(edge.y).toBe(-3);
});
test('two attaches at the same spot never overlap', () => {
  const g = new ShipGrid();
  const a = g.attach('pulse', { x: 0, y: 0 }, { x: 0, y: -0.6 })!;
  const b = g.attach('lens', { x: 0, y: 0 }, { x: 0, y: -0.6 })!;
  expect(`${a.x},${a.y}`).not.toBe(`${b.x},${b.y}`);
});
test('mirror attaches with "/" and rotate toggles it', () => {
  const g = new ShipGrid(); const m = g.attach('mirror', { x: 0, y: 0 }, { x: 0, y: -0.6 })!;
  expect(m.orient).toBe('/'); g.rotate(m.uid); expect(g.byUid(m.uid)!.orient).toBe('\\');
});
test('rotate cycles facing; cockpit cannot rotate, move or jettison', () => {
  const g = new ShipGrid(); const p = g.place('pulse', { x: 0, y: -1 }, 3)!;
  g.rotate(p.uid); expect(g.byUid(p.uid)!.facing).toBe(0);
  expect(g.rotate(0)).toBe(false); expect(g.move(0, { x: 1, y: 1 })).toBe(false); expect(g.jettison(0)).toBe(false);
});
test('move rejects occupied and out-of-bounds cells, allows disconnection', () => {
  const g = new ShipGrid(); const p = g.place('pulse', { x: 0, y: -1 }, 0)!;
  expect(g.move(p.uid, { x: 0, y: 0 })).toBe(false);
  expect(g.move(p.uid, { x: 4, y: 0 })).toBe(false);
  expect(g.move(p.uid, { x: 2, y: 2 })).toBe(true);
  expect(g.disconnected().map(q => q.uid)).toEqual([p.uid]); expect(g.isValid()).toBe(false);
});
test('JSON round-trip preserves layout', () => {
  const g = new ShipGrid(); g.place('mirror', { x: 0, y: -1 }, 0, '\\'); g.place('beam', { x: 1, y: 0 }, 1);
  expect(ShipGrid.fromJSON(g.toJSON()).toJSON()).toEqual(g.toJSON());
});
test('reflect table', () => {
  expect([0, 1, 2, 3].map(d => reflect(d as Dir, '/'))).toEqual([1, 0, 3, 2]);
  expect([0, 1, 2, 3].map(d => reflect(d as Dir, '\\'))).toEqual([3, 2, 1, 0]);
});
test('jettison removes a part', () => {
  const g = new ShipGrid(); const p = g.place('pulse', { x: 0, y: -1 }, 0)!;
  expect(g.jettison(p.uid)).toBe(true); expect(g.count()).toBe(1); expect(g.get(0, -1)).toBeUndefined();
});

// Square nodes (2026-10-31).
test('a node attaches to the free corner of the contacted octagon nearest the point, facing away from the cockpit', () => {
  const g = new ShipGrid();
  const n = g.attach('relay', { x: 0, y: 0 }, { x: 0.7, y: -0.6 })!;
  expect([n.x, n.y]).toEqual([0.5, -0.5]);
  const p = g.attach('pulse', { x: 0.5, y: -0.5 }, { x: 0.9, y: -0.2 })!; // a node contact hands over to its nearest octagon (the cockpit)
  expect(ShipGrid.isCell(p)).toBe(true);
  expect(Math.abs(p.x) + Math.abs(p.y)).toBe(1);
});
test('nodes connect through any octagon they touch; a node touching nothing connected is disconnected', () => {
  const g = new ShipGrid();
  const a = g.place('magnet', { x: 0.5, y: 0.5 }, 0)!;
  const b = g.place('magnet', { x: 2.5, y: 2.5 }, 0)!;
  expect(g.disconnected().map(p => p.uid)).toEqual([b.uid]);
  expect(g.disconnected().some(p => p.uid === a.uid)).toBe(false);
  expect(g.move(a.uid, { x: 1, y: 1 })).toBe(false); // nodes only move to slots
  expect(g.move(a.uid, { x: -3.5, y: 3.5 })).toBe(true); // the outer rim is a slot
});
test('touching: an octagon sees its 4 edge neighbours and 4 corner nodes; a node sees the 4 octagons around it', () => {
  const g = new ShipGrid();
  g.place('pulse', { x: 1, y: 0 }, 1);
  const n = g.place('echo', { x: 0.5, y: -0.5 }, 0)!;
  expect(g.touching(n).map(p => p.id).sort()).toEqual(['cockpit', 'pulse']);
  expect(g.touching(g.get(0, 0)!).map(p => p.id)).toEqual(['pulse', 'echo']);
});
test('a Blueprint start part has a spot in front of the cockpit for every part: a cell for octagons, the front-right gap for nodes', async () => {
  const { blueprintSpot } = await import('../../src/core/grid');
  const { LOOSE_PART_IDS } = await import('../../src/data/parts');
  for (const id of LOOSE_PART_IDS) {
    const g = new ShipGrid();
    expect(g.place(id, blueprintSpot(id), 0), id).not.toBeNull();
    expect(g.isValid(), id).toBe(true);
  }
});
