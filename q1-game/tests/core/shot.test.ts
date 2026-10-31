import { expect, test } from 'vitest';
import { baseShot, capVolley, compileShot, MAX_VOLLEY } from '../../src/core/shot';
import type { PartId, Route, TraitId } from '../../src/core/types';

const route = (...ids: PartId[]): Route => ({ sourceUid: 1, steps: ids.map((partId, i) => ({ uid: 10 + i, partId, cell: { x: 0, y: -2 - i } })), path: [], exit: { cell: { x: 0, y: 0 }, dir: 0 }, damageMul: 1 });

test('pulse → lens fuses over time', () => { const s = compileShot('pulse', [], route('lens'), 1)!; expect([s.fuse, s.damage, s.pierce]).toEqual([3, 40, 99]); });
test('order matters: prism→lens is one slug, lens→prism is a fan', () => {
  expect(compileShot('pulse', [], route('prism', 'lens'), 1)!.count).toBe(1);
  expect(compileShot('pulse', [], route('lens', 'prism'), 1)!.count).toBe(3);
});
test('beam → lens narrows and doubles', () => { const s = compileShot('beam', [], route('lens'), 1)!; expect([s.width, s.damage]).toEqual([3, 60]); });
test('exhaust → lens becomes a lance', () => { const s = compileShot('thruster', [], route('lens'), 1)!; expect([s.shape, s.range, s.damage]).toEqual(['lance', 180, 36]); });
test('beam → orbit becomes a ring; beam → prism is a trident', () => {
  expect(compileShot('beam', [], route('orbit'), 1)!.shape).toBe('ring');
  expect(compileShot('beam', [], route('prism'), 1)!.count).toBe(3);
});
test('route damageMul and signature power multiply damage', () => {
  const r = { ...route(), damageMul: 0.7 }; expect(compileShot('pulse', [], r, 1.5)!.damage).toBeCloseTo(10.5);
});
test('traits: focus, pierce, flags; never harmful', () => {
  const s = compileShot('pulse', ['focus', 'pierce', 'charge', 'shrapnel'], null, 1)!;
  expect([s.damage, s.pierce]).toEqual([12, 1]); expect(s.effects).toEqual(expect.arrayContaining(['charge', 'shrapnel']));
  for (const t of ['shrapnel', 'pierce', 'twin', 'warhead', 'charge', 'chill', 'bounce', 'focus', 'orbit', 'echo', 'split', 'ignite', 'pull', 'harden', 'mend'] as TraitId[])
    for (const id of ['pulse', 'beam', 'thruster', 'bomb'] as PartId[]) expect(compileShot(id, [t], null, 1)!.damage).toBeGreaterThanOrEqual(baseShot(id)!.damage);
});
test('volley cap holds under prism × prism × echo × twin', () => {
  const s = compileShot('pulse', ['twin', 'echo'], route('prism', 'prism', 'prism', 'echo', 'echo'), 1)!;
  expect(s.count * (1 + s.echoes.length) * (s.twin ? 2 : 1)).toBeLessThanOrEqual(MAX_VOLLEY);
});

// Extra coverage beyond the plan's cases.
test('non-weapons have no base shot; base shots match tuning', () => {
  for (const id of ['mirror', 'lens', 'orbit', 'echo', 'prism', 'magnet', 'bulwark', 'repair'] as PartId[]) expect(baseShot(id)).toBeNull();
  expect(baseShot('beam')).toMatchObject({ shape: 'beam', damage: 30, range: 220, width: 6, count: 1, fuse: 1, power: 1 });
  expect(baseShot('arc')!.shape).toBe('chain');
});
test('three-bolt volley into a lens fuses into one heavier slug', () => {
  const s = compileShot('pulse', [], route('prism', 'lens'), 1)!;
  expect(s.damage).toBeCloseTo(10 * 0.6 * 3 * 1.33); expect(s.pierce).toBe(99); expect(s.width).toBe(8);
});
test('orbit on bolts parks them; echo in line adds a full-strength repeat; echo on beams intensifies', () => {
  expect(compileShot('pulse', [], route('orbit'), 1)!.orbit).toBe(true);
  expect(compileShot('pulse', [], route('echo'), 1)!.echoes).toEqual([{ delay: 0.25, mul: 1 }]);
  const b = compileShot('beam', [], route('echo'), 1)!; expect(b.damage).toBeCloseTo(48); expect(b.width).toBeCloseTo(7.8);
});
test('mirror steps are a no-op for the compiler', () => {
  expect(compileShot('pulse', [], route('mirror'), 1)).toEqual(compileShot('pulse', [], route(), 1));
});
test('non-bolt fallbacks give ×1.15 damage; flags reach every shape', () => {
  expect(compileShot('beam', ['twin'], null, 1)!.damage).toBeCloseTo(34.5);
  expect(compileShot('beam', ['pierce'], null, 1)!.range).toBeCloseTo(253);
  expect(compileShot('beam', ['charge'], null, 1)!.effects).toEqual(['charge']);
  expect(compileShot('bomb', ['twin', 'split'], null, 1)).toMatchObject({ twin: true, extraShards: 2 });
});
test('compiling never mutates the base shot', () => {
  const before = JSON.stringify(baseShot('pulse'));
  compileShot('pulse', ['echo', 'split'], route('prism', 'lens', 'echo'), 1.5);
  expect(JSON.stringify(baseShot('pulse'))).toBe(before);
});
test('signature power is recorded on the spec', () => {
  expect(compileShot('pulse', [], null, 1.5)!.power).toBe(1.5);
});

