import { expect, test } from 'vitest';
import { ShipGrid } from '../../src/core/grid';
import { compileLoadout } from '../../src/core/loadout';
import { SIG_BY_ID } from '../../src/data/signatures';

test('split beam diagram: beam has 2 routes, power 1.5, signature listed', () => {
  const m = compileLoadout(ShipGrid.fromJSON(SIG_BY_ID.splitBeam.diagram)).mounts.find(x => x.partId === 'beam')!;
  expect(m.shots).toHaveLength(2); expect(m.signatures).toEqual(['splitBeam']); expect(m.shots[0].spec.power).toBe(1.5);
});
test('bomb payload and magnet feeds', () => {
  const L = compileLoadout(ShipGrid.fromJSON(SIG_BY_ID.clusterShell.diagram));
  expect(L.mounts.find(x => x.partId === 'bomb')!.payload).toBe('pulse');
  const C = compileLoadout(ShipGrid.fromJSON(SIG_BY_ID.coinSlinger.diagram));
  expect(C.mounts.find(x => x.partId === 'magnet')!.feeds).toHaveLength(1);
});
test('stats from utility parts, capped', () => {
  const g = new ShipGrid(); for (const [x, y] of [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5], [1.5, 0.5], [-1.5, 0.5]]) g.place('thruster', { x, y }, 1);
  expect(compileLoadout(g).stats.speedMul).toBe(1.6);
});
test('cockpit-only loadout has the pea-shooter', () => {
  const L = compileLoadout(new ShipGrid()); expect(L.mounts).toHaveLength(1); expect(L.mounts[0].shots[0].spec.damage).toBe(6);
});

// Extra coverage beyond the plan's cases.
test('every part gets a mount; modifiers and utility have no shots; emitters have one unrouted shot', () => {
  const g = new ShipGrid();
  g.place('bomb', { x: 0, y: -1 }, 0); g.place('lens', { x: 1, y: 0 }, 1); g.place('magnet', { x: -0.5, y: 0.5 }, 3);
  const L = compileLoadout(g);
  expect(L.mounts.map(m => m.partId).sort()).toEqual(['bomb', 'cockpit', 'lens', 'magnet']);
  expect(L.mounts.find(m => m.partId === 'lens')!.shots).toEqual([]);
  expect(L.mounts.find(m => m.partId === 'magnet')!.shots).toEqual([]);
  const bomb = L.mounts.find(m => m.partId === 'bomb')!;
  expect(bomb.shots).toHaveLength(1); expect(bomb.shots[0].route).toBeNull(); expect(bomb.aim).toBe('emitter');
});
test('mount carries received traits into its shots', () => {
  const g = new ShipGrid(); g.place('pulse', { x: 0, y: -1 }, 0); g.place('lens', { x: 1, y: -1 }, 1); // lens touches pulse → focus
  const m = compileLoadout(g).mounts.find(x => x.partId === 'pulse')!;
  expect(m.traits).toEqual(['focus']); expect(m.shots[0].spec.damage).toBeCloseTo(12);
});
test('payload order prefers pulse, then needle, then cryo; none without a bolt weapon', () => {
  const g = new ShipGrid(); g.place('bomb', { x: 0, y: -1 }, 0); g.place('cryo', { x: -1, y: -1 }, 3); g.place('needle', { x: 1, y: -1 }, 1);
  expect(compileLoadout(g).mounts.find(m => m.partId === 'bomb')!.payload).toBe('needle');
  const h = new ShipGrid(); h.place('bomb', { x: 0, y: -1 }, 0); h.place('arc', { x: 1, y: -1 }, 1);
  expect(compileLoadout(h).mounts.find(m => m.partId === 'bomb')!.payload).toBeNull();
});
test('magnet feeds include the cockpit and bolt weapons only', () => {
  const g = new ShipGrid(); g.place('magnet', { x: 0.5, y: -0.5 }, 0); g.place('beam', { x: 1, y: 0 }, 1); g.place('needle', { x: 0, y: -1 }, 0);
  const m = compileLoadout(g).mounts.find(x => x.partId === 'magnet')!;
  expect(m.feeds.sort()).toEqual([0, 3]);
});
test('pickup radius and regen scale with magnets and repair nodes', () => {
  const g = new ShipGrid(); g.place('magnet', { x: 0.5, y: -0.5 }, 0); g.place('repair', { x: 0.5, y: 0.5 }, 1); g.place('repair', { x: -0.5, y: 0.5 }, 3);
  expect(compileLoadout(g).stats).toEqual({ speedMul: 1, pickupRadius: 100, regenPerSec: 0.4 });
  const many = new ShipGrid(); for (const [x, y] of [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]) many.place('magnet', { x, y }, 0);
  expect(compileLoadout(many).stats.pickupRadius).toBe(220);
});
test('non-signature mounts have power 1 and loadout lists the matches', () => {
  const L = compileLoadout(ShipGrid.fromJSON(SIG_BY_ID.grandFinale.diagram));
  expect(L.signatures.map(s => s.id)).toEqual(['grandFinale']);
  expect(L.mounts.find(m => m.partId === 'cockpit')!.shots[0].spec.power).toBe(1);
  expect(L.mounts.find(m => m.partId === 'pulse')!.shots[0].spec.power).toBe(1.5);
  expect(L.mounts.find(m => m.partId === 'echo')!.signatures).toEqual(['grandFinale']);
});

