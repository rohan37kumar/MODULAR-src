import Phaser from 'phaser';
import { ShipGrid } from '../core/grid';
import type { Drop, PartId } from '../core/types';
import { isNode, PARTS } from '../data/parts';
import type { GameScene } from '../scenes/GameScene';
import { COLOURS, FONT } from './runtime';
import { partTexture } from './Ship';
import { TEX } from './view';

const PART_RADIUS = 11;
const PART_LIFE_MS = 14_000;
/** Tractor (Task 22): pickups within this many px of the hull drift in, so a near pass collects them. */
const TRACTOR_RANGE = 90;
const TRACTOR_SPEED = 150;
/** Hook grapple: a reeled item flies to the ship at this speed. */
const GRAPPLE_SPEED = 520;
const BLINK_MS = 3_000;
const BOUNCE_CD_MS = 500;
const LABEL_RANGE = 130;
const ITEM_LIFE_MS = 20_000;
export const REPAIR_HEAL = 30;

interface Floating {
  type: 'part' | 'forge' | 'repair';
  part: PartId | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  cd: number;
  img: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text | null;
  /** Being reeled in by a Hook's grapple. */
  reel: boolean;
}

/**
 * Everything that floats: salvaged parts (auto-attach on touch), hull repair cores
 * and Forge Uplinks. Events: 'part-attached' (PlacedPart), 'forge-picked', 'repair-picked'.
 */
export class Pickups {
  private items: Floating[] = [];
  private readonly magnetRing: Phaser.GameObjects.Arc;

  constructor(private readonly scene: GameScene) {
    this.magnetRing = scene.add.circle(0, 0, 10).setStrokeStyle(1, COLOURS.utility, 0.18).setDepth(5).setVisible(false);
  }

  spawn(drop: Drop, x: number, y: number): void {
    const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 40;
    const key = drop.type === 'part' ? partTexture(drop.part) : drop.type === 'forge' ? 'pickup-forge' : 'pickup-repair';
    const colour = drop.type === 'part' ? COLOURS.weapon : drop.type === 'forge' ? COLOURS.player : COLOURS.utility;
    const size = drop.type === 'part' ? 26 : 30;
    const img = this.scene.add.image(x, y, key).setDisplaySize(size, size).setDepth(9);
    // Glow distance is in texture pixels, and the icon textures are TEX× dense.
    if (this.scene.renderer.type === Phaser.WEBGL) img.preFX?.addGlow(colour, 2, 0, false, 0.1, 6 * TEX);
    const ring = this.scene.add.circle(x, y, 17).setStrokeStyle(2, colour, 0.7).setDepth(9);
    const label = drop.type === 'part'
      ? this.scene.add.text(x, y - 26, PARTS[drop.part].name, { fontFamily: FONT, fontSize: '11px', color: '#ffffff' }).setOrigin(0.5).setDepth(9).setAlpha(0)
      : null;
    this.items.push({
      type: drop.type, part: drop.type === 'part' ? drop.part : null, x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: drop.type === 'part' ? PART_LIFE_MS : ITEM_LIFE_MS, cd: 0, img, ring, label, reel: false,
    });
  }

