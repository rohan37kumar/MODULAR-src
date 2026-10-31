import { expect, test } from 'vitest';
import { budgetRate, DropPacer, SpawnDirector } from '../../src/core/director';
import { mulberry32, pick, range, type Rng } from '../../src/core/rng';
import { TUNING } from '../../src/data/tuning';
import type { PartId, SpawnEvent } from '../../src/core/types';

/** Steps `d.update(step)` until `ms`, tagging each event with the elapsed ms at that step. */
const run = (d: SpawnDirector, ms: number, step = 100): (SpawnEvent & { t: number })[] => {
  const out: (SpawnEvent & { t: number })[] = [];
  for (let t = step; t <= ms; t += step) for (const e of d.update(step)) out.push({ ...e, t });
  return out;
};

test('enemy mix unlocks on schedule', () => {
  const ev = run(new SpawnDirector(mulberry32(1)), 300_000);
  expect(ev.filter(e => e.kind === 'spitter' && e.t < 60_000)).toEqual([]);
  expect(ev.some(e => e.kind === 'spitter' && e.t < 120_000)).toBe(true);
  expect(ev.filter(e => e.kind === 'lancer' && e.t < 150_000)).toEqual([]);
  expect(ev.filter(e => e.kind === 'carrier' && e.t < 185_000)).toHaveLength(2);
});
test('pressure escalates and hp scales', () => {
  const ev = run(new SpawnDirector(mulberry32(2)), 300_000), n = (a: number, b: number) => ev.filter(e => e.t >= a && e.t < b).reduce((s, e) => s + e.count, 0);
  expect(n(240_000, 300_000)).toBeGreaterThan(n(0, 60_000) * 1.5);
  const d = new SpawnDirector(mulberry32(3)); expect(d.hpMul()).toBe(1); d.update(90_000); expect(d.hpMul()).toBeCloseTo(1.35);
});
test('a 60 s frame cannot flood the screen', () => {
  expect(new SpawnDirector(mulberry32(4)).update(60_000).length).toBeLessThanOrEqual(SpawnDirector.maxEventsPerUpdate);
});
test('seeded first run drops beam, mirror, pulse, bomb; pacing holds', () => {
  const p = new DropPacer(mulberry32(5), true); const parts: { t: number; id: PartId }[] = []; let forges: number[] = [];
  for (let t = 1000; t <= 600_000; t += 1000) for (const d of p.onKill('drone', t)) { if (d.type === 'part') parts.push({ t, id: d.part }); if (d.type === 'forge') forges.push(t); }
  expect(parts.slice(0, 4).map(x => x.id)).toEqual(['beam', 'mirror', 'pulse', 'bomb']);
  expect(parts[0].t).toBeGreaterThanOrEqual(12_000);
  for (let i = 1; i < parts.length; i++) { const gap = parts[i].t - parts[i - 1].t; expect(gap).toBeGreaterThanOrEqual(8_000); expect(gap).toBeLessThanOrEqual(21_000); }
  expect(forges[0]).toBe(75_000); expect(forges.length).toBeGreaterThanOrEqual(6); expect(forges.length).toBeLessThanOrEqual(10);
});
test('carrier kill drops 2–3 parts (both counts occur) and always a forge', () => {
  const seen = new Set<number>();
  for (let seed = 1; seed <= 40; seed++) {
    const d = new DropPacer(mulberry32(seed), false).onKill('carrier', 100_000);
    const n = d.filter(x => x.type === 'part').length; expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(3);
    expect(d.filter(x => x.type === 'forge')).toHaveLength(1);
    seen.add(n);
  }
  expect([...seen].sort()).toEqual([2, 3]);
});
test('unseeded: never the same part three times in a row; deterministic per seed', () => {
  const seq = (seed: number) => { const p = new DropPacer(mulberry32(seed), false); const out: PartId[] = []; for (let t = 1000; t < 900_000; t += 1000) for (const d of p.onKill('drone', t)) if (d.type === 'part') out.push(d.part); return out; };
  const a = seq(7); for (let i = 2; i < a.length; i++) expect(a[i] === a[i - 1] && a[i] === a[i - 2]).toBe(false);
  expect(seq(7)).toEqual(a);
});

