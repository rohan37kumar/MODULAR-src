import Phaser from 'phaser';
import { shieldBlocks } from '../core/combat';
import type { ShotSpec } from '../core/types';
import type { GameScene } from '../scenes/GameScene';
import { applyHitEffects, shotColour } from './Effects';
import { segCircle } from './Projectiles';
import { MAX_ENEMY_RADIUS, type DamageSrc } from './runtime';

const TICK_HZ = 10;
const COLOUR = { beam: 0xffd27a, flame: 0xff8a1f, lance: 0x4da3ff, ring: 0xffd27a } as const;

type Continuous = 'beam' | 'flame' | 'lance' | 'ring';

/** Signature flourishes on continuous outputs (plan Task 15, "polish bump"). */
export interface BeamStyle {
  /** Hall of Mirrors: chromatic offset ghosts either side of each beam. */
  ghost?: boolean;
  /** Afterburner Lance: wavering heat-shimmer strands. */
  shimmer?: boolean;
  /** Halo: rotating spokes on the ring. */
  spokes?: boolean;
}

/**
 * Continuous outputs (design §9.3): beams, exhaust flames, lances and orbit rings.
 * Each emitter is keyed so its 10 Hz damage tick persists across frames; drawn into one Graphics.
 */
export class Beams {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly tick = new Map<string, number>();
  private seen = new Set<string>();
  /** Called once per damage tick with the emitter key (heat, signature detection). */
  onTick: ((key: string, hitAny: boolean) => void) | null = null;

  constructor(private readonly scene: GameScene) {
    this.g = scene.add.graphics().setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Call once per step before emitting. */
  begin(): void {
    this.g.clear();
    this.seen.clear();
  }

  /** Call once per step after emitting: forgets emitters that stopped. */
  end(): void {
    for (const k of this.tick.keys()) if (!this.seen.has(k)) this.tick.delete(k);
  }

  /**
   * A straight continuous shape from (x, y) along `angle`. `intensity` scales damage and
   * alpha (an idle thruster burns at 0.4).
   */
  line(key: string, spec: ShotSpec, x: number, y: number, angle: number, src: DamageSrc, dtMs: number, intensity = 1, colour?: number,
    style: BeamStyle = {}): void {
    const shape = spec.shape as Continuous;
    const c = colour ?? shotColour(COLOUR[shape] ?? COLOUR.beam, spec.effects);
    const n = Math.max(1, spec.count);
    const step = n > 1 ? Phaser.Math.DegToRad(spec.spreadDeg) / (n - 1) : 0;
    const segs: [number, number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = angle + (i - (n - 1) / 2) * step;
      segs.push([x, y, x + Math.cos(a) * spec.range, y + Math.sin(a) * spec.range]);
    }
    for (const seg of segs) this.cutAtShield(seg, spec);
    const flicker = 0.85 + Math.random() * 0.15;
    for (const [x0, y0, x1, y1] of segs) {
      if (shape === 'flame') this.drawFlame(x0, y0, x1, y1, spec.width, c, intensity * flicker);
      else this.drawBeam(x0, y0, x1, y1, spec.width, c, intensity * flicker);
      if (style.ghost) this.drawGhosts(x0, y0, x1, y1, spec.width, intensity);
      if (style.shimmer) this.drawShimmer(x0, y0, x1, y1, spec.width, c, intensity);
    }
    this.damageTick(key, spec, src, dtMs, intensity, e => segs.some(([x0, y0, x1, y1]) => segCircle(x0, y0, x1, y1, e.x, e.y, e.radius + spec.width / 2)),
      x, y, spec.range, { x, y });
  }

  /** A ring of radius spec.range around (cx, cy): the beam bent into a melee aura. */
  ring(key: string, spec: ShotSpec, cx: number, cy: number, src: DamageSrc, dtMs: number, colour?: number, style: BeamStyle = {}): void {
    const c = colour ?? shotColour(COLOUR.ring, spec.effects);
    const r = spec.range;
    const band = Math.max(8, spec.width * 1.5);
    this.g.lineStyle(band * 1.8, c, 0.15).strokeCircle(cx, cy, r);
    this.g.lineStyle(Math.max(2, spec.width * 0.5), c, 0.9).strokeCircle(cx, cy, r);
    if (style.spokes) {
      const spin = this.scene.timeMs / 400;
      for (let i = 0; i < 6; i++) {
        const a = spin + (i / 6) * Math.PI * 2, cos = Math.cos(a), sin = Math.sin(a);
        this.g.lineStyle(1.5, c, 0.3).lineBetween(cx + cos * r * 0.35, cy + sin * r * 0.35, cx + cos * r, cy + sin * r);
        this.g.lineStyle(4, 0xffffff, 0.8).lineBetween(cx + cos * (r - band / 2), cy + sin * (r - band / 2), cx + cos * (r + band / 2), cy + sin * (r + band / 2));
      }
    }
    this.damageTick(key, spec, src, dtMs, 1, e => Math.abs(Math.hypot(e.x - cx, e.y - cy) - r) <= band / 2 + e.radius, cx, cy, r + band);
  }

  private damageTick(key: string, spec: ShotSpec, src: DamageSrc, dtMs: number, intensity: number,
    touches: (e: { x: number; y: number; radius: number }) => boolean, qx: number, qy: number, reach: number, from?: { x: number; y: number }): void {
    this.seen.add(key);
    let acc = (this.tick.get(key) ?? Math.random() * (1000 / TICK_HZ)) + dtMs;
    while (acc >= 1000 / TICK_HZ) {
      acc -= 1000 / TICK_HZ;
      let hitAny = false;
      for (const e of this.scene.enemies.hash.query(qx, qy, reach + MAX_ENEMY_RADIUS)) {
        if (!e.alive || !touches(e)) continue;
        hitAny = true;
        if (this.scene.enemies.damage(e, (spec.damage * intensity) / TICK_HZ, src, false, from)) applyHitEffects(e, spec.effects);
        if (src.payloads) this.scene.payloads.onBeamTouch(key, e, src);
      }
      if (spec.effects.includes('harden')) this.cutBullets(touches, qx, qy, reach);
      this.onTick?.(key, hitAny);
    }
    this.tick.set(key, acc);
  }

  /** A Shielder facing the beam's origin stops it at its arc (A§4): shortens the segment in place. */
  private cutAtShield(seg: [number, number, number, number], spec: ShotSpec): void {
    const [x0, y0, x1, y1] = seg;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    let cut = len;
    for (const e of this.scene.enemies.hash.query((x0 + x1) / 2, (y0 + y1) / 2, len / 2 + MAX_ENEMY_RADIUS)) {
      if (!e.alive || e.kind !== 'shielder' || !(e.ai.shield > 0)) continue;
      if (!segCircle(x0, y0, x1, y1, e.x, e.y, e.radius + spec.width / 2) || !shieldBlocks(e.ai.facing, e, { x: x0, y: y0 })) continue;
      cut = Math.min(cut, Math.max(0, (e.x - x0) * ux + (e.y - y0) * uy - e.radius));
    }
    if (cut < len) {
      seg[2] = x0 + ux * cut;
      seg[3] = y0 + uy * cut;
    }
  }

  /** Harden: continuous outputs erase enemy bullets they touch. */
  private cutBullets(touches: (o: { x: number; y: number; radius: number }) => boolean, qx: number, qy: number, reach: number): void {
    const bullets = this.scene.enemies.bullets;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (Math.abs(b.x - qx) > reach || Math.abs(b.y - qy) > reach) continue;
      if (touches({ x: b.x, y: b.y, radius: 4 })) this.scene.enemies.removeBullet(b);
    }
  }

