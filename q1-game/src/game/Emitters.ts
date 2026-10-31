import Phaser from 'phaser';
import { compileShot } from '../core/shot';
import type { PartId, ShotSpec } from '../core/types';
import { SIG_BY_ID } from '../data/signatures';
import type { GameScene } from '../scenes/GameScene';
import { Audio } from './Audio';
import type { Volley } from './SignatureEffects';
import { applyHitEffects, blast, shotColour } from './Effects';
import type { DamageSrc, Enemy } from './runtime';

/** Bolts in a Bomb Pod payload ring (design §10, container rule). */
export const PAYLOAD_BOLTS = 8;
const BOMB_COLOUR = 0xffb000;
const ARC_COLOUR = 0x7df9ff;
const CHARGE_MS = 4000;

interface Bomb {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  spec: ShotSpec;
  src: DamageSrc;
  payload: PartId | null;
  /** Remaining ricochets (bounce trait). */
  bounces: number;
  img: Phaser.GameObjects.Image;
  /** Grand Finale bomblet: payload bolt count, shared volley cap and colour. */
  bolts?: number;
  volley?: Volley;
  colour?: number;
}

export interface LobOpts {
  bolts: number;
  volley: Volley;
  colour: number;
}

interface Zap {
  pts: { x: number; y: number }[];
  ttl: number;
  colour: number;
}

/**
 * Emitter weapons: the Bomb Pod (lobbed bursts, payload container) and the Arc Coil
 * (chain lightning that Charges). Event: 'payload-burst' (mountUid) when a bomb carries a payload.
 */