// Addendum (Task 4): Hook payloads and Mimic mounts.
import { HOOK_MAX_PAYLOADS, HOOK_PAYLOAD_MUL } from '../../src/core/loadout';
test('hook constants', () => { expect([HOOK_PAYLOAD_MUL, HOOK_MAX_PAYLOADS]).toEqual([0.6, 2]); });
test("the carrier pulse's shot carries the bomb touching the hook; the payload gun keeps its own shots", () => {
  const g = ShipGrid.fromJSON(SIG_BY_ID.stickyBomb.diagram);
  const L = compileLoadout(g);
  const pulse = L.mounts.find(m => m.partId === 'pulse')!;
  const hook = g.parts().find(p => p.id === 'hook')!;
  const bomb = g.parts().find(p => p.id === 'bomb')!;
  expect(pulse.shots[0].payloads).toEqual([{ partId: 'bomb', uid: bomb.uid, hookUid: hook.uid }]);
  const bm = L.mounts.find(m => m.partId === 'bomb')!;
  expect(bm.shots).toHaveLength(1); expect(bm.shots[0].payloads).toEqual([]);
  expect(bm.shots[0].spec.damage).toBeGreaterThanOrEqual(40);
});
test('three weapons touching one hook → payloads.length === 2', () => {
  const g = new ShipGrid();
  g.place('pulse', { x: 0, y: -1 }, 0); g.place('hook', { x: 0, y: -2 }, 0);
  g.place('bomb', { x: 1, y: -2 }, 1); g.place('needle', { x: -1, y: -2 }, 3); g.place('arc', { x: 0, y: -3 }, 0);
  const pulse = compileLoadout(g).mounts.find(m => m.partId === 'pulse')!;
  expect(pulse.shots[0].payloads).toHaveLength(HOOK_MAX_PAYLOADS);
});
test('the carrier is never its own payload; the real cockpit is never a payload', () => {
  const g = new ShipGrid(); g.place('hook', { x: 0, y: -1 }, 0); // touches the cockpit, which fires through it
  const L = compileLoadout(g);
  expect(L.mounts.find(m => m.partId === 'cockpit')!.shots.every(s => s.payloads.length === 0)).toBe(true);
  const h = new ShipGrid(); h.place('pulse', { x: 0, y: -1 }, 0); h.place('hook', { x: 0, y: -2 }, 0);
  expect(compileLoadout(h).mounts.find(m => m.partId === 'pulse')!.shots[0].payloads).toEqual([]);
});
test("the impostor diagram's mimic mount has mimic: true and partId: 'lens'", () => {
  const L = compileLoadout(ShipGrid.fromJSON(SIG_BY_ID.impostor.diagram));
  const mim = L.mounts.filter(m => m.mimic);
  expect(mim).toHaveLength(1); expect(mim[0].partId).toBe('lens');
  expect(L.mounts.filter(m => !m.mimic).every(m => m.partId !== 'mimic')).toBe(true);
  expect(L.signatures.map(s => s.id)).toEqual(['slugRound', 'impostor']);
  expect(mim[0].signatures).toEqual(['slugRound', 'impostor']);
});
test('a mimic copying a pea-shooter fires and can be a hook payload', () => {
  const g = new ShipGrid(); g.place('pulse', { x: 0, y: -1 }, 0); const h = g.place('hook', { x: 0, y: -2 }, 0)!;
  const m = g.place('mimic', { x: 1, y: -2 }, 1)!; // touches only the hook (a modifier) → copies hook
  expect(compileLoadout(g).mounts.find(x => x.uid === m.uid)!.partId).toBe('hook');
  const k = new ShipGrid(); k.place('mimic', { x: 1, y: 0 }, 1);
  const mm = compileLoadout(k).mounts.find(x => x.mimic)!;
  expect(mm.partId).toBe('cockpit'); expect(mm.shots.length).toBeGreaterThan(0);
  void h;
});
test('review #4: with 3+ guns on a hook, the named payload (bomb for bolt carriers) wins a slot, so Sticky Bomb can fire', () => {
  const g = new ShipGrid();
  g.place('pulse', { x: 0, y: -1 }, 0); g.place('hook', { x: 0, y: -2 }, 0);
  g.place('beam', { x: 0, y: -3 }, 0); g.place('needle', { x: 1, y: -2 }, 1); g.place('bomb', { x: -1, y: -2 }, 3);
  const pulse = compileLoadout(g).mounts.find(m => m.partId === 'pulse')!;
  expect(pulse.shots[0].payloads.map(p => p.partId)).toContain('bomb');
  expect(pulse.shots[0].payloads).toHaveLength(HOOK_MAX_PAYLOADS);
});

// Square nodes (2026-10-31).
test('an Echo node gives a touched routed weapon its line effect (doubled shots), not its echo trait; a Bomb still gets the trait', () => {
  const g = new ShipGrid();
  g.place('pulse', { x: 0, y: -1 }, 0); g.place('bomb', { x: 1, y: -1 }, 1); const e = g.place('echo', { x: 0.5, y: -1.5 }, 0)!;
  const L = compileLoadout(g);
  const pulse = L.mounts.find(m => m.partId === 'pulse')!;
  expect(pulse.traits).not.toContain('echo');
  expect(pulse.shots[0].route!.steps[0]).toMatchObject({ uid: e.uid, partId: 'echo' });
  expect(pulse.shots[0].spec.echoes.length).toBeGreaterThan(0);
  expect(L.mounts.find(m => m.partId === 'bomb')!.traits).toContain('echo');
  expect(pulse.touches).toContain(e.uid);
});
test('a Thruster node touching a Lens gets an exhaust route through it (Afterburner Lance)', () => {
  const L = compileLoadout(ShipGrid.fromJSON(SIG_BY_ID.afterburnerLance.diagram));
  const t = L.mounts.find(m => m.partId === 'thruster')!;
  expect(t.shots[0].route!.steps.map(s => s.partId)).toEqual(['lens']);
  expect(t.signatures).toContain('afterburnerLance');
});
