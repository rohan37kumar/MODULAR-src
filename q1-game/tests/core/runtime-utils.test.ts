import { expect, test } from 'vitest';
import { clampDt } from '../../src/core/math';
import { Pool } from '../../src/core/pool';
import { SpatialHash } from '../../src/core/spatialHash';

test('clampDt caps big frames', () => { expect(clampDt(1000)).toBe(50); expect(clampDt(16)).toBe(16); });
test('spatial hash finds only nearby objects', () => {
  const h = new SpatialHash<{ x: number; y: number }>(64); const a = { x: 10, y: 10 }, b = { x: 500, y: 500 };
  h.insert(a); h.insert(b); expect(h.query(0, 0, 30)).toEqual([a]);
});
test('pool never exceeds its cap', () => {
  const p = new Pool(3, () => ({})); const got = [p.acquire(), p.acquire(), p.acquire(), p.acquire()];
  expect(got[3]).toBeNull(); expect(p.active).toBe(3); p.release(got[0]!); expect(p.acquire()).not.toBeNull();
});

// Extra coverage.
test('spatial hash: query spans cell borders, negative coords, and clear empties it', () => {
  const h = new SpatialHash<{ x: number; y: number }>(64);
  const a = { x: -1, y: -1 }, b = { x: 63, y: 0 }, c = { x: 64, y: 0 };
  h.insert(a); h.insert(b); h.insert(c);
  expect(h.query(0, 0, 70).length).toBe(3);
  expect(h.query(-30, -30, 10)).toEqual([]);
  h.clear(); expect(h.query(0, 0, 200)).toEqual([]);
});
test('spatial hash query is a coarse cell filter that never misses objects inside the radius', () => {
  const h = new SpatialHash<{ x: number; y: number }>(64); const pts = [];
  for (let i = 0; i < 200; i++) { const p = { x: (i * 37) % 900 - 450, y: (i * 91) % 900 - 450 }; pts.push(p); h.insert(p); }
  const got = new Set(h.query(17, -23, 150));
  for (const p of pts) if (Math.hypot(p.x - 17, p.y + 23) <= 150) expect(got.has(p)).toBe(true);
});
test('pool reuses released objects and ignores double release', () => {
  let made = 0; const p = new Pool(2, () => ({ n: ++made }));
  const a = p.acquire()!; p.release(a); p.release(a); expect(p.active).toBe(0);
  expect(p.acquire()).toBe(a); expect(made).toBe(1);
});
