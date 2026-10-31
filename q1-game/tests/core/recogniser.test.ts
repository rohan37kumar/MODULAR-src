import { expect, test } from 'vitest';
import { ShipGrid } from '../../src/core/grid';
import { recogniseShip } from '../../src/core/recogniser';
import { PARTS } from '../../src/data/parts';
import { SIG_BY_ID, SIGNATURES } from '../../src/data/signatures';

test.each(SIGNATURES.map(s => [s.id, s] as const))('diagram for %s is recognised', (id, s) => {
  expect(recogniseShip(ShipGrid.fromJSON(s.diagram)).map(m => m.id)).toContain(id);
});
test('data sanity: 21 signatures, indices 1..21, unique ids', () => {
  expect(SIGNATURES.length).toBe(21);
  expect(SIGNATURES.map(s => s.index)).toEqual([...Array(21)].map((_, i) => i + 1));
  expect(new Set(SIGNATURES.map(s => s.id)).size).toBe(21);
});
test('data sanity: diagrams are valid ships; quips ≤ 90 chars; colours unique and off the family palette', () => {
  const family = [0xffb000, 0xffffff, 0xb388ff, 0x39ff88, 0x00e5ff, 0xf48fb1];
  for (const s of SIGNATURES) {
    const g = ShipGrid.fromJSON(s.diagram);
    expect(g.count(), s.id).toBe(s.diagram.parts.length + 1);
    expect(g.isValid(), s.id).toBe(true);
    expect(s.quip.length, s.id).toBeLessThanOrEqual(90);
    expect(family, s.id).not.toContain(s.colour);
    expect(PARTS[s.keyPart], s.id).toBeDefined();
  }
  expect(new Set(SIGNATURES.map(s => s.colour)).size).toBe(SIGNATURES.length);
});
test('each diagram recognises exactly its own signature (impostor also names the combo it completes)', () => {
  for (const s of SIGNATURES) {
    if (s.id === 'impostor') continue;
    expect(recogniseShip(ShipGrid.fromJSON(s.diagram)).map(m => m.id), s.id).toEqual([s.id]);
  }
  const imp = recogniseShip(ShipGrid.fromJSON(SIG_BY_ID.impostor.diagram));
  expect(imp.map(m => m.id)).toEqual(['slugRound', 'impostor']);
  expect(imp[1].uids).toEqual(imp[0].uids);
});
test('resonator suppresses split beam and is not hall of mirrors', () => {
  const ids = recogniseShip(ShipGrid.fromJSON(SIG_BY_ID.resonator.diagram)).map(m => m.id);
  expect(ids).toEqual(['resonator']);
});
test('hall of mirrors suppresses split beam', () => {
  expect(recogniseShip(ShipGrid.fromJSON(SIG_BY_ID.hallOfMirrors.diagram)).map(m => m.id)).toEqual(['hallOfMirrors']);
});
test('grand finale suppresses its own cluster shells but not an unrelated one', () => {
  const g = ShipGrid.fromJSON(SIG_BY_ID.grandFinale.diagram);
  expect(recogniseShip(g).map(m => m.id)).toEqual(['grandFinale']);
  g.place('bomb', { x: 1, y: 0 }, 1); g.place('needle', { x: 2, y: 0 }, 1);
  expect(recogniseShip(g).map(m => m.id).sort()).toEqual(['clusterShell', 'grandFinale']);
});
test('unnamed results are not signatures', () => {
  const g = new ShipGrid(); g.place('needle', { x: 0, y: -1 }, 0); g.place('lens', { x: 0, y: -2 }, 0);
  expect(recogniseShip(g)).toEqual([]);
});
test('a line signature needs the modifier first in the line', () => {
  const g = new ShipGrid(); g.place('beam', { x: 0, y: -1 }, 0); g.place('lens', { x: 0, y: -2 }, 0); g.place('mirror', { x: 0, y: -3 }, 0);
  expect(recogniseShip(g)).toEqual([]);
});
test('two beams with mirrors give two split beam matches', () => {
  const g = ShipGrid.fromJSON(SIG_BY_ID.splitBeam.diagram); g.place('beam', { x: 1, y: 0 }, 1); g.place('mirror', { x: 2, y: 0 }, 0, '/');
  expect(recogniseShip(g).filter(m => m.id === 'splitBeam')).toHaveLength(2);
});
test('match uids are sorted and name the participants', () => {
  const g = new ShipGrid(); const m = g.place('mirror', { x: 0, y: -2 }, 0)!; const b = g.place('beam', { x: 0, y: -1 }, 0)!;
  expect(recogniseShip(g)).toEqual([{ id: 'splitBeam', uids: [m.uid, b.uid].sort((x, y) => x - y) }]);
});
test('needle variants: gravity sling, cluster shell, shatterstorm, coin slinger', () => {
  const sling = new ShipGrid(); sling.place('needle', { x: 0, y: -1 }, 0); sling.place('orbit', { x: 0.5, y: -1.5 }, 0);
  expect(recogniseShip(sling).map(m => m.id)).toEqual(['gravitySling']);
  const touch = new ShipGrid(); touch.place('needle', { x: 0, y: -1 }, 0);
  touch.place('bomb', { x: -1, y: -1 }, 3); touch.place('cryo', { x: 1, y: -1 }, 1); touch.place('magnet', { x: -0.5, y: -1.5 }, 0);
  expect(recogniseShip(touch).map(m => m.id).sort()).toEqual(['clusterShell', 'coinSlinger', 'shatterstorm']);
});
test('a touch pair is matched once, not twice', () => {
  const g = ShipGrid.fromJSON(SIG_BY_ID.stormSeed.diagram);
  expect(recogniseShip(g)).toHaveLength(1);
});
test('a mirror-split beam whose turned branch hits a prism is split beam, not trident', () => {
  const g = new ShipGrid(); g.place('beam', { x: 0, y: -1 }, 0); g.place('mirror', { x: 0, y: -2 }, 0, '/'); g.place('prism', { x: 1, y: -2 }, 0);
  expect(recogniseShip(g).map(m => m.id)).toEqual(['splitBeam']);
});

