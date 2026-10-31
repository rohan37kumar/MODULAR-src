import type Phaser from 'phaser';
import { phaseSteps, SHIELD_ABSORB_MUL, SHIELD_HALF_ARC, SHIELD_TURN, shieldHit } from '../core/combat';
import { Pool } from '../core/pool';
import { SpatialHash } from '../core/spatialHash';
import type { EnemyKind, SpawnEvent } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { TUNING } from '../data/tuning';
import type { GameScene } from '../scenes/GameScene';
import { Audio } from './Audio';
import { COLOURS, FONT, type DamageSrc, type Enemy, type EnemyBullet } from './runtime';
import { Status } from './Status';

export const MAX_ENEMIES = 300;
/** One P2 Carrier keeps ~120 bullets alive; two plus late Spitters overflowed 200 and silently dropped shots. */
export const MAX_ENEMY_BULLETS = 400;

/** Lancers stop chasing and start their telegraph inside this range (px). */
const LANCER_ENGAGE_RANGE = 300;
/** Lancer cool-down after a dash (ms), drifting slowly. */
const LANCER_REST_MS = 1500;
/** Rest drift as a fraction of the lancer's chase speed. */
const LANCER_REST_DRIFT = 0.25;
/** Spitters fire only within this multiple of keepDistance. */
const SPITTER_FIRE_RANGE_MUL = 1.6;
/** How far ahead (radians) around the orbit a spitter aims, so it drifts instead of parking. */
const SPITTER_ORBIT_LEAD = 0.35;

/** Carrier warning shown before it arrives (ms). */
const CARRIER_WARNING_MS = 2000;
/** Body rotation (rad/s). */
const CARRIER_SPIN = 0.35;
/** Turret points: count and distance from the centre (px). */
const CARRIER_TURRETS = 4;
const CARRIER_TURRET_R = 34;
/** Each turret fires a spread at this cadence (ms); the first volley comes sooner. */
const CARRIER_VOLLEY_MS = 3000;
/** The run's first Carrier fires less often: it is the first real threat, met at ~1:30 with a 3–5 part ship (Task 22). */
const FIRST_CARRIER_VOLLEY_MS = 6000;
const CARRIER_FIRST_VOLLEY_MS = 1500;
const CARRIER_SPREAD = (12 * Math.PI) / 180;
const CARRIER_BULLET_SPEED = 130;
const CARRIER_BULLET_DAMAGE = 5;
/** Health bar size and gap above the hull (px). */
const CARRIER_BAR_W = 80;
const CARRIER_BAR_H = 6;
const CARRIER_BAR_GAP = 14;

/** Carrier phases (design addendum §5). Hitbox radius per phase: the outer ring, then the shell, blow off. */
const CARRIER_RADII = [40, 32, 24] as const;
const CARRIER_PHASE_TEXTURE = ['enemy-carrier', 'enemy-carrier-2', 'enemy-carrier-3'] as const;
/** Phase-change shockwave: non-Carriers within this range are pushed outward this far (px). No damage. */
const CARRIER_SHOCK_R = 180;
const CARRIER_SHOCK_PUSH = 70;
/** Debris pieces flung off when the outer ring blows off. */
const CARRIER_DEBRIS = 12;
/** P2: a rotating 360° spiral from the core instead of aimed volleys; the run's first Carrier fires a sparser one. */
const CARRIER_SPIRAL_ARMS = 4;
const FIRST_CARRIER_SPIRAL_ARMS = 2;
const CARRIER_SPIRAL_MS = 320;
const FIRST_CARRIER_SPIRAL_MS = 520;
/** Arm (and body) rotation in P2 (rad/s). */
const CARRIER_SPIRAL_SPIN = 1.4;
const CARRIER_SPIRAL_SPEED = 110;
const CARRIER_SPIRAL_DAMAGE = 5;
/** Spiral bullets leave the core this far out (px). */
const CARRIER_SPIRAL_R = 14;
/** P3: faster drift, a telegraphed charge every CARRIER_CHARGE_EVERY_MS, and an aimed fan. */
const CARRIER_P3_SPEED_MUL = 1.8;
const CARRIER_CHARGE_EVERY_MS = 4000;
const CARRIER_CHARGE_TELEGRAPH_MS = 700;
const CARRIER_CHARGE_SPEED = 500;
const CARRIER_CHARGE_MS = 600;
const CARRIER_FAN_MS = 1800;
const CARRIER_FAN_BULLETS = 5;
const CARRIER_FAN_HALF = (24 * Math.PI) / 180;
const CARRIER_FAN_SPEED = 150;
const CARRIER_FAN_DAMAGE = 5;
/** After a phase change the new attack starts this late, so the flash and callout read first (ms). The first P3 charge comes at half the cycle. */
const CARRIER_PHASE_GRACE_MS = 400;

/** P3 charge states (stored in `e.ai.cState`). */
const C_DRIFT = 0;
const C_TELEGRAPH = 1;
const C_CHARGE = 2;

/** Enemy bullets this far from the ship expire (px). */
const BULLET_MAX_DIST = 1400;
/** Non-carriers this far behind the ship (per axis) despawn; the director replaces them. */
const DESPAWN_DIST = 2600;

/** Shielder arc (A§4): drawn this far outside the body, in this many segments; blocked-hit tinks at most this often. */
const SHIELD_GAP = 5;
const SHIELD_SEGS = 12;
const SHIELD_COLOUR = 0xe0ffff;
const TINK_GAP_MS = 80;

