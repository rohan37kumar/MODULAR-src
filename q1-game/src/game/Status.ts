import type { Enemy, StatusState } from './runtime';

export type StatusKind = 'charged' | 'slow' | 'frozen' | 'burn' | 'snared';

/** Cryo: the 3rd hit inside this window freezes. */
const CRYO_WINDOW_MS = 2000;
const FREEZE_MS = 1500;
/** Snag: a 300 ms stop, then 1 s before the same target can be snagged again. */
const SNARE_MS = 300;
const SNARE_IMMUNE_MS = 1000;

/** Enemy status effects (design §10): pure state on the enemy, ticked by EnemySystem. */
export const Status = {
  fresh(): StatusState {
    return { charged: 0, slow: 0, slowMag: 0, frozen: 0, burn: 0, burnDps: 0, cryoHits: 0, cryoWindow: 0, snared: 0, snareCd: 0 };
  },

  /** `magnitude`: slow fraction (0.4 = −40%) or burn damage per second. Re-applying refreshes, never shortens. */
  apply(e: Enemy, kind: StatusKind, durationMs: number, magnitude = 0): void {
    const s = e.status;
    if (kind === 'slow') {
      s.slow = Math.max(s.slow, durationMs);
      s.slowMag = Math.max(s.slowMag, magnitude || 0.4);
    } else if (kind === 'burn') {
      s.burn = Math.max(s.burn, durationMs);
      s.burnDps = Math.max(s.burnDps, magnitude || 4);
    } else {
      s[kind] = Math.max(s[kind], durationMs);
    }
  },

  is(e: Enemy, kind: StatusKind): boolean {
    return e.status[kind] > 0;
  },

  /** A cryo hit: slows, and the 3rd hit inside 2 s freezes for 1.5 s. Returns true when it froze. */
  cryoHit(e: Enemy): boolean {
    const s = e.status;
    Status.apply(e, 'slow', 2000, 0.4);
    if (s.cryoWindow <= 0) s.cryoHits = 0;
    s.cryoHits++;
    s.cryoWindow = CRYO_WINDOW_MS;
    if (s.cryoHits >= 3) {
      s.cryoHits = 0;
      Status.apply(e, 'frozen', FREEZE_MS);
      return true;
    }
    return false;
  },

  /** Snag (A§2.2): stops the target's movement for SNARE_MS, then it can't be snared again for SNARE_IMMUNE_MS. Returns true when it took. */
  snag(e: Enemy): boolean {
    const s = e.status;
    if (s.snareCd > 0) return false;
    s.snared = SNARE_MS;
    s.snareCd = SNARE_IMMUNE_MS;
    return true;
  },

  /** Movement multiplier from slow/frozen/snared. */
  speedMul(e: Enemy): number {
    const s = e.status;
    if (s.frozen > 0 || s.snared > 0) return 0;
    return s.slow > 0 ? 1 - s.slowMag : 1;
  },

  /** Advances timers; returns burn damage dealt this step. */
  tick(e: Enemy, dtMs: number): number {
    const s = e.status;
    const burnDmg = s.burn > 0 ? (s.burnDps * Math.min(dtMs, s.burn)) / 1000 : 0;
    s.charged = Math.max(0, s.charged - dtMs);
    s.slow = Math.max(0, s.slow - dtMs);
    if (s.slow === 0) s.slowMag = 0;
    s.frozen = Math.max(0, s.frozen - dtMs);
    s.snared = Math.max(0, s.snared - dtMs);
    s.snareCd = Math.max(0, s.snareCd - dtMs);
    s.burn = Math.max(0, s.burn - dtMs);
    if (s.burn === 0) s.burnDps = 0;
    s.cryoWindow = Math.max(0, s.cryoWindow - dtMs);
    return burnDmg;
  },

  /** Tint for the current state (frozen > burn > charged > slow), or null for the base colour. */
  tint(e: Enemy, timeMs: number): number | null {
    const s = e.status;
    if (s.frozen > 0) return 0xd8f6ff;
    if (s.burn > 0 && Math.floor(timeMs / 80) % 2 === 0) return 0xff8a1f;
    if (s.charged > 0) return Math.floor(timeMs / 60) % 3 === 0 ? 0xffffff : 0x00e5ff;
    if (s.slow > 0) return 0x5aa9ff;
    return null;
  },
};