// Addendum (Task 4): Hook, Saw, Overclock, Relay, Mimic signatures.
const ids = (g: ShipGrid) => recogniseShip(g).map(m => m.id);
test('pulse→hook with bomb touching hook → stickyBomb [pulse, hook, bomb]; the same with a needle', () => {
  for (const src of ['pulse', 'needle'] as const) {
    const g = new ShipGrid();
    const a = g.place(src, { x: 0, y: -1 }, 0)!; const h = g.place('hook', { x: 0, y: -2 }, 0)!; const b = g.place('bomb', { x: 1, y: -2 }, 1)!;
    expect(recogniseShip(g), src).toEqual([{ id: 'stickyBomb', uids: [a.uid, h.uid, b.uid] }]);
  }
});
test('beam→hook with arc touching → lightningRod', () => {
  expect(ids(ShipGrid.fromJSON(SIG_BY_ID.lightningRod.diagram))).toEqual(['lightningRod']);
  const g = new ShipGrid(); g.place('beam', { x: 0, y: -1 }, 0); g.place('hook', { x: 0, y: -2 }, 0); g.place('arc', { x: -1, y: -2 }, 3);
  expect(ids(g)).toEqual(['lightningRod']);
});
test('hook not in the line (only touching) → no stickyBomb', () => {
  const g = new ShipGrid(); g.place('pulse', { x: 0, y: -1 }, 0); g.place('hook', { x: 1, y: -1 }, 1); g.place('bomb', { x: 1, y: -2 }, 0);
  expect(ids(g)).not.toContain('stickyBomb');
});
test('hook later in the line still carries (lens then hook)', () => {
  const g = new ShipGrid(); g.place('pulse', { x: 0, y: -1 }, 0); g.place('lens', { x: 0, y: -2 }, 0); g.place('hook', { x: 0, y: -3 }, 0);
  g.place('bomb', { x: 1, y: -3 }, 1);
  expect(ids(g).sort()).toEqual(['slugRound', 'stickyBomb']);
});
test('saw+relay → ricochet, overclock+cryo → flashFreeze, relay+pulse → domino, relay+needle → no domino', () => {
  const t = (a: 'saw' | 'overclock' | 'relay', b: 'relay' | 'cryo' | 'pulse' | 'needle') => {
    // The node sits on the corner (1.5, -0.5) of the octagon at (1, 0).
    const g = new ShipGrid();
    const [node, oct] = a === 'saw' ? [b, a] : [a, b];
    g.place(oct, { x: 1, y: 0 }, 1); g.place(node, { x: 1.5, y: -0.5 }, 1); return ids(g);
  };
  expect(t('saw', 'relay')).toEqual(['ricochet']);
  expect(t('overclock', 'cryo')).toEqual(['flashFreeze']);
  expect(t('relay', 'pulse')).toEqual(['domino']);
  expect(t('relay', 'needle')).toEqual([]);
});
test('a mimic completing a touch combo credits it and impostor; a plain combo gets no impostor', () => {
  const g = new ShipGrid(); g.place('cryo', { x: 1, y: 0 }, 1); g.place('mimic', { x: 1, y: -1 }, 0); g.place('pulse', { x: 1, y: -2 }, 0);
  // the mimic touches cryo and pulse (both weapons, one each): tie → lowest uid → cryo, and that cryo touches the pulse.
  expect(ids(g)).toEqual(['shatterstorm', 'impostor']);
  const h = new ShipGrid(); h.place('needle', { x: 1, y: 0 }, 1); h.place('mimic', { x: 2, y: 0 }, 1); h.place('needle', { x: 3, y: 0 }, 1);
  h.place('cryo', { x: 2, y: -1 }, 0);
  // mimic touches 2 needles + 1 cryo → needle; it then touches the cryo → shatterstorm, completed by the mimic.
  expect(ids(h)).toEqual(['shatterstorm', 'impostor']);
  expect(ids(ShipGrid.fromJSON(SIG_BY_ID.domino.diagram))).toEqual(['domino']);
});
test('recognise on an already-resolved grid needs the mimic set to credit impostor', async () => {
  const { withMimicsResolved } = await import('../../src/core/mimic');
  const { recognise } = await import('../../src/core/recogniser');
  const { grid, mimics } = withMimicsResolved(ShipGrid.fromJSON(SIG_BY_ID.impostor.diagram));
  expect(recognise(grid).map(m => m.id)).toEqual(['slugRound']);
  expect(recognise(grid, mimics).map(m => m.id)).toEqual(['slugRound', 'impostor']);
});

