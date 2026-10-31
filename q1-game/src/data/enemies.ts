import type { EnemyKind } from '../core/types';

/** Base enemy stats (design §12; tuned in Task 22). Spitter/Lancer behaviour timings live in `TUNING.enemyAi`. */
export interface EnemyDef {
  hp: number;
  /** px per second. */
  speed: number;
  /** Collision radius in px. */
  radius: number;
  contactDamage: number;
  /** Salvage paid on kill. */
  scrap: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mote: { hp: 6, speed: 70, radius: 5, contactDamage: 4, scrap: 1 },
  drone: { hp: 18, speed: 110, radius: 9, contactDamage: 8, scrap: 2 },
  spitter: { hp: 30, speed: 80, radius: 11, contactDamage: 6, scrap: 3 },
  lancer: { hp: 40, speed: 90, radius: 12, contactDamage: 15, scrap: 3 },
  shielder: { hp: 40, speed: 95, radius: 10, contactDamage: 8, scrap: 3 },
  carrier: { hp: 600, speed: 45, radius: 40, contactDamage: 12, scrap: 20 },
};