/** Lancer states (stored in `e.ai.state`). */
const L_CHASE = 0;
const L_TELEGRAPH = 1;
const L_DASH = 2;
const L_REST = 3;

const TEXTURE: Record<EnemyKind, string> = {
  mote: 'enemy-mote', drone: 'enemy-drone', spitter: 'enemy-spitter', lancer: 'enemy-lancer', carrier: 'enemy-carrier',
  // Drawn in Task 10 (addendum); the drone texture stands in until then.
  shielder: 'enemy-shielder',
};
export const BASE_TINT: Record<EnemyKind, number> = {
  mote: COLOURS.swarmRed, drone: COLOURS.swarmRed, spitter: COLOURS.swarmMagenta, lancer: COLOURS.swarmMagenta, carrier: COLOURS.swarmRed,
  shielder: 0x9ef0ff,
};

/** A Carrier announced by the warning indicator; it spawns when `left` reaches 0. */
interface PendingCarrier {
  left: number;
  angle: number;
  hpMul: number;
}

/**
 * The swarm: pooled enemies and enemy bullets, their behaviours, statuses and damage.
 * Emits on the scene's event bus: 'enemy-killed' (enemy, src), then 'carrier-killed' (enemy) for Carriers,
 * and 'carrier-phase' (enemy, phase) each time a Carrier enters phase 2 or 3.
 */
export class EnemySystem {
  /** Alive enemies (order not stable). */
  readonly list: Enemy[] = [];
  /** Alive enemy bullets. */
  readonly bullets: EnemyBullet[] = [];
  /** Rebuilt every update; positions of alive enemies. */
  readonly hash = new SpatialHash<Enemy>(64);

  private readonly pool: Pool<Enemy>;
  private readonly bulletPool: Pool<EnemyBullet>;
  private nextId = 1;
  private carriersSpawned = 0;
  /** Carriers announced but not yet arrived (never dropped, even at the cap). */
  private readonly pending: PendingCarrier[] = [];
  /** One overlay for telegraphs, Carrier bars and turrets, and the arrival warning. */
  private readonly gfx: Phaser.GameObjects.Graphics;
  private shieldersSpawned = 0;
  private lastTink = -1e9;
  private readonly warnText: Phaser.GameObjects.Text;

  constructor(private readonly scene: GameScene) {
    this.pool = new Pool<Enemy>(MAX_ENEMIES, () => {
      const img = scene.add.image(0, 0, TEXTURE.drone).setVisible(false).setActive(false).setDepth(10);
      return {
        id: 0, kind: 'drone', alive: false, x: 0, y: 0, vx: 0, vy: 0, hp: 0, maxHp: 0, radius: 0, speed: 0,
        contactDamage: 0, contactCd: 0, hitFlash: 0, status: Status.fresh(), ai: {}, img,
      };
    });
    this.bulletPool = new Pool<EnemyBullet>(MAX_ENEMY_BULLETS, () => ({
      alive: false, x: 0, y: 0, vx: 0, vy: 0, damage: 0, life: 0, reflected: false,
      img: scene.add.image(0, 0, 'ebullet').setVisible(false).setDepth(12),
    }));
    this.gfx = scene.add.graphics().setDepth(11);
    this.warnText = scene.add
      .text(0, 0, 'CARRIER', { fontFamily: FONT, fontSize: '14px', color: '#ff2d55' })
      .setOrigin(0.5)
      .setDepth(11)
      .setVisible(false);
  }

  /** Spawn-ring radius: just outside the visible area. */
  private ringRadius(): number {
    const cam = this.scene.cameras.main;
    return (1.2 * 0.5 * Math.hypot(cam.width, cam.height)) / cam.zoom;
  }

  /**
   * Places a director event on a ring just outside the visible area.
   * Carriers are announced first and arrive CARRIER_WARNING_MS later; other events are skipped at the cap.
   */
  spawnEvent(ev: SpawnEvent, hpMul: number): void {
    if (ev.kind === 'carrier') {
      for (let i = 0; i < ev.count; i++) {
        this.pending.push({ left: CARRIER_WARNING_MS, angle: Math.random() * Math.PI * 2, hpMul });
      }
      return;
    }
    if (this.list.length >= MAX_ENEMIES) return;
    const ship = this.scene.ship;
    const ring = this.ringRadius();
    const a = Math.random() * Math.PI * 2;
    const cx = ship.x + Math.cos(a) * ring;
    const cy = ship.y + Math.sin(a) * ring;
    // Packs spawn clustered around the ring point.
    const jitter = ev.count > 1 ? 40 : 0;
    for (let i = 0; i < ev.count; i++) {
      if (!this.spawn(ev.kind, cx + (Math.random() - 0.5) * jitter * 2, cy + (Math.random() - 0.5) * jitter * 2, hpMul)) break;
    }
  }

