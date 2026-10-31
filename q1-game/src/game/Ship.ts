import Phaser from 'phaser';
import { ShipGrid } from '../core/grid';
import { compileLoadout } from '../core/loadout';
import { withMimicsResolved } from '../core/mimic';
import { computeTraits } from '../core/traits';
import type { Cell, Loadout, PartId } from '../core/types';
import { partColour } from '../data/partShapes';
import { isNode, PARTS } from '../data/parts';
import { CELL, CELL_RADIUS, FONT } from './runtime';

/** A node's hitbox radius as a fraction of a cell's. */
const NODE_HIT = 0.45;
/** A node's feed spoke runs from this far out of its centre to its badge dot inside the octagon, in cells (corner to centre is 0.71). */
const SPOKE_FROM = 0.2;
const SPOKE_TO = 0.48;
const SPOKE_ALPHA = 0.6;

export const BASE_SPEED = 220;
const TURN_RATE = Phaser.Math.DegToRad(540);
export const MAX_HULL = 100;
/** A Mimic copying the cockpit (a pea-shooter) is drawn smaller than the real cockpit. */
const MIMIC_COCKPIT_SCALE = 0.8;
/** Mimic alpha shimmer, 1 → 0.75 → 1 (design addendum A§2.5). */
const SHIMMER_PERIOD_MS = 1200;
/** Mimic pink (partColour('mimic') = 0xf48fb1), for the Ξ glyph. */
const MIMIC_GLYPH = `#${partColour('mimic').toString(16).padStart(6, '0')}`;

export interface HitCell { cell: Cell; x: number; y: number; r: number; uid: number; partId: PartId }

/** Texture key for a part (64 px, facing up; mirrors drawn as '/'). */
export const partTexture = (id: PartId) => `part-${id}`;

/**
 * The player's ship: transform, steering, the part grid and its rendering.
 * `heading` is the world angle (radians, atan2 convention) of the ship's forward (local −y).
 */