  /** Is there a free cell (or, for a node, a free slot) left on the ship? */
  private hasRoom(id: PartId): boolean {
    const parts = this.scene.ship.grid.parts();
    return isNode(id)
      ? parts.filter(p => isNode(p.id)).length < (2 * ShipGrid.RADIUS + 2) ** 2
      : parts.filter(p => !isNode(p.id)).length < (2 * ShipGrid.RADIUS + 1) ** 2;
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    const ship = this.scene.ship;
    const cells = ship.hitCells();
    const reach = ship.boundRadius + 24;
    const t = this.scene.timeMs;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dtMs;
      it.cd = Math.max(0, it.cd - dtMs);
      if (it.life <= 0) {
        this.destroyItem(i);
        continue;
      }
      it.vx *= Math.pow(0.35, dt);
      it.vy *= Math.pow(0.35, dt);
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      // Gap to the nearest part (not the ship's centre): a ship with nodes and notches has empty pockets inside its bounds.
      let near = cells[0];
      for (const c of cells) if ((c.x - it.x) ** 2 + (c.y - it.y) ** 2 < (near.x - it.x) ** 2 + (near.y - it.y) ** 2) near = c;
      const gap = Math.hypot(it.x - near.x, it.y - near.y) - (near.r + PART_RADIUS);
      const room = it.type !== 'part' || this.hasRoom(it.part!);
      if (it.reel && it.cd <= 0) {
        const a = Math.atan2(ship.y - it.y, ship.x - it.x);
        it.x += Math.cos(a) * GRAPPLE_SPEED * dt;
        it.y += Math.sin(a) * GRAPPLE_SPEED * dt;
      } else if (gap < TRACTOR_RANGE && gap > 0 && it.cd <= 0 && room) {
        const a = Math.atan2(near.y - it.y, near.x - it.x);
        it.x += Math.cos(a) * TRACTOR_SPEED * dt;
        it.y += Math.sin(a) * TRACTOR_SPEED * dt;
      }
      const blink = it.life < BLINK_MS && Math.floor(it.life / 120) % 2 === 0;
      const pulse = 1 + 0.12 * Math.sin(t / 180);
      it.img.setPosition(it.x, it.y).setAlpha(blink ? 0.25 : 1);
      if (it.type === 'forge') it.img.setRotation(t / 400);
      it.ring.setPosition(it.x, it.y).setScale(pulse).setAlpha(blink ? 0.2 : 0.8);
      const d = Math.hypot(it.x - ship.x, it.y - ship.y);
      if (it.label) it.label.setPosition(it.x, it.y - 26).setAlpha(d < LABEL_RANGE ? 1 : 0);
      if (d > reach || it.cd > 0) continue;

      // Touching: the overlapping ship cell nearest the pickup's centre.
      let contact: (typeof cells)[number] | null = null;
      let best = Infinity;
      for (const c of cells) {
        const dd = (c.x - it.x) ** 2 + (c.y - it.y) ** 2;
        if (dd <= (c.r + PART_RADIUS) ** 2 && dd < best) {
          best = dd;
          contact = c;
        }
      }
      if (!contact) continue;

      if (it.type === 'forge') {
        this.destroyItem(i);
        this.scene.events.emit('forge-picked');
      } else if (it.type === 'repair') {
        this.destroyItem(i);
        this.scene.heal(REPAIR_HEAL);
        this.scene.events.emit('repair-picked');
      } else {
        const g = ship.grid.clone();
        const placed = g.attach(it.part!, contact.cell, ship.worldToLocal(it.x, it.y));
        if (placed) {
          this.destroyItem(i);
          ship.setGrid(g);
          this.weldFlash(ship.cellWorld(placed));
          this.scene.events.emit('part-attached', placed);
        } else {
          // No free neighbour: bounce off.
          const a = Math.atan2(it.y - contact.y, it.x - contact.x);
          it.vx = Math.cos(a) * 160;
          it.vy = Math.sin(a) * 160;
          it.cd = BOUNCE_CD_MS;
          it.reel = false;
        }
      }
    }

    const radius = ship.loadout.stats.pickupRadius;
    const hasMagnet = ship.loadout.mounts.some(m => m.partId === 'magnet'); // resolved: a Mimic Magnet counts
    this.magnetRing.setVisible(hasMagnet).setPosition(ship.x, ship.y).setRadius(radius);
  }

  private destroyItem(i: number): void {
    const it = this.items[i];
    it.img.destroy();
    it.ring.destroy();
    it.label?.destroy();
    this.items.splice(i, 1);
  }

  private weldFlash(p: { x: number; y: number }): void {
    const ring = this.scene.add.circle(p.x, p.y, 8).setStrokeStyle(3, 0xffffff, 1).setDepth(25);
    this.scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
  }

  /** Floating parts, Forge Uplinks and repair cores (debug/tests). */
  /**
   * Hook grapple: marks the nearest loose item within `range` of (x, y) that isn't already reeling
   * (parts only while the grid has room) and returns where it was, or null.
   */
  grapple(x: number, y: number, range: number): { x: number; y: number } | null {
    let best: Floating | null = null;
    let bestD = range * range;
    for (const it of this.items) {
      if (it.reel || (it.type === 'part' && !this.hasRoom(it.part!))) continue;
      const d = (it.x - x) ** 2 + (it.y - y) ** 2;
      if (d <= bestD) {
        bestD = d;
        best = it;
      }
    }
    if (!best) return null;
    best.reel = true;
    return { x: best.x, y: best.y };
  }

  get floating(): { type: string; part: PartId | null; x: number; y: number }[] {
    return this.items.map(i => ({ type: i.type, part: i.part, x: Math.round(i.x), y: Math.round(i.y) }));
  }

  get partCount(): number {
    return this.items.filter(i => i.type === 'part').length;
  }
}