// Square nodes (2026-10-31): the violet and green parts sit at cell corners and touch the 4 octagons around them.
test('one node touches all four octagons around it: an Orbit node turns two Beams into two Halos', () => {
  const g = new ShipGrid();
  g.place('beam', { x: 0, y: -1 }, 0); g.place('beam', { x: 1, y: 0 }, 1); g.place('orbit', { x: 0.5, y: -0.5 }, 0);
  expect(ids(g)).toEqual(['halo', 'halo']);
});
test('porcupine needs a Magnet node and a Bulwark node on the same octagon', () => {
  const g = new ShipGrid(); g.place('magnet', { x: 0.5, y: 0.5 }, 0); g.place('bulwark', { x: -0.5, y: 0.5 }, 0);
  expect(ids(g)).toEqual(['porcupine']);
  const far = new ShipGrid(); far.place('magnet', { x: 0.5, y: 0.5 }, 0); far.place('pulse', { x: 1, y: 0 }, 1); far.place('bulwark', { x: 1.5, y: -0.5 }, 0);
  // both touch the pulse at (1, 0) → porcupine; the magnet also makes a coin slinger with that pulse
  expect(ids(far).sort()).toEqual(['coinSlinger', 'porcupine']);
});
test('a node on a cell, or an octagon in a gap, is refused', () => {
  const g = new ShipGrid();
  expect(g.place('relay', { x: 1, y: 0 }, 0)).toBeNull();
  expect(g.place('pulse', { x: 0.5, y: 0.5 }, 0)).toBeNull();
});
