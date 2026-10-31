import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { HudScene } from '../scenes/HudScene';
import { FONT } from './runtime';

type Pt = { x: number; y: number };

interface Link {
  pts: () => Pt[];
  colour: number;
  ttl: number;
  total: number;
}

/**
 * Presentation helpers for one run: slow-motion and hit-stop (as a multiplier on simulated
 * time), camera shake, linking lines, the HUD banner and toast, and world-space name tags.
 * Timers here run on real time so slow-mo can't stretch itself.
 */
export class Fx {
  private slowLeft = 0;
  private slowScale = 1;
  private stopLeft = 0;
  private links: Link[] = [];
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: GameScene) {
    this.g = scene.add.graphics().setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
    this.sparks = scene.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 240 }, lifespan: { min: 220, max: 420 }, scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(18);
  }

  /** A kill pop: `n` sparks in `colour`. */
  burst(x: number, y: number, colour: number, n = 8): void {
    this.sparks.setParticleTint(colour);
    this.sparks.explode(n, x, y);
  }

  /** Multiplier on simulated time: 0 during hit-stop, the slow-mo scale during slow-mo. */
  get timeMul(): number {
    if (this.stopLeft > 0) return 0;
    return this.slowLeft > 0 ? this.slowScale : 1;
  }

  /** Advances the real-time timers and redraws the links. */
  update(realMs: number): void {
    this.stopLeft = Math.max(0, this.stopLeft - realMs);
    this.slowLeft = Math.max(0, this.slowLeft - realMs);
    const g = this.g;
    g.clear();
    for (let i = this.links.length - 1; i >= 0; i--) {
      const l = this.links[i];
      l.ttl -= realMs;
      if (l.ttl <= 0) {
        this.links.splice(i, 1);
        continue;
      }
      const pts = l.pts();
      if (pts.length < 2) continue;
      const a = Math.min(1, l.ttl / 400);
      // Draw in: the line reaches the last cell over the first 300 ms.
      const reach = Math.min(1, (l.total - l.ttl) / 300) * (pts.length - 1);
      for (const [w, alpha] of [[7, 0.18 * a], [2, 0.95 * a]] as const) {
        g.lineStyle(w, l.colour, alpha);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let j = 1; j < pts.length; j++) {
          const k = Math.min(1, reach - (j - 1));
          if (k <= 0) break;
          g.lineTo(Phaser.Math.Linear(pts[j - 1].x, pts[j].x, k), Phaser.Math.Linear(pts[j - 1].y, pts[j].y, k));
        }
        g.strokePath();
      }
      g.fillStyle(0xffffff, 0.9 * a);
      for (const p of pts) g.fillCircle(p.x, p.y, 3);
    }
  }

  slowmo(realMs: number, scale: number): void {
    this.slowLeft = Math.max(this.slowLeft, realMs);
    this.slowScale = scale;
  }

  hitstop(ms: number): void {
    this.stopLeft = Math.max(this.stopLeft, ms);
  }

  /** Shake by about `px` screen pixels. */
  shake(px: number, ms: number): void {
    const cam = this.scene.cameras.main;
    cam.shake(ms, px / Math.max(1, cam.width), true);
  }

  /** A thin line through `pts` (re-read every frame so it follows the ship). */
  link(pts: () => Pt[], colour: number, ms = 1600): void {
    this.links.push({ pts, colour, ttl: ms, total: ms });
  }

  banner(title: string, sub: string, colour: number): void {
    this.hud()?.banner(title, sub, colour);
  }

  toast(text: string, colour: number): void {
    this.hud()?.toast(text, colour);
  }

  /** A small floating name above the ship. */
  tag(text: string, colour: number): void {
    const ship = this.scene.ship;
    const t = this.scene.add.text(ship.x, ship.y - ship.boundRadius - 10, text, {
      fontFamily: FONT, fontSize: '13px', color: `#${colour.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5, 1).setDepth(31).setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: 1, y: t.y - 8, duration: 150 });
    this.scene.tweens.add({ targets: t, alpha: 0, y: t.y - 26, delay: 700, duration: 400, onComplete: () => t.destroy() });
  }

  private hud() {
    const hud = this.scene.scene.get('Hud') as HudScene | null;
    return hud?.hud ?? null;
  }
}
