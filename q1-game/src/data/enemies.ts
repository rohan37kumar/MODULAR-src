import type { EnemyKind } from '../core/types';

/** Base enemy stats (design §12; tuned in Task 22). Spitter/Lancer behaviour timings live in `TUNING.enemyAi`. */
export interface EnemyDef {
  hp: number;
  /** px per second. */
  speed: number;
  /** Collision radius in px. */
  radius: number;
  contactDamage: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mote: { hp: 6, speed: 70, radius: 5, contactDamage: 4 },
  drone: { hp: 18, speed: 110, radius: 9, contactDamage: 8 },
  spitter: { hp: 30, speed: 80, radius: 11, contactDamage: 6 },
  lancer: { hp: 40, speed: 90, radius: 12, contactDamage: 15 },
  shielder: { hp: 40, speed: 95, radius: 10, contactDamage: 8 },
  carrier: { hp: 600, speed: 45, radius: 40, contactDamage: 12 },
};