  spawn(kind: EnemyKind, x: number, y: number, hpMul: number): Enemy | null {
    const e = this.pool.acquire();
    if (!e) return null;
    const def = ENEMIES[kind];
    e.id = this.nextId++;
    e.kind = kind;
    e.alive = true;
    e.x = x;
    e.y = y;
    e.vx = 0;
    e.vy = 0;
    e.maxHp = e.hp = def.hp * hpMul;
    e.radius = def.radius;
    e.speed = def.speed * (0.9 + Math.random() * 0.2);
    e.contactDamage = def.contactDamage;
    e.contactCd = 0;
    e.hitFlash = 0;
    e.status = Status.fresh();
    e.ai = {};
    if (kind === 'carrier') {
      // Fresh ai, def radius and base texture above reset a pooled Carrier's phase; the run's first one plays P1 → P2 only.
      e.ai.phase = 1;
      if (++this.carriersSpawned === 1) e.ai.first = 1;
    }
    if (kind === 'shielder') {
      // Spawns already facing the ship; the shield soaks 3× max HP before it shatters (A§4).
      const ship = this.scene.ship;
      e.ai.facing = Math.atan2(ship.y - y, ship.x - x);
      e.ai.shield = e.ai.shieldMax = e.maxHp * SHIELD_ABSORB_MUL;
      if (++this.shieldersSpawned === 1) this.scene.fx.toast('SHIELDED CONTACT', BASE_TINT.shielder);
    }
    e.img.setTexture(TEXTURE[kind]).setPosition(x, y).setVisible(true).setActive(true).setTint(BASE_TINT[kind]).setAlpha(1).setRotation(0);
    this.list.push(e);
    return e;
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    const now = this.scene.timeMs;
    const ship = this.scene.ship;
    const g = this.gfx;
    g.clear();

    this.updatePending(dtMs);

    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      const burn = Status.tick(e, dtMs);
      if (burn > 0) this.damage(e, burn, { mountUid: -1, signatures: [] }, false);
      if (!e.alive) continue;
      e.contactCd = Math.max(0, e.contactCd - dtMs);
      e.hitFlash = Math.max(0, e.hitFlash - dtMs);
      this.behave(e, dtMs);
      const mul = Status.speedMul(e);
      e.x += e.vx * mul * dt;
      e.y += e.vy * mul * dt;
      // Despawn stragglers far behind the ship; the director replaces them. Carriers never despawn.
      if (e.kind !== 'carrier' && (Math.abs(e.x - ship.x) > DESPAWN_DIST || Math.abs(e.y - ship.y) > DESPAWN_DIST)) {
        this.remove(e);
        continue;
      }
      const tint = e.hitFlash > 0 ? 0xffffff : Status.tint(e, now) ?? BASE_TINT[e.kind];
      e.img.setPosition(e.x, e.y).setTint(tint);
      if (e.kind === 'carrier') {
        e.img.setRotation(e.ai.rot);
        this.drawCarrier(e);
      } else if (e.kind === 'shielder') {
        e.img.setRotation(e.ai.facing + Math.PI / 2);
        this.drawShield(e);
      } else if (e.kind === 'lancer' && e.ai.state === L_TELEGRAPH) {
        // Face the locked dash direction while winding up.
        e.img.setRotation(Math.atan2(e.ai.dy, e.ai.dx) + Math.PI / 2);
        const cfg = TUNING.enemyAi.lancer;
        this.drawTelegraph(e, (cfg.dashSpeed * cfg.dashMs) / 1000, cfg.telegraphMs);
      } else if (e.kind !== 'mote' && (e.vx !== 0 || e.vy !== 0)) {
        e.img.setRotation(Math.atan2(e.vy, e.vx) + Math.PI / 2);
      }
    }

