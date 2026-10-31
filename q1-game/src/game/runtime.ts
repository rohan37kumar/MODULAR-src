import type Phaser from 'phaser';
import type { EnemyKind, PartId, Payload, ShotSpec, SignatureId, TraitId } from '../core/types';

/** World pixels per ship grid cell. */
export const CELL = 26;
/** Collision radius of one ship cell. */
export const CELL_RADIUS = 12;
/** Largest enemy radius (Carrier); broad-phase queries pad by this. */
export const MAX_ENEMY_RADIUS = 40;

export const COLOURS = {
  player: 0x00e5ff,
  swarmRed: 0xff2d55,
  swarmMagenta: 0xff00c8,
  weapon: 0xffb000,
  modifier: 0xffffff,
  violet: 0xb388ff,
  utility: 0x39ff88,
  scrap: 0x39ff88,
  hurt: 0xff2d55,
} as const;

export const FONT = "Consolas, 'Courier New', monospace";

/** Who dealt the damage: lets kills be credited to a mount (mend, signatures). */
export interface DamageSrc {
  mountUid: number;
  /** The firing part, when known (cryo hits freeze; payload bolts keep their own id). */
  partId?: PartId;
  signatures: SignatureId[];
  effects?: TraitId[];
  /** Hook payloads this shot releases where it hits (addendum A§2.2). */
  payloads?: Payload[];
}

/** Timers are remaining milliseconds; 0 = inactive. */
export interface StatusState {
  charged: number;
  slow: number;
  slowMag: number;
  frozen: number;
  burn: number;
  burnDps: number;
  /** Cryo hits inside the current freeze window, and that window's remaining ms. */
  cryoHits: number;
  cryoWindow: number;
  /** Snag (Hook trait): stopped dead while > 0. */
  snared: number;
  /** Snag re-snare immunity (ms): a beam touching a Hook can't hold a target forever. */
  snareCd: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  contactDamage: number;
  /** ms until this enemy may deal contact damage again. */
  contactCd: number;
  /** ms of white hit flash left. */
  hitFlash: number;
  status: StatusState;
  /** Per-kind behaviour state (timers, phases, targets). Owned by EnemySystem. */
  ai: Record<string, number>;
  img: Phaser.GameObjects.Image;
}

export interface EnemyBullet {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  /** ms left before it expires. */
  life: number;
  /** Reflected by a Mirror: now hurts enemies instead of the ship. */
  reflected: boolean;
  img: Phaser.GameObjects.Image;
}

export interface Bolt {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  /** Enemies it may still pass through after the current hit. */
  pierceLeft: number;
  /** Remaining travel distance in px. */
  travel: number;
  spec: ShotSpec;
  src: DamageSrc;
  /** Enemy ids already hit (pierce never double-hits). */
  hit: Set<number>;
  colour: number;
  /** Free-form flags for line/trait behaviours (bounced, homing...). */
  flags: Record<string, number>;
  img: Phaser.GameObjects.Image;
}
