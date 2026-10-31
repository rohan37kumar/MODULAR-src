/**
 * Pure combat helpers for the design addendum: Shielder arcs, Carrier phases, Relay odds,
 * the camera zoom-out and a rate limiter. No Phaser; angles use the Math.atan2(dy, dx) convention.
 */

export type Pt = { x: number; y: number };

/** Shielder: a 120° front arc (±60°), turning at 120°/s, absorbing 3× the Shielder's max HP before it shatters. */
export const SHIELD_HALF_ARC = Math.PI / 3;
/** Radians per second. */
export const SHIELD_TURN = (2 * Math.PI) / 3;
export const SHIELD_ABSORB_MUL = 3;

/** Wraps an angle to [-π, π). */
const wrap = (a: number) => {
  const t = (a + Math.PI) % (2 * Math.PI);
  return (t < 0 ? t + 2 * Math.PI : t) - Math.PI;
};

/** Is the direction from `at` (the Shielder) toward `from` (the hit's source) within ±SHIELD_HALF_ARC of `facing`? Edges count as blocked. */
export function shieldBlocks(facing: number, at: Pt, from: Pt): boolean {
  const dir = Math.atan2(from.y - at.y, from.x - at.x);
  return Math.abs(wrap(dir - facing)) <= SHIELD_HALF_ARC;
}

/**
 * Resolves one hit on a Shielder. Hits with no source point (burn, blasts, arc chains, rings)
 * and hits after the shield has broken always land in full. A blocked hit drains the shield first;
 * any overflow past 0 reaches `hp`, and `broke` is true on the hit that empties it.
 */
export function shieldHit(
  shield: number, facing: number, at: Pt, amount: number, from?: Pt,
): { hp: number; shield: number; blocked: boolean; broke: boolean } {
  if (!from || shield <= 0 || !shieldBlocks(facing, at, from)) return { hp: amount, shield, blocked: false, broke: false };
  const absorbed = Math.min(shield, amount);
  const left = shield - absorbed;
  return { hp: amount - absorbed, shield: left, blocked: true, broke: left <= 0 };
}

/** Carrier phase from its HP fraction: 1 above 0.66, 2 above 0.33, else 3. The first Carrier has one threshold, 0.5, and stops at phase 2. */
export function carrierPhase(hpFrac: number, first: boolean): 1 | 2 | 3 {
  if (first) return hpFrac < 0.5 ? 2 : 1;
  return hpFrac < 0.33 ? 3 : hpFrac < 0.66 ? 2 : 1;
}

/** Every phase entered since `prev`, in order, so one huge hit that crosses two thresholds plays both transitions. Never goes back. */
export function phaseSteps(prev: 1 | 2 | 3, hpFrac: number, first: boolean): (2 | 3)[] {
  const target = carrierPhase(hpFrac, first);
  const out: (2 | 3)[] = [];
  for (let p = prev + 1; p <= target; p++) out.push(p as 2 | 3);
  return out;
}

/** Relay: about 6 cells, and a chain stops after this many hops. */
export const RELAY_RANGE = 156;
export const RELAY_MAX_HOPS = 8;

/** Chance that hop number `hop` (1-based) happens: 100%, 50%, 25%, … and 0 outside 1..RELAY_MAX_HOPS. */
export function relayChance(hop: number): number {
  if (!Number.isInteger(hop) || hop < 1 || hop > RELAY_MAX_HOPS) return 0;
  return 0.5 ** (hop - 1);
}

/** Camera view-scale multiplier: −5% per cell of ship extent beyond the cockpit (capped at 3, i.e. a full 7×7 → 0.85), ×0.95 while a Carrier is alive. */
export function shipZoomMul(extentCells: number, carrierAlive: boolean): number {
  const e = Number.isFinite(extentCells) ? Math.min(3, Math.max(0, extentCells)) : 0;
  return (1 - 0.05 * e) * (carrierAlive ? 0.95 : 1);
}

/** Allows at most `perSec` takes in any sliding 1 s span (e.g. caps Hook payload storms). */
export class RateLimiter {
  private readonly times: number[] = [];

  constructor(private readonly perSec: number) {}

  take(nowMs: number): boolean {
    while (this.times.length > 0 && this.times[0] <= nowMs - 1000) this.times.shift();
    if (this.times.length >= this.perSec) return false;
    this.times.push(nowMs);
    return true;
  }
}
