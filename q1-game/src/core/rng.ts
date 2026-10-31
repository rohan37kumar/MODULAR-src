/** A seeded random source returning floats in [0, 1). */
export type Rng = () => number;

/** Small, fast, deterministic PRNG (Tommy Ettinger's mulberry32). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [lo, hi). */
export function range(rng: Rng, lo: number, hi: number): number {
  return lo + (hi - lo) * rng();
}

/** An integer in [lo, hi], both inclusive. */
export function intRange(rng: Rng, lo: number, hi: number): number {
  return Math.min(hi, lo + Math.floor(rng() * (hi - lo + 1)));
}

/**
 * One item, uniformly or by `weights` (same length as `items`; non-positive weights never win).
 * Falls back to uniform if every weight is non-positive. Throws only on an empty list.
 */
export function pick<T>(rng: Rng, items: readonly T[], weights?: readonly number[]): T {
  if (items.length === 0) throw new RangeError('pick: empty list');
  if (weights) {
    let total = 0;
    for (let i = 0; i < items.length; i++) total += Math.max(0, weights[i] ?? 0);
    if (total > 0) {
      let r = rng() * total;
      let last = 0;
      for (let i = 0; i < items.length; i++) {
        const w = Math.max(0, weights[i] ?? 0);
        if (w <= 0) continue;
        last = i;
        if (r < w) return items[i];
        r -= w;
      }
      return items[last];
    }
  }
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}