export class Ship {
  grid = new ShipGrid();
  loadout: Loadout = compileLoadout(this.grid);
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  heading = -Math.PI / 2;
  hull = MAX_HULL;
  readonly container: Phaser.GameObjects.Container;
  /** Each Mimic's sprite in `container`, by uid (rebuilt on every redraw). */
  private readonly mimicSprites = new Map<number, Phaser.GameObjects.Image>();
  /** The Mimics' looping alpha shimmer, if any are attached. */
  private shimmer?: Phaser.Tweens.Tween;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(20);
    this.setGrid(this.grid);
  }

  /** Ship-local rotation applied to the container (local up = forward). */
  get rotation(): number {
    return this.heading + Math.PI / 2;
  }

  /** World angle of a ship-local direction (0 up/forward, 1 right, 2 down, 3 left). */
  dirAngle(dir: number): number {
    return this.heading + (dir * Math.PI) / 2;
  }

  setGrid(g: ShipGrid): void {
    this.grid = g;
    this.loadout = compileLoadout(g);
    this.redraw();
    this.scene.events.emit('loadout-changed', this.loadout);
  }

  /** Steers toward `steer` (length ≤ 1). The heading is kept when idle. */
  update(dtMs: number, steer: { x: number; y: number }): void {
    const dt = dtMs / 1000;
    const mag = Math.min(1, Math.hypot(steer.x, steer.y));
    const speed = BASE_SPEED * this.loadout.stats.speedMul * mag;
    if (mag > 0.05) {
      const target = Math.atan2(steer.y, steer.x);
      this.heading = Phaser.Math.Angle.RotateTo(this.heading, target, TURN_RATE * dt);
      this.vx = (steer.x / mag) * speed;
      this.vy = (steer.y / mag) * speed;
    } else {
      this.vx = 0;
      this.vy = 0;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.container.setPosition(this.x, this.y).setRotation(this.rotation);
  }

  get moving(): boolean {
    return this.vx !== 0 || this.vy !== 0;
  }

  cellWorld(c: Cell): { x: number; y: number } {
    const r = this.rotation, cos = Math.cos(r), sin = Math.sin(r);
    const lx = c.x * CELL, ly = c.y * CELL;
    return { x: this.x + lx * cos - ly * sin, y: this.y + lx * sin + ly * cos };
  }

  /** World point → ship-local position in cell units (cockpit centre = 0,0). */
  worldToLocal(wx: number, wy: number): { x: number; y: number } {
    const r = -this.rotation, cos = Math.cos(r), sin = Math.sin(r);
    const dx = wx - this.x, dy = wy - this.y;
    return { x: (dx * cos - dy * sin) / CELL, y: (dx * sin + dy * cos) / CELL };
  }

  /**
   * Every cell as a hitbox. `partId` is the effective part (a Mimic reports what it copies, so a
   * Mimic-Mirror reflects and a Mimic-Bulwark blocks); the loadout is recompiled on every setGrid.
   */
  hitCells(): HitCell[] {
    return this.loadout.mounts.map(m => {
      const w = this.cellWorld(m.cell);
      // A node is a small square in a gap: a much smaller hitbox than a full cell.
      const r = isNode(m.partId) ? CELL_RADIUS * NODE_HIT : CELL_RADIUS;
      return { cell: { x: m.cell.x, y: m.cell.y }, x: w.x, y: w.y, r, uid: m.uid, partId: m.partId };
    });
  }

  /** Radius enclosing every cell, for broad-phase queries. */
  get boundRadius(): number {
    let m = 0;
    for (const p of this.grid.parts()) m = Math.max(m, Math.hypot(p.x, p.y));
    return (m + 0.75) * CELL;
  }

  /** The sprite currently drawn for Mimic `uid` (it shows the part the Mimic copies), if any. */
  mimicSprite(uid: number): Phaser.GameObjects.Image | undefined {
    return this.mimicSprites.get(uid);
  }

  /**
   * Draws the ship from the Mimic-resolved grid, so each Mimic shows the part it currently copies
   * (re-resolved on every attach, Forge edit and jettison). Mimics shimmer and carry a pink Ξ.
   */
  private redraw(): void {
    this.shimmer?.remove();
    this.shimmer = undefined;
    this.mimicSprites.clear();
    this.container.removeAll(true);
    const { grid, mimics } = withMimicsResolved(this.grid);
    const traits = computeTraits(grid);
    // Octagons first, then the nodes that sit in the gaps between them.
    const drawOrder = [...grid.parts().filter(p => !isNode(p.id)), ...grid.parts().filter(p => isNode(p.id))];
    for (const p of drawOrder) {
      const mimic = mimics.has(p.uid);
      const size = mimic && p.id === 'cockpit' ? CELL * MIMIC_COCKPIT_SCALE : CELL;
      const img = this.scene.add.image(p.x * CELL, p.y * CELL, partTexture(p.id)).setDisplaySize(size, size);
      if (p.id === 'mirror') img.setFlipX(p.orient === '\\');
      else img.setRotation((p.facing * Math.PI) / 2);
      this.container.add(img);
      if (mimic) this.mimicSprites.set(p.uid, img);
    }
    // Trait pips: one dot per received trait, coloured by the giving part's family, along the cell's top edge.
    // On a Mimic cell they start one slot in, leaving the top-left corner to the Ξ glyph.
    const pipLayer = this.scene.add.graphics();
    for (const p of grid.parts()) {
      if (isNode(p.id)) continue; // nodes give; their pips would crowd the gaps
      const received = traits.get(p.uid) ?? [];
      const skip = mimics.has(p.uid) ? 1 : 0;
      received.forEach((t, i) => {
        const giver = (Object.keys(PARTS) as PartId[]).find(id => PARTS[id].trait === t)!;
        pipLayer.fillStyle(partColour(giver), 1);
        pipLayer.fillCircle(p.x * CELL - CELL * 0.33 + (i + skip) * CELL * 0.22, p.y * CELL - CELL * 0.36, 2);
      });
    }
    // Feed spokes (readability pass): each node shows a short line and a badge dot, in its colour, into every octagon it boosts.
    for (const n of grid.parts()) {
      if (!isNode(n.id)) continue;
      const colour = partColour(n.id);
      for (const o of grid.touching(n)) {
        const dx = o.x - n.x, dy = o.y - n.y;
        const len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const a = SPOKE_FROM * CELL, b = SPOKE_TO * CELL;
        pipLayer.lineStyle(1.5, colour, SPOKE_ALPHA)
          .lineBetween(n.x * CELL + ux * a, n.y * CELL + uy * a, n.x * CELL + ux * b, n.y * CELL + uy * b);
        pipLayer.fillStyle(colour, 1).fillCircle(n.x * CELL + ux * b, n.y * CELL + uy * b, 2);
      }
    }
    this.container.add(pipLayer);
    for (const uid of mimics) {
      const p = grid.byUid(uid)!;
      this.container.add(this.scene.add.text(p.x * CELL - CELL / 2, p.y * CELL - CELL / 2, 'Ξ', {
        fontFamily: FONT, fontSize: '9px', color: MIMIC_GLYPH,
      }).setOrigin(0, 0).setResolution(2));
    }
    if (this.mimicSprites.size) {
      // One looping tween for every Mimic; removed at the top of the next redraw so it never outlives its sprites.
      this.shimmer = this.scene.tweens.add({
        targets: [...this.mimicSprites.values()], alpha: { from: 1, to: 0.75 },
        duration: SHIMMER_PERIOD_MS / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  destroy(): void {
    this.shimmer?.remove();
    this.shimmer = undefined;
    this.mimicSprites.clear();
    this.container.destroy(true);
  }
}
