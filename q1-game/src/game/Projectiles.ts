import { Pool } from '../core/pool';
import type { ShotSpec } from '../core/types';
import type { GameScene } from '../scenes/GameScene';
import { MAX_ENEMY_RADIUS, type Bolt, type DamageSrc, type Enemy } from './runtime';

export const MAX_PROJECTILES = 600;

export interface BoltOpts {
  colour: number;
  /** Overrides spec.speed / spec.range / spec.damage (shards, slugs...). */
  speed?: number;
  range?: number;
  damage?: number;
  scale?: number;
  /** Texture key (default 'bolt'). */
  texture?: string;
}

/**
 * Pooled player bolts: movement, pierce, and hits against the swarm's spatial hash.
 * Hit and end-of-life hooks let line/trait behaviours (Task 11) extend them.
 */
export class Projectiles {
  readonly list: Bolt[] = [];
  private readonly pool: Pool<Bolt>;
  /** Called after a bolt damages an enemy. */
  onHit: ((b: Bolt, e: Enemy) => void) | null = null;
  /** Called once when a bolt ends (range exhausted or pierce spent). */
  onExpire: ((b: Bolt, hitEnemy: Enemy | null) => void) | null = null;
  /** Called every step for each bolt before it moves (homing, orbiting). */
  onSteer: ((b: Bolt, dtMs: number) => void) | null = null;
  /** Called when a bolt runs out of range; returning true keeps it alive (Saw boomerang). */
  onRangeEnd: ((b: Bolt) => boolean) | null = null;
  /** Called when a Shielder's arc stops a bolt (the bolt then ends, with no hit effects). */
  onBlocked: ((b: Bolt, e: Enemy) => void) | null = null;

  constructor(private readonly scene: GameScene) {
    this.pool = new Pool<Bolt>(MAX_PROJECTILES, () => ({
      alive: false, x: 0, y: 0, vx: 0, vy: 0, damage: 0, radius: 3, pierceLeft: 0, travel: 0,
      spec: null as unknown as ShotSpec, src: { mountUid: 0, signatures: [] }, hit: new Set<number>(), colour: 0xffffff, flags: {},
      img: scene.add.image(0, 0, 'bolt').setVisible(false).setDepth(15).setBlendMode('ADD'),
    }));
  }

  /** Spawns one bolt; returns null when the pool is full (the shot is simply skipped). */
  fire(spec: ShotSpec, x: number, y: number, angle: number, src: DamageSrc, opts: BoltOpts): Bolt | null {
    const b = this.pool.acquire();
    if (!b) return null;
    const speed = opts.speed ?? spec.speed;
    b.alive = true;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.damage = opts.damage ?? spec.damage;
    b.radius = Math.max(2, spec.width / 2);
    b.pierceLeft = spec.pierce;
    b.travel = opts.range ?? spec.range;
    b.spec = spec;
    b.src = src;
    b.hit.clear();
    b.colour = opts.colour;
    b.flags = {};
    const s = (opts.scale ?? 1) * Math.max(0.6, spec.width / 4);
    b.img.setTexture(opts.texture ?? 'bolt').setPosition(x, y).setRotation(angle).setScale(s).setTint(opts.colour).setVisible(true);
    this.list.push(b);
    return b;
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    const enemies = this.scene.enemies;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      if (!b.alive) continue;
      this.onSteer?.(b, dtMs);
      if (!b.alive) continue; // caught (Saw) or otherwise ended while steering
      const step = Math.hypot(b.vx, b.vy) * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.travel -= step;
      // Spinning bolts (Saw blades) turn with time instead of facing their travel.
      b.img.setPosition(b.x, b.y).setRotation(b.flags.spin ? this.scene.timeMs / 40 : Math.atan2(b.vy, b.vx));

      // Sweep: query around the midpoint of this step so fast bolts don't tunnel.
      const mx = b.x - (b.vx * dt) / 2, my = b.y - (b.vy * dt) / 2;
      let last: Enemy | null = null;
      for (const e of enemies.hash.query(mx, my, step / 2 + b.radius + MAX_ENEMY_RADIUS)) {
        if (!e.alive || b.hit.has(e.id)) continue;
        if (segCircle(b.x - b.vx * dt, b.y - b.vy * dt, b.x, b.y, e.x, e.y, e.radius + b.radius)) {
          b.hit.add(e.id);
          last = e;
          // `from`: one second back along the bolt's path, so the shield test sees the direction it came from.
          // A parked or orbiting bolt has no velocity: it came from the ship.
          const moving = b.vx !== 0 || b.vy !== 0;
          const from = moving ? { x: e.x - b.vx, y: e.y - b.vy } : { x: this.scene.ship.x, y: this.scene.ship.y };
          if (!enemies.damage(e, b.damage, b.src, true, from)) {
            this.onBlocked?.(b, e);
            this.expire(b, e);
            break;
          }
          this.onHit?.(b, e);
          if (b.pierceLeft-- <= 0) break;
        }
      }
      if (!b.alive) continue;
      if (b.pierceLeft < 0) this.expire(b, last);
      else if (b.travel <= 0 && !this.onRangeEnd?.(b)) this.expire(b, last);
    }
  }

  /** Ends a bolt, firing the expire hook once. */
  expire(b: Bolt, hitEnemy: Enemy | null = null): void {
    if (!b.alive) return;
    this.onExpire?.(b, hitEnemy);
    this.remove(b);
  }

  remove(b: Bolt): void {
    if (!b.alive) return;
    b.alive = false;
    b.img.setVisible(false);
    const i = this.list.indexOf(b);
    if (i >= 0) {
      this.list[i] = this.list[this.list.length - 1];
      this.list.pop();
    }
    this.pool.release(b);
  }

  get count(): number {
    return this.list.length;
  }

  get free(): number {
    return MAX_PROJECTILES - this.list.length;
  }
}

/** Does segment (x0,y0)-(x1,y1) pass within r of (cx,cy)? */
export function segCircle(x0: number, y0: number, x1: number, y1: number, cx: number, cy: number, r: number): boolean {
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((cx - x0) * dx + (cy - y0) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = x0 + dx * t - cx, py = y0 + dy * t - cy;
  return px * px + py * py <= r * r;
}