export class Emitters {
  private bombs: Bomb[] = [];
  private zaps: Zap[] = [];
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: GameScene) {
    this.g = scene.add.graphics().setDepth(17).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Lobs a bomb from (x, y) to `target`; flight time follows spec.speed. */
  lob(spec: ShotSpec, x: number, y: number, target: { x: number; y: number }, src: DamageSrc, payload: PartId | null, opts?: LobOpts): void {
    const d = Math.hypot(target.x - x, target.y - y);
    const img = this.scene.add.image(x, y, 'ebullet').setTint(opts?.colour ?? shotColour(BOMB_COLOUR, spec.effects)).setDepth(16).setScale(1.3);
    this.bombs.push({
      x0: x, y0: y, x1: target.x, y1: target.y, t: 0, dur: Math.max(0.25, d / Math.max(1, spec.speed)),
      spec, src, payload, bounces: spec.effects.includes('bounce') ? 1 : 0, img, ...opts,
    });
  }

  /** Chain lightning: up to 3 (+1 per pierce) hops of `spec.range` from (x, y). Returns the enemies hit. */
  arc(spec: ShotSpec, x: number, y: number, src: DamageSrc): Enemy[] {
    const hops = 3 + spec.pierce;
    const hit = new Set<number>();
    const pts = [{ x, y }];
    const struck: Enemy[] = [];
    let cx = x, cy = y;
    for (let i = 0; i < hops; i++) {
      const e = this.scene.enemies.nearest(cx, cy, spec.range, hit);
      if (!e) break;
      hit.add(e.id);
      struck.push(e);
      pts.push({ x: e.x, y: e.y });
      cx = e.x;
      cy = e.y;
    }
    for (const e of struck) {
      // Charge first so a kill on this hop still counts as a Charged kill (Jumpstart).
      if (e.alive) {
        this.scene.enemies.damage(e, spec.damage, src);
        applyHitEffects(e, spec.effects);
        if (e.alive) e.status.charged = Math.max(e.status.charged, CHARGE_MS);
      }
    }
    if (struck.length) this.zaps.push({ pts, ttl: 140, colour: shotColour(ARC_COLOUR, spec.effects.filter(t => t !== 'charge')) });
    return struck;
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.t += dt;
      const k = Math.min(1, b.t / b.dur);
      const hop = Math.sin(k * Math.PI);
      b.img.setPosition(Phaser.Math.Linear(b.x0, b.x1, k), Phaser.Math.Linear(b.y0, b.y1, k)).setScale(1.2 + hop * 1.1);
      if (k < 1) continue;
      this.bombs.splice(i, 1);
      b.img.destroy();
      this.burst(b);
    }

    this.g.clear();
    for (let i = this.zaps.length - 1; i >= 0; i--) {
      const z = this.zaps[i];
      z.ttl -= dtMs;
      if (z.ttl <= 0) {
        this.zaps.splice(i, 1);
        continue;
      }
      const a = z.ttl / 140;
      for (const [w, alpha] of [[5, 0.25 * a], [2, a]] as const) {
        this.g.lineStyle(w, z.colour, alpha);
        this.g.beginPath();
        z.pts.forEach((p, j) => {
          if (j === 0) return void this.g.moveTo(p.x, p.y);
          // Jagged: a random kink between hops.
          const q = z.pts[j - 1];
          const mx = (p.x + q.x) / 2 + (Math.random() - 0.5) * 18, my = (p.y + q.y) / 2 + (Math.random() - 0.5) * 18;
          this.g.lineTo(mx, my);
          this.g.lineTo(p.x, p.y);
        });
        this.g.strokePath();
      }
    }
  }

  private burst(b: Bomb): void {
    const { spec, src } = b;
    const colour = shotColour(BOMB_COLOUR, spec.effects);
    blast(this.scene, b.x1, b.y1, spec.width, spec.damage, src, colour);
    Audio.sfx('explode', { vol: b.volley ? 0.3 : 0.55, pitch: b.volley ? 1.4 : 1 });
    const weapons = this.scene.weapons;

    const sigFx = this.scene.sigFx;
    if (src.signatures.includes('grandFinale') && !b.volley) {
      // Grand Finale replaces the payload ring with bomblets (Task 17).
      sigFx.grandFinale(b.x1, b.y1, src);
    } else if (b.payload) {
      // Container rule: the touching weapon's shots ring out of the burst.
      const shot = compileShot(b.payload, [], null, 1);
      if (shot) {
        const n = b.bolts ?? weapons.payloadBolts(src);
        // Cluster Shell: 12 bolts in the signature colour (plan Task 15).
        const colour = b.colour ?? (src.signatures.includes('clusterShell') ? SIG_BY_ID.clusterShell.colour : 0xffd36b);
        for (let i = 0; i < n; i++) {
          if (b.volley && b.volley.left-- <= 0) break;
          const a = (i / n) * Math.PI * 2;
          weapons.fireBolt(shot, b.x1, b.y1, a, { ...src, partId: b.payload, effects: [] }, { colour });
        }
        if (!b.volley) this.scene.events.emit('payload-burst', src.mountUid);
      }
    }
    if (src.signatures.includes('stormSeed') && !b.volley) sigFx.pylon(b.x1, b.y1, src);
    if (spec.effects.includes('shrapnel')) {
      for (let i = 0; i < 4; i++) {
        weapons.fireBolt({ ...spec, shape: 'bolt', effects: [], width: 3, pierce: 0 }, b.x1, b.y1, (i / 4) * Math.PI * 2 + 0.4, src,
          { colour: 0xffd36b, damage: spec.damage * 0.3, speed: 420, range: 160 });
      }
    }
    if (spec.effects.includes('warhead')) blast(this.scene, b.x1, b.y1, 30, spec.damage * 0.5, src, 0xff5a36);
    if (spec.twin) blast(this.scene, b.x1 + 34, b.y1 - 20, spec.width * 0.6, spec.damage * 0.4, src, colour);
    for (let s = 0; s < spec.extraShards; s++) {
      const a = (s / Math.max(1, spec.extraShards)) * Math.PI * 2;
      blast(this.scene, b.x1 + Math.cos(a) * 48, b.y1 + Math.sin(a) * 48, spec.width * 0.45, spec.damage * 0.3, src, colour);
    }
    for (const echo of spec.echoes) {
      this.scene.time.delayedCall(echo.delay * 1000, () => {
        if (this.scene.scene.isActive()) blast(this.scene, b.x1, b.y1, spec.width, spec.damage * echo.mul, src, colour);
      });
    }
    if (b.bounces > 0) {
      const next = this.scene.enemies.densest(b.x1, b.y1, 220, 70);
      if (next) this.lob({ ...spec, damage: spec.damage * 0.5, effects: spec.effects.filter(t => t !== 'bounce') }, b.x1, b.y1, next, src, null);
    }
  }
}
