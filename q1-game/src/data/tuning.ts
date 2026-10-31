import type { EnemyKind, PartId, ShotShape, TraitId } from '../core/types';

/** Every tunable number lives here. Starting points from design §10–12; tuned in Task 22. */

export interface WeaponTuning {
  shape: ShotShape;
  /** Per bolt, or per second for continuous shapes (beam, flame). */
  damage: number;
  /** Shots per second; 0 for continuous shapes. */
  fireRate: number;
  speed: number;
  range: number;
  width: number;
  /** Base pierce (Saw: blades pass through everything). */
  pierce?: number;
  /** Base effects every shot carries. */
  effects?: TraitId[];
}

const weapons: Partial<Record<PartId, WeaponTuning>> = {
  cockpit: { shape: 'bolt', damage: 6, fireRate: 4, speed: 520, range: 520, width: 3 },
  pulse: { shape: 'bolt', damage: 10, fireRate: 4, speed: 600, range: 600, width: 4 },
  beam: { shape: 'beam', damage: 30, fireRate: 0, speed: 0, range: 220, width: 6 },
  needle: { shape: 'bolt', damage: 6, fireRate: 5, speed: 700, range: 450, width: 2 },
  cryo: { shape: 'bolt', damage: 8, fireRate: 2, speed: 450, range: 450, width: 4 },
  thruster: { shape: 'flame', damage: 12, fireRate: 0, speed: 0, range: 60, width: 10 },
  /** Burst radius = width (70). */
  bomb: { shape: 'burst', damage: 40, fireRate: 1 / 3, speed: 260, range: 380, width: 70 },
  /** 3 hops within 160 px. */
  arc: { shape: 'chain', damage: 14, fireRate: 1 / 1.2, speed: 0, range: 160, width: 3 },
  /** Boomerang blade: out 4 cells, back to its exit point (design addendum A§1). */
  saw: { shape: 'bolt', damage: 12, fireRate: 1 / 1.2, speed: 380, range: 104, width: 8, pierce: 99, effects: ['boomerang'] },
};

/** Enemy kinds the spawn budget buys. Carriers are scheduled separately. */
export type BudgetKind = Exclude<EnemyKind, 'carrier'>;

/** Spawn director (design §12). */
const director = {
  /** Budget in cost units per second = budgetBase + budgetRamp × (t / budgetRampMs). */
  budgetBase: 0.5,
  budgetRamp: 0.6,
  budgetRampMs: 60_000,
  /** Unspent budget is banked, but never more than this many seconds' worth (stops a long frame flooding later frames). */
  bankCapSec: 3,
  /** Hard cap on spawn events returned by a single update. */
  maxEventsPerUpdate: 8,
  /** A Carrier spawns at every multiple of this, outside the budget. */
  carrierIntervalMs: 90_000,
  /** hpMul = 1 + hpRamp × (t / hpRampMs). */
  hpRamp: 0.35,
  hpRampMs: 90_000,
  /**
   * Late surge (Task 22): from surgeStartMs both ramps gain a quadratic term, k × (minutes past the start)².
   * A 30-part ship out-scales the linear ramp after ~4:00, so without this a run never ends.
   */
  surgeStartMs: 300_000,
  surgeBudget: 0.5,
  surgeHp: 0.25,
  /** A `mote` event is one pack of this many Motes (inclusive). */
  motePack: { min: 6, max: 10 },
  /** `cost` per event (a mote event is a whole pack), pick `weight`, and the elapsed time it unlocks at. */
  spawns: {
    drone: { cost: 1, weight: 50, unlockMs: 0 },
    mote: { cost: 2, weight: 30, unlockMs: 0 },
    spitter: { cost: 2, weight: 12, unlockMs: 60_000 },
    lancer: { cost: 2.5, weight: 8, unlockMs: 150_000 },
    /** Cost is per Shielder; a Shielder event costs cost × count (see `shielderGroup`). */
    shielder: { cost: 2.5, weight: 10, unlockMs: 165_000 },
  } satisfies Record<BudgetKind, { cost: number; weight: number; unlockMs: number }>,
  /** From `fromMs`, a Shielder event is a group of `count` (before it, a single Shielder). */
  shielderGroup: { fromMs: 300_000, count: 2 },
};

/** Drop pacing (design §12). */
const drops = {
  /** Only these kills can drop a part (Carriers have their own rule). */
  partDroppers: ['drone', 'spitter', 'lancer', 'shielder'] as EnemyKind[],
  partChance: 0.25,
  /** Added to `partChance` for these kinds (a Shielder is harder to kill, so it pays better). */
  partChanceBonus: { shielder: 0.1 } as Partial<Record<EnemyKind, number>>,
  /** After this long without a part drop, the next qualifying kill is forced to drop one. */
  forcedGapMs: 20_000,
  /** No part drop within this long of the previous one. */
  minGapMs: 8_000,
  /** No part drop before this point in the run. */
  firstDropMs: 12_000,
  familyWeights: { weapon: 45, modifier: 35, utility: 20 } as Record<'weapon' | 'modifier' | 'utility', number>,
  /** The same part may drop at most this many times in a row. */
  maxSameInARow: 2,
  /** Seeded first run (empty Archive): the first part drops, in order. */
  seededParts: ['beam', 'mirror', 'pulse', 'bomb'] as PartId[],
  /** Forge Uplink timer: random in [forgeMinMs, forgeMaxMs), reset after every forge drop. */
  forgeMinMs: 60_000,
  forgeMaxMs: 90_000,
  seededForgeMs: 75_000,
  /** Carrier kill: this many parts (inclusive), one forge, and a hull repair core with this chance. Each phase change also drops 1 part. */
  carrierParts: { min: 2, max: 3 },
  carrierRepairChance: 0.75,
};

/** Enemy behaviour timings (stats live in `ENEMIES`). */
const enemyAi = {
  spitter: { keepDistance: 260, fireIntervalMs: 2200, bulletSpeed: 160, bulletDamage: 8 },
  lancer: { telegraphMs: 700, dashSpeed: 600, dashMs: 500 },
};

export const TUNING = {
  weapons,
  director,
  drops,
  enemyAi,
};
