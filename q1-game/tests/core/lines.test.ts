import { expect, test } from 'vitest';
import { ShipGrid } from '../../src/core/grid';
import { MAX_BRANCHES, traceLines } from '../../src/core/lines';

const beamUp = () => { const g = new ShipGrid(); const b = g.place('beam', { x: 0, y: -1 }, 0)!; return { g, b }; };

test('empty line exits at the source', () => {
  const { g, b } = beamUp(); const r = traceLines(g, b.uid);
  expect(r).toHaveLength(1); expect(r[0].steps).toEqual([]); expect(r[0].exit).toEqual({ cell: { x: 0, y: -1 }, dir: 0 }); expect(r[0].damageMul).toBe(1);
});
test('modifiers in order; non-modifiers transparent; gaps stop the line', () => {
  const { g, b } = beamUp(); g.place('mimic', { x: 0, y: -2 }, 0); g.place('lens', { x: 0, y: -3 }, 0);
  expect(traceLines(g, b.uid)[0].steps.map(s => s.partId)).toEqual(['lens']);
  const h = new ShipGrid(); const c = h.place('beam', { x: 1, y: 0 }, 0)!; h.place('lens', { x: 1, y: -2 }, 0); // (1,-1) empty
  expect(traceLines(h, c.uid)[0].steps).toEqual([]);
});
test('mirror splits into straight and turned branches at 0.7', () => {
  const { g, b } = beamUp(); g.place('mirror', { x: 0, y: -2 }, 0, '/'); g.place('lens', { x: 1, y: -2 }, 0);
  const r = traceLines(g, b.uid);
  expect(r).toHaveLength(2);
  const straight = r.find(x => x.exit.dir === 0)!, turned = r.find(x => x.exit.dir === 1)!;
  expect(straight.damageMul).toBeCloseTo(0.7); expect(turned.steps.map(s => s.partId)).toEqual(['mirror', 'lens']);
  expect(turned.steps[0].turned).toBe(true); expect(turned.exit.cell).toEqual({ x: 1, y: -2 });
});
test('backslash mirror turns up-travel to the left', () => {
  const { g, b } = beamUp(); g.place('mirror', { x: 0, y: -2 }, 0, '\\');
  expect(traceLines(g, b.uid).map(r => r.exit.dir).sort()).toEqual([0, 3]);
});
test('order is preserved: lens then mirror', () => {
  const { g, b } = beamUp(); g.place('lens', { x: 0, y: -2 }, 0); g.place('mirror', { x: 0, y: -3 }, 0);
  expect(traceLines(g, b.uid)[0].steps.map(s => s.partId)).toEqual(['lens', 'mirror']);
});
test('mirror square terminates within the branch cap', () => {
  const g = new ShipGrid(); const b = g.place('beam', { x: 0, y: -1 }, 0)!;
  g.place('mirror', { x: 0, y: -2 }, 0, '/'); g.place('mirror', { x: 1, y: -2 }, 0, '\\');
  g.place('mirror', { x: 1, y: -1 }, 0, '/'); g.place('mirror', { x: 1, y: 0 }, 0, '\\');
  const r = traceLines(g, b.uid); expect(r.length).toBeGreaterThan(0); expect(r.length).toBeLessThanOrEqual(MAX_BRANCHES);
});
test('the thruster is a node and never routes; emitters do not route; nodes never sit in a line', () => {
  const g = new ShipGrid(); const t = g.place('thruster', { x: 0.5, y: 0.5 }, 2)!; g.place('lens', { x: 0, y: 1 }, 0);
  expect(traceLines(g, t.uid)).toEqual([]);
  expect(traceLines(g, g.place('bomb', { x: 1, y: 0 }, 1)!.uid)).toEqual([]);
  const { g: h, b } = beamUp(); h.place('echo', { x: 0.5, y: -1.5 }, 0); h.place('lens', { x: 0, y: -2 }, 0);
  expect(traceLines(h, b.uid)[0].steps.map(s => s.partId)).toEqual(['lens']);
});
test('path holds the source plus every traversed cell; route carries sourceUid', () => {
  const { g, b } = beamUp(); g.place('lens', { x: 0, y: -2 }, 0); g.place('prism', { x: 0, y: -3 }, 0);
  const [r] = traceLines(g, b.uid);
  expect(r.sourceUid).toBe(b.uid);
  expect(r.path).toEqual([{ x: 0, y: -1 }, { x: 0, y: -2 }, { x: 0, y: -3 }]);
  expect(r.exit).toEqual({ cell: { x: 0, y: -3 }, dir: 0 });
});
test('a line routed back into its own source stops there', () => {
  // up → '\' left → '/' down → through the cockpit → '\' right → '/' up → back into the beam at (1,0)
  const g = new ShipGrid(); const b = g.place('beam', { x: 1, y: 0 }, 0)!;
  g.place('mirror', { x: 1, y: -1 }, 0, '\\'); g.place('mirror', { x: 0, y: -1 }, 0, '/');
  g.place('mirror', { x: 0, y: 1 }, 0, '\\'); g.place('mirror', { x: 1, y: 1 }, 0, '/');
  const r = traceLines(g, b.uid);
  expect(r.length).toBeLessThanOrEqual(MAX_BRANCHES);
  for (const route of r) expect(route.path.slice(1).some(c => c.x === 1 && c.y === 0)).toBe(false);
});
test('two mirrors in a line give three branches at 0.49 / 0.49 / 0.7', () => {
  const { g, b } = beamUp(); g.place('mirror', { x: 0, y: -2 }, 0, '/'); g.place('mirror', { x: 0, y: -3 }, 0, '/');
  const muls = traceLines(g, b.uid).map(r => r.damageMul).sort();
  expect(muls).toHaveLength(3);
  expect(muls[0]).toBeCloseTo(0.49); expect(muls[1]).toBeCloseTo(0.49); expect(muls[2]).toBeCloseTo(0.7);
});
