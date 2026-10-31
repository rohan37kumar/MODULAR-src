import { expect, test } from 'vitest';
import { ShipGrid } from '../../src/core/grid';
import { computeTraits } from '../../src/core/traits';

test('touching parts exchange traits both ways', () => {
  const g = new ShipGrid(); const p = g.place('pulse', { x: 0, y: -1 }, 0)!; const b = g.place('bomb', { x: 1, y: -1 }, 1)!;
  const t = computeTraits(g); expect(t.get(b.uid)).toEqual(['shrapnel']); expect(t.get(p.uid)).toEqual(['warhead']);
});
test('cockpit receives but gives nothing', () => {
  const g = new ShipGrid(); const p = g.place('pulse', { x: 0, y: -1 }, 0)!;
  const t = computeTraits(g); expect(t.get(0)).toEqual(['shrapnel']); expect(t.get(p.uid)).toEqual([]);
});
test('same trait twice does not stack', () => {
  const g = new ShipGrid(); g.place('pulse', { x: 1, y: -1 }, 0); const m = g.place('mirror', { x: 1, y: 0 }, 0)!; g.place('pulse', { x: 1, y: 1 }, 2);
  expect(computeTraits(g).get(m.uid)).toEqual(['shrapnel']);
});
test('diagonal parts do not touch', () => {
  const g = new ShipGrid(); g.place('pulse', { x: 0, y: -1 }, 0); const b = g.place('bomb', { x: 1, y: 0 }, 1)!;
  expect(computeTraits(g).get(b.uid)).toEqual([]);
});

test('traits arrive in neighbour order up, right, down, left regardless of placement order', () => {
  const g = new ShipGrid();
  g.place('lens', { x: 1, y: 0 }, 1); // left of the mirror
  g.place('arc', { x: 2, y: 1 }, 2); // below
  g.place('beam', { x: 2, y: -1 }, 0); // above
  const m = g.place('mirror', { x: 2, y: 0 }, 1)!;
  expect(computeTraits(g).get(m.uid)).toEqual(['pierce', 'charge', 'focus']);
});
test('every part uid, including the cockpit, is a key', () => {
  const g = new ShipGrid();
  g.place('pulse', { x: 0, y: -1 }, 0);
  g.place('magnet', { x: 3.5, y: 3.5 }, 1); // isolated, receives nothing
  g.place('repair', { x: -0.5, y: 0.5 }, 3);
  const t = computeTraits(g);
  expect([...t.keys()].sort((a, b) => a - b)).toEqual(g.parts().map(p => p.uid));
  expect(t.has(0)).toBe(true);
  expect(t.get(2)).toEqual([]);
});

test('addendum parts give their traits; the mimic gives none of its own', () => {
  const g = new ShipGrid();
  const pulse = g.place('pulse', { x: 0, y: -1 }, 0)!;
  g.place('saw', { x: 1, y: -1 }, 1); g.place('hook', { x: -1, y: -1 }, 3); g.place('overclock', { x: 0.5, y: -1.5 }, 0);
  expect(computeTraits(g).get(pulse.uid)).toEqual(expect.arrayContaining(['boomerang', 'snag', 'overclock']));
  const h = new ShipGrid();
  const p2 = h.place('pulse', { x: 0, y: -1 }, 0)!;
  h.place('relay', { x: 0.5, y: -1.5 }, 1); h.place('mimic', { x: -1, y: -1 }, 3);
  expect(computeTraits(h).get(p2.uid)).toEqual(['relay']);
});
