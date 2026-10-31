import { TUNING } from '../data/tuning';
import type { PartId, Route, ShotSpec, TraitId } from './types';

/** Upper bound on projectiles per trigger: count × (1 + echoes) × (twin ? 2 : 1). */
export const MAX_VOLLEY = 48;
/** Fallback when a trait has nothing to modify on a shape (design §9.2). */
const FALLBACK_MUL = 1.15;

const isBolt = (s: ShotSpec) => s.shape === 'bolt';
const isBoltOrBurst = (s: ShotSpec) => s.shape === 'bolt' || s.shape === 'burst';
const isContinuous = (s: ShotSpec) => s.shape === 'beam' || s.shape === 'ring' || s.shape === 'flame' || s.shape === 'lance';
/** Shapes that fire on a timer, so Overclock can speed them up. */
const isRated = (s: ShotSpec) => s.shape === 'bolt' || s.shape === 'burst' || s.shape === 'chain';
/** Overclock (addendum A§2.3): triple rate at half damage per shot; continuous shapes get the same 1.5× DPS. */
const OVERCLOCK = { rate: 3, damage: 0.5, continuous: 1.5 };

const withEffect = (s: ShotSpec, t: TraitId): ShotSpec => (s.effects.includes(t) ? s : { ...s, effects: [...s.effects, t] });
const boosted = (s: ShotSpec): ShotSpec => ({ ...s, damage: s.damage * FALLBACK_MUL });

/** The part's unmodified output, or null for parts that don't fire. */
export function baseShot(id: PartId): ShotSpec | null {
  const w = TUNING.weapons[id];
  if (!w) return null;
  return {
    shape: w.shape, damage: w.damage, count: 1, spreadDeg: 0, speed: w.speed, range: w.range, width: w.width,
    pierce: w.pierce ?? 0, fuse: 1, orbit: false, echoes: [], extraShards: 0, twin: false, effects: [...(w.effects ?? [])],
    power: 1, rateMul: 1,
  };
}

function applyTrait(s: ShotSpec, t: TraitId): ShotSpec {
  switch (t) {
    case 'focus':
      return { ...s, damage: s.damage * 1.2 };
    case 'pierce':
      return isBolt(s) ? { ...s, pierce: s.pierce + 1 } : { ...s, range: s.range * FALLBACK_MUL };
    case 'twin':
      return isBoltOrBurst(s) ? { ...s, twin: true } : boosted(s);
    case 'echo':
      return isBoltOrBurst(s) ? { ...s, echoes: [...s.echoes, { delay: 0.4, mul: 0.6 }] } : boosted(s);
    case 'split':
      return isBoltOrBurst(s) ? { ...s, extraShards: s.extraShards + 2 } : boosted(s);
    case 'shrapnel': case 'warhead': case 'bounce': case 'orbit': case 'pull':
      return isBoltOrBurst(s) ? withEffect(s, t) : boosted(s);
    case 'charge': case 'chill': case 'ignite': case 'harden': case 'mend': case 'snag':
      return withEffect(s, t);
    case 'boomerang':
      return isBolt(s) ? withEffect(s, t) : boosted(s);
    case 'relay':
      // Projectile weapons only, and no fallback: a Relay does nothing for a beam, bomb or arc.
      return isBolt(s) ? withEffect(s, t) : s;
    case 'overclock':
      if (s.effects.includes(t) || s.shape === 'flame') return s; // applied once; Thruster exhaust excluded
      if (isRated(s)) return withEffect({ ...s, rateMul: s.rateMul * OVERCLOCK.rate, damage: s.damage * OVERCLOCK.damage }, t);
      return withEffect({ ...s, damage: s.damage * OVERCLOCK.continuous }, t);
  }
}

/** Layer 1: received touch traits. Small, visible, never harmful. */
export function applyTraits(s: ShotSpec, traits: TraitId[]): ShotSpec {
  return traits.reduce(applyTrait, s);
}

/** Layer 2: one line modifier transforming a shot passing through it. */
export function applyModifier(s: ShotSpec, id: PartId): ShotSpec {
  const bolt = isBolt(s);
  const cont = isContinuous(s);
  switch (id) {
    case 'lens':
      if (bolt) {
        return s.count >= 3
          ? { ...s, count: 1, damage: s.damage * s.count * 1.33, pierce: 99, width: s.width * 2 }
          : { ...s, fuse: s.fuse * 3, damage: s.damage * 4, pierce: 99, width: s.width * 2, speed: s.speed * 0.7 };
      }
      if (s.shape === 'beam') return { ...s, width: s.width * 0.5, damage: s.damage * 2, range: s.range * 1.5 };
      if (s.shape === 'flame') return { ...s, shape: 'lance', range: s.range * 3, damage: s.damage * 3 };
      if (s.shape === 'ring' || s.shape === 'lance') return { ...s, damage: s.damage * 1.5 };
      return s;
    case 'orbit':
      if (bolt) return { ...s, orbit: true };
      if (s.shape === 'beam' || s.shape === 'flame') return { ...s, shape: 'ring', range: 90 };
      return s;
    case 'prism':
      return bolt || cont ? { ...s, count: s.count * 3, spreadDeg: s.spreadDeg + 30, damage: s.damage * 0.6 } : s;
    case 'echo':
      if (bolt) return { ...s, echoes: [...s.echoes, { delay: 0.25, mul: 1 }] };
      if (cont) return { ...s, damage: s.damage * 1.6, width: s.width * 1.3 };
      return s;
    default:
      // Mirrors are handled by the router; non-modifiers are transparent.
      return s;
  }
}

/**
 * base → traits → each route step in order → route damage × signature power → volley cap.
 * Returns a fresh object; inputs are never mutated.
 */
export function compileShot(id: PartId, traits: TraitId[], route: Route | null, power: number): ShotSpec | null {
  const base = baseShot(id);
  if (!base) return null;
  let s = applyTraits(base, traits);
  for (const step of route?.steps ?? []) s = applyModifier(s, step.partId);
  s = { ...s, damage: s.damage * (route?.damageMul ?? 1) * power, power };
  return capVolley(s);
}

/** Trims `count` so one trigger never exceeds MAX_VOLLEY bolts (also applied after runtime extras such as the cockpit's echoes). */
export function capVolley(s: ShotSpec): ShotSpec {
  const perShot = (1 + s.echoes.length) * (s.twin ? 2 : 1);
  return s.count * perShot > MAX_VOLLEY ? { ...s, count: Math.max(1, Math.floor(MAX_VOLLEY / perShot)) } : s;
}
