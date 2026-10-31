import { expect, test } from 'vitest';
import {
  carrierPhase, phaseSteps, RateLimiter, relayChance, RELAY_MAX_HOPS, RELAY_RANGE, SHIELD_ABSORB_MUL, SHIELD_HALF_ARC,
  SHIELD_TURN, shieldBlocks, shieldHit, shipZoomMul,
} from '../../src/core/combat';

const deg = (d: number) => (d * Math.PI) / 180;
/** A point 100 px from `at` in direction `d` degrees (atan2 convention: 0 = +x, 90 = +y). */
const toward = (d: number, at = { x: 0, y: 0 }) => ({ x: at.x + 100 * Math.cos(deg(d)), y: at.y + 100 * Math.sin(deg(d)) });

test('shield constants match the spec', () => {
  expect(SHIELD_HALF_ARC).toBeCloseTo(Math.PI / 3);
  expect(SHIELD_TURN).toBeCloseTo((2 * Math.PI) / 3);
  expect(SHIELD_ABSORB_MUL).toBe(3);
});
test('shieldBlocks: blocks at 0°, 59° and −59°; passes at 61°, 180° and 90°', () => {
  const at = { x: 0, y: 0 };
  for (const d of [0, 59, -59]) expect(shieldBlocks(0, at, toward(d)), `${d}°`).toBe(true);
  for (const d of [61, 180, 90]) expect(shieldBlocks(0, at, toward(d)), `${d}°`).toBe(false);
});
test('shieldBlocks wraps angles and works away from the origin', () => {
  const at = { x: 300, y: -40 };
  // Facing 170°, hit from −170°: 20° apart across the ±180° seam.
  expect(shieldBlocks(deg(170), at, toward(-170, at))).toBe(true);
  expect(shieldBlocks(deg(170), at, toward(100, at))).toBe(false);
  // Facing given as an unwrapped angle (2π + 90°).
  expect(shieldBlocks(2 * Math.PI + deg(90), at, toward(90 + 50, at))).toBe(true);
});
test('shieldHit with no source point deals full hp, even with a full shield (burn, blasts, rings)', () => {
  expect(shieldHit(120, 0, { x: 0, y: 0 }, 50)).toEqual({ hp: 50, shield: 120, blocked: false, broke: false });
});
test('shieldHit with shield 0 deals full hp', () => {
  expect(shieldHit(0, 0, { x: 0, y: 0 }, 50, toward(0))).toEqual({ hp: 50, shield: 0, blocked: false, broke: false });
});
test('a blocked hit of 50 against shield 120 is fully absorbed', () => {
  expect(shieldHit(120, 0, { x: 0, y: 0 }, 50, toward(10))).toEqual({ hp: 0, shield: 70, blocked: true, broke: false });
});
test('a blocked hit of 50 against shield 30 breaks it and the overflow passes to hp', () => {
  expect(shieldHit(30, 0, { x: 0, y: 0 }, 50, toward(-10))).toEqual({ hp: 20, shield: 0, blocked: true, broke: true });
});
test('a hit from outside the arc ignores the shield', () => {
  expect(shieldHit(120, 0, { x: 0, y: 0 }, 50, toward(120))).toEqual({ hp: 50, shield: 120, blocked: false, broke: false });
});

test('carrierPhase thresholds: 0.66 and 0.33, or a single 0.5 for the first Carrier', () => {
  expect(carrierPhase(1, false)).toBe(1);
  expect(carrierPhase(0.66, false)).toBe(1);
  expect(carrierPhase(0.659, false)).toBe(2);
  expect(carrierPhase(0.33, false)).toBe(2);
  expect(carrierPhase(0.329, false)).toBe(3);
  expect(carrierPhase(0, false)).toBe(3);
  expect(carrierPhase(0.5, true)).toBe(1);
  expect(carrierPhase(0.49, true)).toBe(2);
  expect(carrierPhase(0, true)).toBe(2);
});
test('phaseSteps lists every phase entered, in order (one hit can cross two thresholds)', () => {
  expect(phaseSteps(1, 0.2, false)).toEqual([2, 3]);
  expect(phaseSteps(1, 0.2, true)).toEqual([2]);
  expect(phaseSteps(2, 0.5, false)).toEqual([]);
  expect(phaseSteps(1, 0.5, false)).toEqual([2]);
  expect(phaseSteps(2, 0.1, false)).toEqual([3]);
  expect(phaseSteps(3, 0.9, false)).toEqual([]);
});

test('relayChance halves per hop and stops after RELAY_MAX_HOPS', () => {
  expect([relayChance(1), relayChance(2), relayChance(3)]).toEqual([1, 0.5, 0.25]);
  expect(relayChance(8)).toBeCloseTo(0.5 ** 7);
  expect(relayChance(9)).toBe(0);
  expect(RELAY_MAX_HOPS).toBe(8);
  expect(RELAY_RANGE).toBe(156);
});

test('shipZoomMul: 1 at a bare cockpit, 0.85 at full extent, ×0.95 with a Carrier alive', () => {
  expect(shipZoomMul(0, false)).toBe(1);
  expect(shipZoomMul(3, false)).toBeCloseTo(0.85);
  expect(shipZoomMul(3, true)).toBeCloseTo(0.8075);
  expect(shipZoomMul(10, false)).toBeCloseTo(0.85);
  expect(shipZoomMul(-2, false)).toBe(1);
});

test('RateLimiter(30): the 31st take inside 1 s fails, and take works again after 1 s', () => {
  const r = new RateLimiter(30);
  for (let i = 0; i < 30; i++) expect(r.take(i * 10), `take ${i + 1}`).toBe(true);
  expect(r.take(500)).toBe(false);
  expect(r.take(999)).toBe(false);
  expect(r.take(1000)).toBe(true);
});
