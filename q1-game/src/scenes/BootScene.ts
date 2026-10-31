import Phaser from 'phaser';
import type { PartId } from '../core/types';
import { PART_SHAPES, partColour, REPAIR_CORE_SHAPE, WRENCH_SHAPE, type ShapePath } from '../data/partShapes';
import { PART_IDS } from '../data/parts';
import { partTexture } from '../game/Ship';

/** Texture size for part icons; displayed at CELL (26 px) in the world and larger in the Forge. */
const PART_TEX = 64;

/** Generates every texture procedurally (no network assets), then opens the Title. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    for (const id of PART_IDS) this.shapeTexture(partTexture(id as PartId), PART_SHAPES[id as PartId], partColour(id as PartId), PART_TEX);
    this.shapeTexture('pickup-forge', WRENCH_SHAPE, 0x00e5ff, PART_TEX);
    this.shapeTexture('pickup-repair', REPAIR_CORE_SHAPE, 0x39ff88, PART_TEX);
    this.enemyTextures();
    this.fxTextures();
    this.scene.start('Title');
  }

  /** Neon icon: a soft wide under-stroke for glow, a faint fill on closed paths, a crisp stroke on top. */
  private shapeTexture(key: string, paths: ShapePath[], colour: number, size: number): void {
    const g = this.make.graphics({}, false);
    const pt = ([x, y]: [number, number]) => ({ x: (x + 0.5) * size, y: (y + 0.5) * size });
    const trace = (p: ShapePath) => {
      g.beginPath();
      p.pts.forEach((q, i) => (i === 0 ? g.moveTo(pt(q).x, pt(q).y) : g.lineTo(pt(q).x, pt(q).y)));
      if (p.closed) g.closePath();
    };
    for (const p of paths) {
      if (p.closed) {
        g.fillStyle(colour, 0.14);
        g.fillPoints(p.pts.map(pt), true);
      }
      g.lineStyle(size * 0.18, colour, 0.12);
      trace(p);
      g.strokePath();
      g.lineStyle(size * 0.05, colour, 1);
      trace(p);
      g.strokePath();
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  /** White enemy silhouettes, tinted at runtime (swarm colours, status tints, hit flash). Point up. */
  private enemyTextures(): void {
    const poly = (key: string, w: number, h: number, pts: [number, number][], extra?: (g: Phaser.GameObjects.Graphics) => void) => {
      const g = this.make.graphics({}, false);
      const P = pts.map(([x, y]) => ({ x: x * w, y: y * h }));
      g.fillStyle(0xffffff, 0.22).fillPoints(P, true);
      g.lineStyle(2, 0xffffff, 1).strokePoints(P, true, true);
      extra?.(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    const mote = this.make.graphics({}, false);
    mote.fillStyle(0xffffff, 0.35).fillCircle(7, 7, 7);
    mote.fillStyle(0xffffff, 1).fillCircle(7, 7, 4);
    mote.generateTexture('enemy-mote', 14, 14);
    mote.destroy();
    poly('enemy-drone', 24, 24, [[0.5, 0.04], [0.94, 0.94], [0.5, 0.72], [0.06, 0.94]]);
    poly('enemy-spitter', 26, 26, [[0.5, 0.04], [0.96, 0.5], [0.5, 0.96], [0.04, 0.5]], g => g.fillStyle(0xffffff, 1).fillCircle(13, 13, 3));
    poly('enemy-lancer', 18, 34, [[0.5, 0.02], [0.96, 0.22], [0.96, 0.78], [0.5, 0.98], [0.04, 0.78], [0.04, 0.22]]);
    // Shielder: a rounded square with a bright nose (its shield arc is drawn live by EnemySystem).
    poly('enemy-shielder', 22, 22, [[0.3, 0.06], [0.7, 0.06], [0.94, 0.3], [0.94, 0.7], [0.7, 0.94], [0.3, 0.94], [0.06, 0.7], [0.06, 0.3]],
      g => g.fillStyle(0xffffff, 1).fillRect(8, 3, 6, 4));
    const hex: [number, number][] = [...Array(6)].map((_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      return [0.5 + 0.47 * Math.cos(a), 0.5 + 0.47 * Math.sin(a)];
    });
    poly('enemy-carrier', 96, 96, hex, g => {
      g.lineStyle(2, 0xffffff, 0.8).strokeCircle(48, 48, 20);
      g.fillStyle(0xffffff, 1).fillCircle(48, 48, 6);
    });
    // Carrier phase 2: the outer ring is gone; a smaller hexagon shell around an exposed core, with torn struts.
    poly('enemy-carrier-2', 76, 76, hex, g => {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        g.lineStyle(2, 0xffffff, 0.6).lineBetween(38 + Math.cos(a) * 18, 38 + Math.sin(a) * 18, 38 + Math.cos(a) * 28, 38 + Math.sin(a) * 28);
      }
      g.fillStyle(0xffffff, 0.45).fillCircle(38, 38, 14);
      g.lineStyle(2, 0xffffff, 1).strokeCircle(38, 38, 16);
      g.fillStyle(0xffffff, 1).fillCircle(38, 38, 8);
    });
    // Carrier phase 3: only the core remains, inside a hot ring (tinted swarm red at runtime).
    const core = this.make.graphics({}, false);
    core.lineStyle(6, 0xffffff, 0.25).strokeCircle(32, 32, 27);
    core.fillStyle(0xffffff, 0.18).fillCircle(32, 32, 24);
    core.lineStyle(2.5, 0xffffff, 1).strokeCircle(32, 32, 24);
    core.fillStyle(0xffffff, 0.5).fillCircle(32, 32, 16);
    core.fillStyle(0xffffff, 1).fillCircle(32, 32, 10);
    core.generateTexture('enemy-carrier-3', 64, 64);
    core.destroy();
  }

  private fxTextures(): void {
    const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      const g = this.make.graphics({}, false);
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    // Player bolt: a capsule pointing +x (rotation = travel angle).
    make('bolt', 16, 8, g => {
      g.fillStyle(0xffffff, 0.3).fillRoundedRect(0, 0, 16, 8, 4);
      g.fillStyle(0xffffff, 1).fillRoundedRect(3, 2, 10, 4, 2);
    });
    make('ebullet', 12, 12, g => {
      g.fillStyle(0xffffff, 0.35).fillCircle(6, 6, 6);
      g.fillStyle(0xffffff, 1).fillCircle(6, 6, 3);
    });
    make('spark', 6, 6, g => g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3));
    make('scrap', 8, 8, g => {
      g.fillStyle(0xffffff, 0.4).fillCircle(4, 4, 4);
      g.fillStyle(0xffffff, 1).fillRect(2, 2, 4, 4);
    });
    make('dot', 4, 4, g => g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4));
    const stars = (key: string, n: number, maxR: number) =>
      make(key, 512, 512, g => {
        for (let i = 0; i < n; i++) {
          g.fillStyle(i % 9 === 0 ? 0x9ef0ff : 0xffffff, 0.3 + Math.random() * 0.6);
          g.fillCircle(Math.random() * 512, Math.random() * 512, 0.5 + Math.random() * maxR);
        }
      });
    stars('stars-far', 140, 0.8);
    stars('stars-near', 45, 1.5);
  }
}