// Extra coverage beyond the plan.
test('motes never drop parts; a Carrier always drops parts and a Forge Uplink', () => {
  const p = new DropPacer(mulberry32(8), false);
  for (let t = 1000; t <= 120_000; t += 500) {
    expect(p.onKill('mote', t).some(x => x.type === 'part')).toBe(false);
  }
  const haul = new DropPacer(mulberry32(8), false).onKill('carrier', 1000);
  expect(haul.some(x => x.type === 'part')).toBe(true);
  expect(haul).toContainEqual({ type: 'forge' });
});
test('mote packs are one event of 6–10; per-call cap holds every frame and carriers are never lost', () => {
  const d = new SpawnDirector(mulberry32(9)); let carriers = 0;
  for (let i = 0; i < 20; i++) {
    const ev = d.update(60_000); expect(ev.length).toBeLessThanOrEqual(SpawnDirector.maxEventsPerUpdate);
    for (const e of ev) { if (e.kind === 'mote') { expect(e.count).toBeGreaterThanOrEqual(6); expect(e.count).toBeLessThanOrEqual(10); } if (e.kind === 'carrier') carriers++; }
  }
  for (let i = 0; i < 10; i++) for (const e of d.update(100)) if (e.kind === 'carrier') carriers++;
  expect(carriers).toBe(Math.floor(1_200_000 / 90_000));
});
test('rng is deterministic and pick honours weights', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 50; i++) { const x = a(); expect(x).toBe(b()); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  const r = mulberry32(1); for (let i = 0; i < 100; i++) expect(pick(r, ['a', 'b', 'c'], [0, 1, 0])).toBe('b');
  for (let i = 0; i < 100; i++) { const v = range(r, 5, 7); expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThan(7); }
});
test('late surge: unchanged before surgeStartMs (5:00 after the addendum re-tune), then budget and hp grow faster than the linear ramp', () => {
  const S = TUNING.director.surgeStartMs;
  expect(S).toBe(300_000);
  const lin = (ms: number) => 0.5 + 0.6 * (ms / 60_000);
  expect(budgetRate(120_000)).toBeCloseTo(lin(120_000));
  expect(budgetRate(S)).toBeCloseTo(lin(S));
  expect(budgetRate(S + 240_000)).toBeGreaterThan(lin(S + 240_000) * 1.5);
  expect(budgetRate(S + 360_000) - budgetRate(S + 300_000)).toBeGreaterThan(budgetRate(S + 60_000) - budgetRate(S));
  const d = new SpawnDirector(mulberry32(9)); d.update(S); expect(d.hpMul()).toBeCloseTo(1 + 0.35 * (S / 90_000));
  d.update(240_000); expect(d.hpMul()).toBeGreaterThan(1 + 0.35 * ((S + 240_000) / 90_000) + 1.5);
});
test('the first drone kill after firstDropMs always drops a part', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const p = new DropPacer(mulberry32(seed), seed % 2 === 0);
    expect(p.onKill('drone', 11_000).some(d => d.type === 'part')).toBe(false);
    expect(p.onKill('mote', 12_500).some(d => d.type === 'part')).toBe(false);
    expect(p.onKill('drone', 12_600).some(d => d.type === 'part')).toBe(true);
  }
});

// Addendum Task 6: Shielders, Carrier phases.
/** A constant rng. 0.99 always picks the last open spawn kind, which is the Shielder once it unlocks. */
const k = (v: number): Rng => () => v;

test('no shielder spawns before 165 000 ms', () => {
  for (let seed = 1; seed <= 5; seed++) {
    expect(run(new SpawnDirector(mulberry32(seed)), 300_000).filter(e => e.kind === 'shielder' && e.t < 165_000)).toEqual([]);
  }
  const forced = run(new SpawnDirector(k(0.99)), 180_000).filter(e => e.kind === 'shielder');
  expect(forced.length).toBeGreaterThan(0);
  expect(Math.min(...forced.map(e => e.t))).toBeGreaterThanOrEqual(165_000);
});
test('shielder events have count 1 before 300 000 ms and 2 after', () => {
  const ev = [1, 2, 3].flatMap(seed => run(new SpawnDirector(mulberry32(seed)), 600_000)).filter(e => e.kind === 'shielder');
  const early = ev.filter(e => e.t < 300_000), late = ev.filter(e => e.t >= 300_000);
  expect(early.length).toBeGreaterThan(0); expect(late.length).toBeGreaterThan(0);
  for (const e of early) expect(e.count).toBe(1);
  for (const e of late) expect(e.count).toBe(2);
});
test('a shielder event costs 2.5 alone and 5 as a pair (budget spent matches budget accrued)', () => {
  // With rng 0.99 every budget event after 165 s is a Shielder, so spent = events × event cost,
  // and spent differs from accrued only by the leftover bank at each end (each under one event cost).
  const ev = run(new SpawnDirector(k(0.99)), 400_000);
  const accrued = (a: number, b: number) => { let s = 0; for (let t = a + 100; t <= b; t += 100) s += 0.1 * budgetRate(t - 50); return s; };
  const spent = (a: number, b: number, cost: number) => ev.filter(e => e.kind === 'shielder' && e.t > a && e.t <= b).length * cost;
  expect(Math.abs(spent(200_000, 290_000, 2.5) - accrued(200_000, 290_000))).toBeLessThan(2.5);
  expect(Math.abs(spent(310_000, 400_000, 5) - accrued(310_000, 400_000))).toBeLessThan(5);
});
test("'shielder' is a part dropper with chance partChance + 0.1", () => {
  expect(TUNING.drops.partDroppers).toContain('shielder');
  expect(TUNING.drops.partChanceBonus.shielder).toBe(0.1);
  // First kill at 13 s is the forced first part; the 22 s kill is inside the chance window (gap 9 s: past minGap, short of forcedGap).
  const drops = (r: number, kind: 'drone' | 'shielder') => {
    const p = new DropPacer(k(r), false); p.onKill('drone', 13_000);
    return p.onKill(kind, 22_000).some(d => d.type === 'part');
  };
  expect(drops(0.2, 'drone')).toBe(true);
  expect(drops(0.3, 'drone')).toBe(false);
  expect(drops(0.3, 'shielder')).toBe(true);
  expect(drops(0.36, 'shielder')).toBe(false);
});
test('DropPacer.onCarrierPhase drops exactly one part and resets the part gap', () => {
  const p = new DropPacer(k(0), false);
  const d = p.onCarrierPhase(50_000);
  expect(d).toHaveLength(1); expect(d[0].type).toBe('part');
  // Chance always passes at rng 0, so only the reset gap can block this kill.
  expect(p.onKill('drone', 55_000).some(x => x.type === 'part')).toBe(false);
  expect(p.onKill('drone', 58_000).some(x => x.type === 'part')).toBe(true);
  // The phase drop also spends the forced first part.
  const q = new DropPacer(k(0.99), false);
  expect(q.onCarrierPhase(13_000)).toHaveLength(1);
  expect(q.onKill('drone', 22_000).some(x => x.type === 'part')).toBe(false);
  expect(q.onKill('drone', 33_000).some(x => x.type === 'part')).toBe(true);
});