    const maxD2 = BULLET_MAX_DIST * BULLET_MAX_DIST;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dtMs;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || (b.x - ship.x) ** 2 + (b.y - ship.y) ** 2 > maxD2) {
        this.removeBullet(b);
        continue;
      }
      b.img.setPosition(b.x, b.y);
    }

    this.drawWarnings();

    this.hash.clear();
    for (const e of this.list) this.hash.insert(e);
  }

  /** Counts down announced Carriers and lands them on the ring around the ship's current position. */
  private updatePending(dtMs: number): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.left -= dtMs;
      if (p.left > 0) continue;
      this.pending[i] = this.pending[this.pending.length - 1];
      this.pending.pop();
      if (this.list.length >= MAX_ENEMIES) this.makeRoom();
      const ship = this.scene.ship;
      const ring = this.ringRadius();
      this.spawn('carrier', ship.x + Math.cos(p.angle) * ring, ship.y + Math.sin(p.angle) * ring, p.hpMul);
    }
  }

  /** Frees one pool slot for a Carrier: the farthest Mote, or failing that the farthest non-Carrier. */
  private makeRoom(): void {
    const ship = this.scene.ship;
    let mote: Enemy | null = null;
    let moteD = -1;
    let other: Enemy | null = null;
    let otherD = -1;
    for (const e of this.list) {
      if (e.kind === 'carrier') continue;
      const d = (e.x - ship.x) ** 2 + (e.y - ship.y) ** 2;
      if (e.kind === 'mote') {
        if (d > moteD) {
          moteD = d;
          mote = e;
        }
      } else if (d > otherD) {
        otherD = d;
        other = e;
      }
    }
    const victim = mote ?? other;
    if (victim) this.remove(victim);
  }

  /** Per-kind movement and attacks: sets e.vx / e.vy (px/s). Timers use dtMs so slow-mo and timeScale apply. */
  private behave(e: Enemy, dtMs: number): void {
    const ship = this.scene.ship;
    const dx = ship.x - e.x, dy = ship.y - e.y;
    const dist = Math.hypot(dx, dy);
    const d = dist || 1;
    // Only a freeze stops attacks and timers; a snag (speed 0) stops movement alone.
    const frozen = e.status.frozen > 0;
    switch (e.kind) {
      case 'mote': {
        // Packs drift: a slow homing pull with a little wobble.
        const wob = Math.sin((this.scene.timeMs + e.id * 397) / 400) * 0.35;
        const a = Math.atan2(dy, dx) + wob;
        e.vx = Math.cos(a) * e.speed;
        e.vy = Math.sin(a) * e.speed;
        break;
      }
      case 'spitter':
        this.behaveSpitter(e, dtMs, dx, dy, dist, frozen);
        break;
      case 'lancer':
        this.behaveLancer(e, dtMs, dx, dy, d, frozen);
        break;
      case 'carrier':
        this.behaveCarrier(e, dtMs, dx, dy, d, frozen);
        break;
      case 'shielder': {
        // Chases like a Drone; the shield swings toward the ship at SHIELD_TURN (slowed by chill, stopped by freeze/snag).
        e.vx = (dx / d) * e.speed;
        e.vy = (dy / d) * e.speed;
        const want = Math.atan2(dy, dx);
        const diff = Math.atan2(Math.sin(want - e.ai.facing), Math.cos(want - e.ai.facing));
        const max = SHIELD_TURN * (dtMs / 1000) * Status.speedMul(e);
        e.ai.facing += Math.max(-max, Math.min(max, diff));
        break;
      }
      default:
        // Drones chase.
        e.vx = (dx / d) * e.speed;
        e.vy = (dy / d) * e.speed;
    }
  }

  /** Approaches, then orbits on a keepDistance circle around the ship, firing on a fixed cadence. */
  private behaveSpitter(e: Enemy, dtMs: number, dx: number, dy: number, dist: number, frozen: boolean): void {
    const cfg = TUNING.enemyAi.spitter;
    const ai = e.ai;
    if (ai.fireT === undefined) {
      ai.fireT = Math.random() * cfg.fireIntervalMs;
      ai.orbitDir = Math.random() < 0.5 ? -1 : 1;
    }
    // Aim for a point slightly ahead on the orbit circle: far away this is ~straight in; close, it circles.
    const ship = this.scene.ship;
    const theta = Math.atan2(-dy, -dx) + ai.orbitDir * SPITTER_ORBIT_LEAD;
    const tx = ship.x + Math.cos(theta) * cfg.keepDistance - e.x;
    const ty = ship.y + Math.sin(theta) * cfg.keepDistance - e.y;
    const td = Math.hypot(tx, ty);
    if (td > 1) {
      e.vx = (tx / td) * e.speed;
      e.vy = (ty / td) * e.speed;
    } else {
      e.vx = e.vy = 0;
    }
    if (frozen) return;
    ai.fireT -= dtMs;
    if (ai.fireT <= 0) {
      ai.fireT += cfg.fireIntervalMs;
      if (dist <= cfg.keepDistance * SPITTER_FIRE_RANGE_MUL) {
        this.fireBullet(e.x, e.y, Math.atan2(dy, dx), cfg.bulletSpeed, cfg.bulletDamage);
      }
    }
  }

  /** chase → telegraph (stop, lock direction) → dash → rest → chase. Frozen pauses every timer. */
  private behaveLancer(e: Enemy, dtMs: number, dx: number, dy: number, d: number, frozen: boolean): void {
    const cfg = TUNING.enemyAi.lancer;
    const ai = e.ai;
    if (ai.state === undefined) {
      ai.state = L_CHASE;
      ai.t = 0;
      ai.dx = 0;
      ai.dy = 1;
    }
    if (!frozen && ai.state !== L_CHASE) ai.t -= dtMs;
    switch (ai.state) {
      case L_CHASE:
        e.vx = (dx / d) * e.speed;
        e.vy = (dy / d) * e.speed;
        if (!frozen && d <= LANCER_ENGAGE_RANGE) {
          if (dx === 0 && dy === 0) {
            const a = Math.random() * Math.PI * 2;
            ai.dx = Math.cos(a);
            ai.dy = Math.sin(a);
          } else {
            ai.dx = dx / d;
            ai.dy = dy / d;
          }
          ai.state = L_TELEGRAPH;
          ai.t = cfg.telegraphMs;
          e.vx = e.vy = 0;
        }
        break;
      case L_TELEGRAPH:
        e.vx = e.vy = 0;
        if (ai.t <= 0) {
          ai.state = L_DASH;
          ai.t = cfg.dashMs;
        }
        break;
      case L_DASH:
        e.vx = ai.dx * cfg.dashSpeed;
        e.vy = ai.dy * cfg.dashSpeed;
        if (ai.t <= 0) {
          ai.state = L_REST;
          ai.t = LANCER_REST_MS;
        }
        break;
      default:
        // Rest: coast slowly along the dash line.
        e.vx = ai.dx * e.speed * LANCER_REST_DRIFT;
        e.vy = ai.dy * e.speed * LANCER_REST_DRIFT;
        if (ai.t <= 0) ai.state = L_CHASE;
    }
  }

  /**
   * P1: drifts toward the ship, spins, and fires a 3-bullet spread from each turret every volley.
   * P2: no aimed shots; a rotating 360° spiral from the core. P3: faster, telegraphed charges and an aimed fan.
   */
  private behaveCarrier(e: Enemy, dtMs: number, dx: number, dy: number, d: number, frozen: boolean): void {
    const ai = e.ai;
    if (ai.rot === undefined) {
      ai.rot = Math.random() * Math.PI * 2;
      ai.fireT = CARRIER_FIRST_VOLLEY_MS;
      ai.volleyMs = ai.first ? FIRST_CARRIER_VOLLEY_MS : CARRIER_VOLLEY_MS;
    }
    if (ai.phase === 2) return this.behaveCarrierP2(e, dtMs, dx, dy, d, frozen);
    if (ai.phase === 3) return this.behaveCarrierP3(e, dtMs, dx, dy, d, frozen);
    e.vx = (dx / d) * e.speed;
    e.vy = (dy / d) * e.speed;
    if (frozen) return;
    ai.rot += (CARRIER_SPIN * Status.speedMul(e) * dtMs) / 1000;
    ai.fireT -= dtMs;
    if (ai.fireT > 0) return;
    ai.fireT += ai.volleyMs;
    const ship = this.scene.ship;
    for (let k = 0; k < CARRIER_TURRETS; k++) {
      const ta = ai.rot + (k * Math.PI * 2) / CARRIER_TURRETS;
      const tx = e.x + Math.cos(ta) * CARRIER_TURRET_R;
      const ty = e.y + Math.sin(ta) * CARRIER_TURRET_R;
      const aim = Math.atan2(ship.y - ty, ship.x - tx);
      for (let s = -1; s <= 1; s++) this.fireBullet(tx, ty, aim + s * CARRIER_SPREAD, CARRIER_BULLET_SPEED, CARRIER_BULLET_DAMAGE);
    }
  }

  /** P2: drifts and spins with its spiral arms; every tick each arm fires one slow bullet straight out from the core. */
  private behaveCarrierP2(e: Enemy, dtMs: number, dx: number, dy: number, d: number, frozen: boolean): void {
    const ai = e.ai;
    e.vx = (dx / d) * e.speed;
    e.vy = (dy / d) * e.speed;
    if (frozen) return;
    ai.rot += (CARRIER_SPIRAL_SPIN * Status.speedMul(e) * dtMs) / 1000;
    ai.spiralT -= dtMs;
    if (ai.spiralT > 0) return;
    ai.spiralT += ai.first ? FIRST_CARRIER_SPIRAL_MS : CARRIER_SPIRAL_MS;
    const arms = ai.first ? FIRST_CARRIER_SPIRAL_ARMS : CARRIER_SPIRAL_ARMS;
    for (let k = 0; k < arms; k++) {
      const a = ai.rot + (k * Math.PI * 2) / arms;
      this.fireBullet(e.x + Math.cos(a) * CARRIER_SPIRAL_R, e.y + Math.sin(a) * CARRIER_SPIRAL_R, a, CARRIER_SPIRAL_SPEED, CARRIER_SPIRAL_DAMAGE);
    }
  }

  /** P3: drift ×1.8 → (every CARRIER_CHARGE_EVERY_MS) stop and telegraph → charge along the locked line; an aimed fan throughout. */
  private behaveCarrierP3(e: Enemy, dtMs: number, dx: number, dy: number, d: number, frozen: boolean): void {
    const ai = e.ai;
    if (ai.cState === C_TELEGRAPH) {
      e.vx = e.vy = 0;
    } else if (ai.cState === C_CHARGE) {
      e.vx = ai.dx * CARRIER_CHARGE_SPEED;
      e.vy = ai.dy * CARRIER_CHARGE_SPEED;
    } else {
      e.vx = (dx / d) * e.speed * CARRIER_P3_SPEED_MUL;
      e.vy = (dy / d) * e.speed * CARRIER_P3_SPEED_MUL;
    }
    if (frozen) return;
    ai.rot += (CARRIER_SPIN * CARRIER_P3_SPEED_MUL * Status.speedMul(e) * dtMs) / 1000;
    ai.chargeT -= dtMs;
    ai.t -= dtMs;
    if (ai.cState === C_TELEGRAPH) {
      if (ai.t <= 0) {
        ai.cState = C_CHARGE;
        ai.t = CARRIER_CHARGE_MS;
      }
    } else if (ai.cState === C_CHARGE) {
      if (ai.t <= 0) ai.cState = C_DRIFT;
    } else if (ai.chargeT <= 0) {
      ai.chargeT += CARRIER_CHARGE_EVERY_MS;
      ai.cState = C_TELEGRAPH;
      ai.t = CARRIER_CHARGE_TELEGRAPH_MS;
      if (dx === 0 && dy === 0) {
        const a = Math.random() * Math.PI * 2;
        ai.dx = Math.cos(a);
        ai.dy = Math.sin(a);
      } else {
        ai.dx = dx / d;
        ai.dy = dy / d;
      }
      e.vx = e.vy = 0;
    }
    ai.fanT -= dtMs;
    if (ai.fanT > 0) return;
    ai.fanT += CARRIER_FAN_MS;
    const aim = Math.atan2(dy, dx);
    for (let i = 0; i < CARRIER_FAN_BULLETS; i++) {
      const off = CARRIER_FAN_BULLETS > 1 ? -1 + (2 * i) / (CARRIER_FAN_BULLETS - 1) : 0;
      this.fireBullet(e.x, e.y, aim + off * CARRIER_FAN_HALF, CARRIER_FAN_SPEED, CARRIER_FAN_DAMAGE);
    }
  }

  /** Red line of length `len` along the locked dash path (e.ai.dx/dy), brightening as e.ai.t runs down from `totalMs`. Lancers and P3 Carriers. */
  private drawTelegraph(e: Enemy, len: number, totalMs: number): void {
    const p = 1 - Math.max(0, e.ai.t) / totalMs;
    const g = this.gfx;
    const x1 = e.x + e.ai.dx * len, y1 = e.y + e.ai.dy * len;
    // Readable at a glance (Checkpoint A note): a wide soft lane, a bright core that thickens, and a flashing end mark.
    g.lineStyle(10 + p * 10, COLOURS.swarmRed, 0.08 + 0.14 * p).lineBetween(e.x, e.y, x1, y1);
    g.lineStyle(2 + p * 3, COLOURS.swarmRed, 0.55 + 0.45 * p).lineBetween(e.x, e.y, x1, y1);
    if (Math.floor(this.scene.timeMs / 90) % 2 === 0) g.lineStyle(2, 0xffffff, 0.5 + 0.5 * p).strokeCircle(x1, y1, 6 + p * 4);
  }

  /** Health bar above the hull and the four turret points. */
  private drawCarrier(e: Enemy): void {
    const g = this.gfx;
    const bx = e.x - CARRIER_BAR_W / 2;
    const by = e.y - e.radius - CARRIER_BAR_GAP - CARRIER_BAR_H;
    const frac = Math.max(0, Math.min(1, e.hp / (e.maxHp || 1)));
    g.fillStyle(0x2a0010, 0.85);
    g.fillRect(bx, by, CARRIER_BAR_W, CARRIER_BAR_H);
    g.fillStyle(COLOURS.swarmRed, 1);
    g.fillRect(bx, by, CARRIER_BAR_W * frac, CARRIER_BAR_H);
    g.lineStyle(1, COLOURS.swarmRed, 0.5);
    g.strokeRect(bx, by, CARRIER_BAR_W, CARRIER_BAR_H);
    // Ticks at the phase thresholds still ahead, so the next break is readable.
    const ticks = e.ai.first ? [0.5] : [0.66, 0.33];
    g.lineStyle(1, 0xffffff, 0.8);
    for (let i = (e.ai.phase ?? 1) - 1; i < ticks.length; i++) {
      const tx = bx + CARRIER_BAR_W * ticks[i];
      g.lineBetween(tx, by - 2, tx, by + CARRIER_BAR_H + 2);
    }

    if (e.ai.phase === 2) {
      // Spiral muzzles on the exposed core.
      const arms = e.ai.first ? FIRST_CARRIER_SPIRAL_ARMS : CARRIER_SPIRAL_ARMS;
      g.fillStyle(COLOURS.swarmMagenta, 1);
      for (let k = 0; k < arms; k++) {
        const a = e.ai.rot + (k * Math.PI * 2) / arms;
        g.fillCircle(e.x + Math.cos(a) * CARRIER_SPIRAL_R, e.y + Math.sin(a) * CARRIER_SPIRAL_R, 3);
      }
      return;
    }
    if (e.ai.phase === 3) {
      // The bare core pulses, faster while it winds up a charge.
      const winding = e.ai.cState === C_TELEGRAPH;
      const pulse = 0.5 + 0.5 * Math.sin(this.scene.timeMs / (winding ? 45 : 120));
      g.lineStyle(3, COLOURS.swarmRed, 0.35 + 0.5 * pulse).strokeCircle(e.x, e.y, e.radius + 3 + pulse * 3);
      if (winding) this.drawTelegraph(e, (CARRIER_CHARGE_SPEED * CARRIER_CHARGE_MS) / 1000, CARRIER_CHARGE_TELEGRAPH_MS);
      return;
    }

    // Turrets glow brighter in the half second before a volley.
    const charge = e.ai.fireT < 500 ? 1 : 0.6;
    g.fillStyle(COLOURS.swarmMagenta, charge);
    for (let k = 0; k < CARRIER_TURRETS; k++) {
      const ta = e.ai.rot + (k * Math.PI * 2) / CARRIER_TURRETS;
      g.fillCircle(e.x + Math.cos(ta) * CARRIER_TURRET_R, e.y + Math.sin(ta) * CARRIER_TURRET_R, 4);
    }
  }

  /** Runs every phase transition a hit crossed, in order (one huge hit can play both). Only for Carriers still alive. */
  private checkCarrierPhase(e: Enemy): void {
    const prev = (e.ai.phase ?? 1) as 1 | 2 | 3;
    for (const p of phaseSteps(prev, e.hp / (e.maxHp || 1), !!e.ai.first)) this.enterCarrierPhase(e, p);
  }

  /** The outer ring blows off: smaller hitbox and silhouette, a shockwave, hit-stop, flash, callout, and a bonus drop (via 'carrier-phase'). */
  private enterCarrierPhase(e: Enemy, phase: 2 | 3): void {
    const scene = this.scene;
    const ai = e.ai;
    const oldR = e.radius;
    ai.phase = phase;
    e.radius = CARRIER_RADII[phase - 1];
    e.img.setTexture(CARRIER_PHASE_TEXTURE[phase - 1]);
    if (phase === 2) {
      ai.spiralT = CARRIER_PHASE_GRACE_MS;
    } else {
      ai.cState = C_DRIFT;
      ai.t = 0;
      ai.dx = 0;
      ai.dy = 1;
      ai.chargeT = CARRIER_CHARGE_EVERY_MS / 2;
      ai.fanT = CARRIER_PHASE_GRACE_MS;
    }

    // Shockwave: small enemies are shoved outward (no damage to anyone).
    for (const o of this.list) {
      if (o === e || o.kind === 'carrier') continue;
      const ox = o.x - e.x, oy = o.y - e.y;
      const od = Math.hypot(ox, oy);
      if (od > CARRIER_SHOCK_R) continue;
      const a = od > 0 ? Math.atan2(oy, ox) : Math.random() * Math.PI * 2;
      o.x += Math.cos(a) * CARRIER_SHOCK_PUSH;
      o.y += Math.sin(a) * CARRIER_SHOCK_PUSH;
      o.img.setPosition(o.x, o.y);
    }

    scene.fx.hitstop(60);
    scene.fx.shake(6, 250);
    scene.fx.burst(e.x, e.y, BASE_TINT.carrier, 30);
    scene.fx.burst(e.x, e.y, 0xffffff, 10);
    this.flashRing(e.x, e.y, oldR);
    this.debris(e.x, e.y, oldR);
    scene.fx.toast(`CARRIER · PHASE ${phase}`, 0xff2d55);
    Audio.sfx('phase');
    scene.events.emit('carrier-phase', e, phase);
  }

  /** A white flash and a ring that sweeps out to the shockwave radius (real-time tween, so it plays through hit-stop). */
  private flashRing(x: number, y: number, r0: number): void {
    const g = this.scene.add.graphics().setDepth(19);
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: 380, ease: 'Cubic.easeOut',
      onUpdate: tw => {
        const t = tw.getValue() ?? 1;
        g.clear();
        if (t < 0.35) g.fillStyle(0xffffff, 0.55 * (1 - t / 0.35)).fillCircle(x, y, r0 * (1 + t));
        g.lineStyle(2 + 5 * (1 - t), 0xffffff, 1 - t).strokeCircle(x, y, r0 + (CARRIER_SHOCK_R - r0) * t);
      },
      onComplete: () => g.destroy(),
    });
  }

  /** Hull fragments from the blown-off ring, flung outward with spin. */
  private debris(x: number, y: number, r0: number): void {
    for (let i = 0; i < CARRIER_DEBRIS; i++) {
      const a = (i / CARRIER_DEBRIS) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 70 + Math.random() * 90;
      const img = this.scene.add
        .image(x + Math.cos(a) * r0 * 0.85, y + Math.sin(a) * r0 * 0.85, 'scrap')
        .setTint(i % 3 === 0 ? 0xffffff : BASE_TINT.carrier)
        .setScale(1 + Math.random())
        .setRotation(a)
        .setDepth(17);
      this.scene.tweens.add({
        targets: img,
        x: x + Math.cos(a) * (r0 + dist),
        y: y + Math.sin(a) * (r0 + dist),
        rotation: a + (Math.random() - 0.5) * 8,
        alpha: 0,
        duration: 550 + Math.random() * 300,
        ease: 'Quad.easeOut',
        onComplete: () => img.destroy(),
      });
    }
  }

  /** A pulsing red ring segment at the edge of the camera view, toward each incoming Carrier. */
  private drawWarnings(): void {
    if (this.pending.length === 0) {
      this.warnText.setVisible(false);
      return;
    }
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const z = cam.zoom || 1;
    const margin = 36 / z;
    const hw = Math.max(1, view.width / 2 - margin);
    const hh = Math.max(1, view.height / 2 - margin);
    const cx = view.centerX, cy = view.centerY;
    const pulse = 0.55 + 0.45 * Math.sin(this.scene.timeMs / 90);
    const g = this.gfx;
    for (let i = 0; i < this.pending.length; i++) {
      const a = this.pending[i].angle;
      const c = Math.cos(a), s = Math.sin(a);
      // Where the ray from the view centre meets the inset view rectangle.
      const t = Math.min(c !== 0 ? hw / Math.abs(c) : Infinity, s !== 0 ? hh / Math.abs(s) : Infinity);
      const px = cx + c * t, py = cy + s * t;
      const r = 26 / z;
      g.lineStyle(3 / z, COLOURS.swarmRed, pulse);
      g.beginPath();
      g.arc(px - c * r, py - s * r, r * 2, a - 0.45, a + 0.45);
      g.strokePath();
      g.lineStyle(2 / z, COLOURS.swarmRed, pulse * 0.6);
      g.beginPath();
      g.arc(px - c * r, py - s * r, r * 1.4, a - 0.35, a + 0.35);
      g.strokePath();
      if (i === 0) {
        this.warnText
          .setPosition(px - c * r * 2.2, py - s * r * 2.2)
          .setScale(1 / z)
          .setAlpha(pulse)
          .setVisible(true);
      }
    }
  }

  /** A P3 charge that hits the ship stops there (it drifts again until the next telegraph). */
  endCharge(e: Enemy): void {
    if (e.ai.cState === C_CHARGE) e.ai.cState = C_DRIFT;
  }

  /**
   * Applies damage; kills at 0 HP. `flash` = brief white hit tint. `from` is where a direct hit came from
   * (bolts, beams, rays): a Shielder's arc blocks those. Returns false only when the shield blocked all of it.
   */
  damage(e: Enemy, amount: number, src: DamageSrc, flash = true, from?: { x: number; y: number }): boolean {
    if (!e.alive || amount <= 0) return true;
    if (e.kind === 'shielder' && e.ai.shield > 0 && from) {
      const r = shieldHit(e.ai.shield, e.ai.facing, e, amount, from);
      if (r.blocked) {
        e.ai.shield = r.shield;
        this.shieldFx(e, from, r.broke);
        if (r.hp <= 0) return false;
        amount = r.hp;
      }
    }
    e.hp -= amount;
    if (flash) e.hitFlash = 50;
    // A Carrier first plays every phase change this hit crossed (bonus drops included), even the killing hit.
    if (e.kind === 'carrier') this.checkCarrierPhase(e);
    if (e.hp <= 0) this.kill(e, src);
    return true;
  }

  /** A blocked hit sparks and tinks at the arc; the hit that empties the shield shatters it. */
  private shieldFx(e: Enemy, from: { x: number; y: number }, broke: boolean): void {
    const a = Math.atan2(from.y - e.y, from.x - e.x);
    const r = e.radius + SHIELD_GAP;
    const fx = this.scene.fx;
    fx.burst(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, SHIELD_COLOUR, 4);
    const now = this.scene.timeMs;
    if (now - this.lastTink >= TINK_GAP_MS) {
      this.lastTink = now;
      Audio.sfx('tink', { vol: 0.5 });
    }
    if (broke) {
      fx.burst(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, SHIELD_COLOUR, 12);
      Audio.sfx('shatter');
    }
  }

  /** The 120° shield arc; a third of its segments drop out as cracks at each third of the shield spent. */
  private drawShield(e: Enemy): void {
    if (!(e.ai.shield > 0)) return;
    const g = this.gfx;
    const spent = 1 - e.ai.shield / e.ai.shieldMax;
    const cracks = Math.min(2, Math.floor(spent * 3)) * (SHIELD_SEGS / 3);
    const r = e.radius + SHIELD_GAP;
    const step = (2 * SHIELD_HALF_ARC) / SHIELD_SEGS;
    g.lineStyle(3, SHIELD_COLOUR, 0.9);
    // Runs of intact segments draw as one stroke; cracked segments (a scattered, stable pattern) leave gaps.
    const intact = (i: number) => (i * 7) % SHIELD_SEGS >= cracks;
    for (let i = 0; i < SHIELD_SEGS; i++) {
      if (!intact(i)) continue;
      let j = i;
      while (j + 1 < SHIELD_SEGS && intact(j + 1)) j++;
      const a0 = e.ai.facing - SHIELD_HALF_ARC + i * step;
      g.beginPath();
      g.arc(e.x, e.y, r, a0, a0 + (j - i + 1) * step);
      g.strokePath();
      i = j;
    }
  }

  kill(e: Enemy, src: DamageSrc): void {
    if (!e.alive) return;
    const wasCarrier = e.kind === 'carrier';
    this.remove(e);
    this.scene.events.emit('enemy-killed', e, src);
    if (wasCarrier) this.scene.events.emit('carrier-killed', e);
  }

  /** Removes without a kill event (despawn). */
  remove(e: Enemy): void {
    if (!e.alive) return;
    e.alive = false;
    e.img.setVisible(false).setActive(false);
    const i = this.list.indexOf(e);
    if (i >= 0) {
      this.list[i] = this.list[this.list.length - 1];
      this.list.pop();
    }
    this.pool.release(e);
  }

  /** Nearest alive enemy within maxR of (x, y), optionally skipping ids. */
  nearest(x: number, y: number, maxR: number, skip?: Set<number>): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxR * maxR;
    for (const e of this.hash.query(x, y, maxR)) {
      if (skip?.has(e.id)) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d <= bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** Enemies whose circle overlaps the circle (x, y, r). */
  inRadius(x: number, y: number, r: number): Enemy[] {
    return this.hash.query(x, y, r + 40).filter(e => (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + e.radius) ** 2);
  }

  /** Centre of the most crowded `clusterR` circle around an enemy within `range`, or null. */
  densest(x: number, y: number, range: number, clusterR: number): { x: number; y: number } | null {
    const near = this.hash.query(x, y, range).filter(e => (e.x - x) ** 2 + (e.y - y) ** 2 <= range * range);
    let best: Enemy | null = null;
    let bestN = 0;
    // Sample up to 24 candidates so a huge crowd stays cheap.
    const step = Math.max(1, Math.floor(near.length / 24));
    for (let i = 0; i < near.length; i += step) {
      const c = near[i];
      const n = this.hash.query(c.x, c.y, clusterR).length;
      if (n > bestN) {
        bestN = n;
        best = c;
      }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  fireBullet(x: number, y: number, angle: number, speed: number, damage: number): EnemyBullet | null {
    const b = this.bulletPool.acquire();
    if (!b) return null;
    b.alive = true;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.damage = damage;
    b.life = 6000;
    b.reflected = false;
    b.img.setPosition(x, y).setVisible(true).setTint(COLOURS.swarmMagenta);
    this.bullets.push(b);
    return b;
  }

  removeBullet(b: EnemyBullet): void {
    if (!b.alive) return;
    b.alive = false;
    b.img.setVisible(false);
    const i = this.bullets.indexOf(b);
    if (i >= 0) {
      this.bullets[i] = this.bullets[this.bullets.length - 1];
      this.bullets.pop();
    }
    this.bulletPool.release(b);
  }

  get count(): number {
    return this.list.length;
  }
}