  /** A pulsing additive flare (fork flashes, core flashes). Drawn this step only. */
  flare(x: number, y: number, r: number, colour: number): void {
    const p = 0.75 + 0.25 * Math.sin(this.scene.timeMs / 45);
    this.g.fillStyle(colour, 0.25 * p).fillCircle(x, y, r * 1.8 * p);
    this.g.fillStyle(0xffffff, 0.85 * p).fillCircle(x, y, r * 0.6 * p);
  }

  private drawGhosts(x0: number, y0: number, x1: number, y1: number, w: number, a: number): void {
    const ang = Math.atan2(y1 - y0, x1 - x0), off = Math.max(2, w * 0.45);
    const nx = -Math.sin(ang) * off, ny = Math.cos(ang) * off;
    this.g.lineStyle(Math.max(1, w * 0.5), 0xff4dff, 0.35 * a).lineBetween(x0 + nx, y0 + ny, x1 + nx, y1 + ny);
    this.g.lineStyle(Math.max(1, w * 0.5), 0x00e5ff, 0.35 * a).lineBetween(x0 - nx, y0 - ny, x1 - nx, y1 - ny);
  }

  private drawShimmer(x0: number, y0: number, x1: number, y1: number, w: number, c: number, a: number): void {
    const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const t = this.scene.timeMs / 90;
    for (let k = 0; k < 2; k++) {
      this.g.lineStyle(1.5, k ? 0xffffff : c, 0.35 * a);
      this.g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const d = (i / 12) * len, wob = Math.sin(t + i * 1.3 + k * 2) * w * (0.6 + i / 12);
        const px = x0 + ux * d + nx * wob, py = y0 + uy * d + ny * wob;
        if (i === 0) this.g.moveTo(px, py);
        else this.g.lineTo(px, py);
      }
      this.g.strokePath();
    }
  }

  private drawBeam(x0: number, y0: number, x1: number, y1: number, w: number, c: number, a: number): void {
    this.g.lineStyle(w * 2.2, c, 0.12 * a).lineBetween(x0, y0, x1, y1);
    this.g.lineStyle(w, c, 0.55 * a).lineBetween(x0, y0, x1, y1);
    this.g.lineStyle(Math.max(1, w * 0.35), 0xffffff, 0.9 * a).lineBetween(x0, y0, x1, y1);
  }

  private drawFlame(x0: number, y0: number, x1: number, y1: number, w: number, c: number, a: number): void {
    const ang = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(ang), ny = Math.cos(ang);
    const spread = w * (0.9 + Math.random() * 0.3);
    this.g.fillStyle(c, 0.35 * a);
    this.g.fillTriangle(x0 + nx * w * 0.3, y0 + ny * w * 0.3, x0 - nx * w * 0.3, y0 - ny * w * 0.3, x1 + nx * spread, y1 + ny * spread);
    this.g.fillTriangle(x0 - nx * w * 0.3, y0 - ny * w * 0.3, x1 + nx * spread, y1 + ny * spread, x1 - nx * spread, y1 - ny * spread);
    this.g.lineStyle(Math.max(2, w * 0.4), 0xffe0a0, 0.7 * a).lineBetween(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
}