// Addendum (Task 3): Saw base, Overclock, Relay, Boomerang, Snag.
test('saw base: pierces everything, boomerang effect, rateMul 1', () => {
  const s = baseShot('saw')!;
  expect([s.pierce, s.effects, s.rateMul]).toEqual([99, ['boomerang'], 1]);
  expect(baseShot('pulse')!.rateMul).toBe(1);
});
test("overclock on a pulse → rateMul 3, damage ×0.5, effects include 'overclock'", () => {
  const s = compileShot('pulse', ['overclock'], null, 1)!;
  expect([s.rateMul, s.damage]).toEqual([3, 5]); expect(s.effects).toContain('overclock');
});
test('overclock on a bomb burst and on an arc chain → rateMul 3, damage ×0.5', () => {
  for (const id of ['bomb', 'arc'] as PartId[]) {
    const s = compileShot(id, ['overclock'], null, 1)!;
    expect([s.rateMul, s.damage]).toEqual([3, baseShot(id)!.damage * 0.5]);
  }
});
test('overclock on a beam → damage ×1.5, rateMul 1', () => {
  const s = compileShot('beam', ['overclock'], null, 1)!;
  expect([s.rateMul, s.damage]).toEqual([1, 45]);
});
test('overclock on thruster flame → unchanged', () => {
  expect(compileShot('thruster', ['overclock'], null, 1)).toEqual(baseShot('thruster'));
});
test('overclock applies once', () => {
  expect(compileShot('pulse', ['overclock', 'overclock'], null, 1)!.damage).toBe(5);
});
test("relay on a bolt → effect 'relay'; on a beam, burst or chain → unchanged (no fallback boost)", () => {
  expect(compileShot('needle', ['relay'], null, 1)!.effects).toContain('relay');
  for (const id of ['beam', 'bomb', 'arc'] as PartId[]) expect(compileShot(id, ['relay'], null, 1)).toEqual(baseShot(id));
});
test('boomerang on a bolt → effect; on a beam → ×1.15 fallback', () => {
  expect(compileShot('pulse', ['boomerang'], null, 1)!.effects).toContain('boomerang');
  const b = compileShot('beam', ['boomerang'], null, 1)!;
  expect(b.damage).toBeCloseTo(30 * 1.15); expect(b.effects).not.toContain('boomerang');
});
test('snag → effect on every shape', () => {
  for (const id of ['pulse', 'beam', 'thruster', 'bomb', 'arc', 'saw'] as PartId[]) expect(compileShot(id, ['snag'], null, 1)!.effects).toContain('snag');
});
test('volley cap holds for an overclocked twin/echo/split saw through prism+echo', () => {
  const s = compileShot('saw', ['overclock', 'twin', 'echo', 'split'], route('prism', 'echo'), 1)!;
  expect(s.count * (1 + s.echoes.length) * (s.twin ? 2 : 1)).toBeLessThanOrEqual(MAX_VOLLEY);
});

test('review #10: capVolley holds MAX_VOLLEY after extra echoes are appended', () => {
  const s = compileShot('cockpit', [], null, 1)!;
  const big = { ...s, count: 20, twin: true, echoes: [...s.echoes, { delay: 0.3, mul: 0.6 }, { delay: 0.3, mul: 0.6 }] };
  const c = capVolley(big);
  expect(c.count * (1 + c.echoes.length) * (c.twin ? 2 : 1)).toBeLessThanOrEqual(MAX_VOLLEY);
  expect(c.count).toBeGreaterThanOrEqual(1);
  expect(capVolley(s)).toEqual(s);
});
