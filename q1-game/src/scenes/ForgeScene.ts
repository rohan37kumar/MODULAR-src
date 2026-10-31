import Phaser from 'phaser';
import { CORNERS, ShipGrid } from '../core/grid';
import { traceLines } from '../core/lines';
import { compileLoadout } from '../core/loadout';
import { DIR_VEC } from '../core/math';
import { resolveMimics, withMimicsResolved } from '../core/mimic';
import { recogniseShip } from '../core/recogniser';
import type { Cell, PartId, PlacedPart, SignatureId } from '../core/types';
import { COPY } from '../data/copy';
import { cardLines, moduleKind } from '../data/modules';
import { isNode, PARTS } from '../data/parts';
import { octagonPoints, partColour } from '../data/partShapes';
import { SIG_BY_ID } from '../data/signatures';
import { Audio } from '../game/Audio';
import {
  cellCenter, computeForgeLayout, diamondPoints, hitRect, nearestSlot, pointToCell, type ForgeLayout, type Rect,
} from '../game/forgeLayout';

export interface ForgeData {
  /** The live grid. The Forge edits a clone and never touches this instance. */
  grid: ShipGrid;
  onAccept: (grid: ShipGrid) => void;
  /** Show the touch wording and affordances. */
  touch: boolean;
  /** Show the one-line tutorial. */
  showTutorial: boolean;
  /** Signatures already in the Xeno Archive. Only these glow on the workbench. */
  discovered: SignatureId[];
}

const FONT = "Consolas, 'Courier New', monospace";
const CYAN = 0x00e5ff;
const RED = 0xff2d55;
const GREY = 0x3c4a50;
const GOLD = 0xffd740;
/** COPY.forgeTitle is just 'FORGE UPLINK'; the workbench header adds the status line. */
const HEADER = `${COPY.forgeTitle} // BONDING FIELD ACTIVE`;

// Hologram workbench (addendum Task 15, step 1).
const OVERLAY_COLOUR = 0x000814;
const OVERLAY_ALPHA = 0.72;
const GRID_LINE_ALPHA = 0.12;
/** One scan-band sweep from the top of the grid to the bottom. */
const SCAN_MS = 2400;
/** Open flicker 0 → 1 → 0.6 → 1; the accept flicker plays it backwards. */
const FLICKER_MS = 180;
const FLICKER_KEYS = [0, 1, 0.6, 1];

// Flowing routes (step 2).
/** Dash scroll speed along every route, px/s. */
const ROUTE_FLOW = 40;
// Weld feel (step 3).
const LIFT_SCALE = 1.08;
const SHADOW_OFFSET = 4;
const SHADOW_ALPHA = 0.5;
const SNAP_MS = 120;
const ROTATE_MS = 120;
const JETTISON_MS = 400;
const JETTISON_SPIN = Math.PI * 4; // 720°
const SPARKS = 8;
const SPARK_MS = 240;
// Mimic view (step 5).
const MIMIC_GHOST_ALPHA = 0.35;
const MIMIC_GHOST_SCALE = 0.6;
// Nodes (square parts at cell corners).
/** A press within this many cells of an occupied slot's centre picks the node (nodes are tested before cells). */
const NODE_PICK = 0.32;
/** On touch a fingertip is wide and covers what it drags: a bigger pick radius, and every grid point snaps to some slot (0.72 > √0.5). */
const NODE_PICK_TOUCH = 0.42;
const NODE_SNAP_TOUCH = 0.72;
/** On touch the dragged part floats this many cells above the finger, and aims from there. */
const FINGER_LIFT = 0.75;
/** A dragged node targets the nearest slot within this many cells of the pointer. */
const NODE_SNAP = 0.5;
/** Node highlights (selection, disconnected, combo glow, drop target) sit just outside the 0.36 diamond frame. */
const NODE_HI = 1.15;
/** Free-slot markers shown while a node is dragged: a small diamond and its alpha. */
const SLOT_MARK = 0.45;
const SLOT_MARK_ALPHA = 0.35;
/** Soft outline on the octagons a selected or dragged node touches. */
const TOUCH_HINT_ALPHA = 0.5;
/** Feed spokes from a selected part to what it touches: bright to a part, dim and dotted to an empty spot. */
const SPOKE_ALPHA = 0.95;
const SPOKE_EMPTY_ALPHA = 0.35;
const SPOKE_DASH = 4;
// Info card (readability pass, 2026-10-31).
const INFO_PAD = 10;

type ButtonId = 'rotate' | 'jettison' | 'accept';
const BUTTON_IDS: ButtonId[] = ['rotate', 'jettison', 'accept'];

interface ButtonView { gfx: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }
interface DragState { uid: number; pointerId: number; startX: number; startY: number; x: number; y: number; active: boolean }
type Pt = { x: number; y: number };
/** A route or tether, already in screen space, ready to redraw every frame. */
interface FlowLine { pts: Pt[]; colour: number; head: [Pt, Pt, Pt] | null }

const D = {
  dim: 0, grid: 1, scan: 2, highlight: 3, parts: 4, lines: 5, glow: 6, drop: 7, lock: 8, ui: 9, fx: 10, dragged: 11,
} as const;

/** Camera alpha at flicker progress t (0..1), interpolating FLICKER_KEYS. */
function flickerAlpha(t: number): number {
  const x = Phaser.Math.Clamp(t, 0, 1) * (FLICKER_KEYS.length - 1);
  const i = Math.min(FLICKER_KEYS.length - 2, Math.floor(x));
  return FLICKER_KEYS[i] + (FLICKER_KEYS[i + 1] - FLICKER_KEYS[i]) * (x - i);
}

/** A part's highlight outline: a diamond for a node (scaled by NODE_HI), an octagon otherwise. */
function outline(id: PartId, cx: number, cy: number, s: number): Pt[] {
  return isNode(id) ? diamondPoints(cx, cy, s * NODE_HI) : octagonPoints(cx, cy, s);
}

/** Strokes a dashed polyline. `offset` scrolls the pattern forward along the path. */
function strokeDashed(g: Phaser.GameObjects.Graphics, pts: Pt[], dash: number, gap: number, offset: number): void {
  const period = dash + gap;
  let phase = (((-offset) % period) + period) % period;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 0.01) continue;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    let t = 0;
    while (t < len) {
      const on = phase < dash;
      const step = Math.min(on ? dash - phase : period - phase, len - t);
      if (on) g.lineBetween(a.x + ux * t, a.y + uy * t, a.x + ux * (t + step), a.y + uy * (t + step));
      t += step;
      phase += step;
      if (phase >= period) phase -= period;
    }
  }
}

/**
 * Forge Uplink: a paused, full-screen editor for the ship grid (design §13, plan Task 14),
 * dressed as a hologram workbench (addendum Task 15).
 * Accept is the only exit; it hands an edited clone back through `onAccept`.
 */
export class ForgeScene extends Phaser.Scene {
  private cfg!: ForgeData;
  private grid!: ShipGrid;
  private L!: ForgeLayout;
  private selected: number | null = null;
  private drag: DragState | null = null;
  private pressed: ButtonId | null = null;
  private accepted = false;
  /** onAccept has run. Guards the close flicker against firing it twice. */
  private acceptFired = false;
  private lockHover = false;
  private lockTimer: Phaser.Time.TimerEvent | null = null;
  private discovered = new Set<SignatureId>();
  /** What each Mimic copies on the real grid (refreshed with the part views). */
  private mimicIds = new Map<number, PartId>();

  // Derived from the working grid (the real one, or the hypothetical one mid-drag). Rebuilt per edit, not per frame.
  private derivedKey: string | null = null;
  private routes: FlowLine[] = [];
  private tethers: FlowLine[] = [];
  private flow = 0;
  private scanT = 0;
  private pulseT = 0;
  /** Jettisoned parts and spark bursts still animating; owned here, not by partViews. */
  private fx = new Set<Phaser.GameObjects.GameObject>();
  private openFlicker: Phaser.Tweens.Tween | null = null;

  private dimGfx!: Phaser.GameObjects.Graphics;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private scanGfx!: Phaser.GameObjects.Graphics;
  private hiGfx!: Phaser.GameObjects.Graphics;
  private lineGfx!: Phaser.GameObjects.Graphics;
  private selGfx!: Phaser.GameObjects.Graphics;
  private glowGfx!: Phaser.GameObjects.Graphics;
  private dropGfx!: Phaser.GameObjects.Graphics;
  /** Outlines on the octagons a selected (or dragged, at its target) node touches. */
  private hintGfx!: Phaser.GameObjects.Graphics;
  private lockGfx!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private tutorial: Phaser.GameObjects.Text | null = null;
  private info!: Phaser.GameObjects.Text;
  /** The info card's body: kind and plain card lines of the selected (or hovered) part. */
  private infoBody!: Phaser.GameObjects.Text;
  private infoGfx!: Phaser.GameObjects.Graphics;
  /** The part under the mouse while nothing is dragged (desktop hover shows its card when nothing is selected). */
  private hovered: number | null = null;
  private buttons!: Record<ButtonId, ButtonView>;
  private partViews = new Map<number, Phaser.GameObjects.Container>();
  /** Pooled signature-name labels; extras are hidden, never leaked. */
  private glowLabels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Forge');
  }

  create(data: ForgeData): void {
    // The scene instance is reused across launches, so reset every field.
    this.cfg = data;
    this.grid = data.grid.clone();
    this.selected = null;
    this.drag = null;
    this.pressed = null;
    this.accepted = false;
    this.acceptFired = false;
    this.lockHover = false;
    this.lockTimer = null;
    this.discovered = new Set(data.discovered ?? []);
    this.mimicIds = new Map();
    this.derivedKey = null;
    this.routes = [];
    this.tethers = [];
    this.flow = 0;
    this.scanT = 0;
    this.pulseT = 0;
    this.fx = new Set();
    this.openFlicker = null;
    this.partViews = new Map();
    this.glowLabels = [];
    this.tutorial = null;
    this.L = computeForgeLayout(this.scale.width, this.scale.height);

    this.dimGfx = this.add.graphics().setDepth(D.dim);
    this.gridGfx = this.add.graphics().setDepth(D.grid);
    this.scanGfx = this.add.graphics().setDepth(D.scan);
    this.hiGfx = this.add.graphics().setDepth(D.highlight);
    this.lineGfx = this.add.graphics().setDepth(D.lines);
    this.selGfx = this.add.graphics().setDepth(D.lines);
    this.glowGfx = this.add.graphics().setDepth(D.glow);
    this.dropGfx = this.add.graphics().setDepth(D.drop);
    this.hintGfx = this.add.graphics().setDepth(D.lines);
    this.lockGfx = this.add.graphics().setDepth(D.lock).setVisible(false);

    const text = (size: number, colour: string) =>
      this.add.text(0, 0, '', { fontFamily: FONT, fontSize: `${size}px`, color: colour, align: 'center' }).setDepth(D.ui);
    this.title = text(22, '#00e5ff').setOrigin(0.5, 0).setText(HEADER);
    if (data.showTutorial) {
      this.tutorial = text(14, '#9befff').setOrigin(0.5, 0)
        .setText(data.touch ? COPY.forgeTutorial.touch : COPY.forgeTutorial.desktop);
    }
    this.info = text(15, '#cfefff').setOrigin(0, 0).setAlign('left').setFontStyle('bold');
    this.infoBody = text(12, '#d8f6ff').setOrigin(0, 0).setAlign('left').setLineSpacing(2);
    this.infoGfx = this.add.graphics().setDepth(D.grid);
    this.hovered = null;
    this.buttons = {
      rotate: { gfx: this.add.graphics().setDepth(D.ui), label: text(16, '#00e5ff').setOrigin(0.5).setText(COPY.rotate) },
      jettison: { gfx: this.add.graphics().setDepth(D.ui), label: text(16, '#00e5ff').setOrigin(0, 0.5).setText(COPY.jettison) },
      accept: { gfx: this.add.graphics().setDepth(D.ui), label: text(16, '#000000').setOrigin(0.5) },
    };

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUpOutside, this);
    const kb = this.input.keyboard;
    kb?.on('keydown-R', this.onKeyRotate, this);
    kb?.on('keydown-X', this.onKeyJettison, this);
    kb?.on('keydown-ENTER', this.onKeyAccept, this);
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.layoutStatic();
    this.refresh();

    // Hologram power-up flicker.
    const cam = this.cameras.main.setAlpha(0);
    this.openFlicker = this.tweens.addCounter({
      from: 0, to: 1, duration: FLICKER_MS,
      onUpdate: tw => { cam.setAlpha(flickerAlpha(tw.getValue() ?? 1)); },
      onComplete: () => {
        this.openFlicker = null;
        cam.setAlpha(1);
      },
    });
  }

  /** Per frame: only the animated line work (routes, tethers, scan band, glow pulse). Part views are untouched. */
  update(_time: number, delta: number): void {
    this.flow += (ROUTE_FLOW * delta) / 1000;
    this.scanT = (this.scanT + delta) % SCAN_MS;
    this.pulseT = (this.pulseT + delta) % 1200;
    this.drawScan();
    this.drawFlow();
    this.glowGfx.setAlpha(0.75 + 0.25 * Math.sin((this.pulseT / 1200) * Math.PI * 2));
  }

  // ---------------------------------------------------------------- lifecycle

  private cleanup(): void {
    this.scale.off('resize', this.onResize, this);
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.input.off('pointerupoutside', this.onPointerUpOutside, this);
    const kb = this.input.keyboard;
    kb?.off('keydown-R', this.onKeyRotate, this);
    kb?.off('keydown-X', this.onKeyJettison, this);
    kb?.off('keydown-ENTER', this.onKeyAccept, this);
    this.lockTimer?.remove();
    this.lockTimer = null;
    this.drag = null;
    // Accept was pressed but the close flicker never finished (the scene was stopped under it): still hand the grid back.
    if (this.accepted) this.fireAccept();
    // The tween manager and display list destroy the tweens and objects themselves.
    this.partViews.clear();
    this.fx.clear();
    this.openFlicker = null;
    this.glowLabels = [];
    this.routes = [];
    this.tethers = [];
  }

  private onResize(): void {
    if (this.accepted) return;
    this.drag = null; // a drag can't survive the grid moving under it
    this.pressed = null;
    // Every running tween targets something about to be rebuilt or thrown away.
    this.tweens.killAll();
    this.openFlicker = null;
    this.cameras.main.setAlpha(1);
    for (const o of this.fx) o.destroy();
    this.fx.clear();
    this.dropGfx.clear();
    this.L = computeForgeLayout(this.scale.width, this.scale.height);
    this.layoutStatic();
    this.refresh();
  }

  // ---------------------------------------------------------------- actions

  private rotateSelected(): void {
    if (this.selected !== null) this.rotatePart(this.selected);
  }

  /** Turns a part a quarter (a Mirror flips), with a short tween on the rebuilt view and a tick. */
  private rotatePart(uid: number): void {
    if (!this.grid.rotate(uid)) return;
    this.refresh();
    Audio.sfx('click');
    const view = this.partViews.get(uid);
    if (!view) return;
    if (this.grid.byUid(uid)?.id === 'mirror') {
      // Mirrors flip rather than turn: a quick squash in from edge-on.
      const sx = view.scaleX;
      view.scaleX = 0;
      this.tweens.add({ targets: view, scaleX: sx, duration: ROTATE_MS, ease: 'Quad.easeOut' });
    } else {
      // The rebuilt view already shows the new facing; start it a quarter back so it turns into place.
      view.rotation = -Math.PI / 2;
      this.tweens.add({ targets: view, rotation: 0, duration: ROTATE_MS, ease: 'Quad.easeOut' });
    }
  }

  private jettison(uid: number): void {
    // Detach the view first so refresh() can't destroy it before it has flown off.
    const view = this.partViews.get(uid);
    if (!this.grid.jettison(uid)) return;
    this.partViews.delete(uid);
    if (this.selected === uid) this.selected = null;
    if (this.drag?.uid === uid) {
      this.drag = null;
      this.dropGfx.clear();
    }
    this.refresh();
    if (view) this.flyOff(view);
  }

  private accept(): void {
    if (this.accepted || !this.grid.isValid()) return;
    this.accepted = true;
    this.drag = null;
    this.dropGfx.clear();
    // Reverse flicker, then hand the grid back. cleanup() covers a flicker that never completes.
    this.openFlicker?.stop();
    this.openFlicker = null;
    const cam = this.cameras.main;
    this.tweens.addCounter({
      from: 1, to: 0, duration: FLICKER_MS,
      onUpdate: tw => { cam.setAlpha(flickerAlpha(tw.getValue() ?? 0)); },
      onComplete: () => {
        this.fireAccept();
        this.scene.stop();
      },
    });
  }

  /** Runs onAccept exactly once per launch. */
  private fireAccept(): void {
    if (this.acceptFired) return;
    this.acceptFired = true;
    this.cfg.onAccept(this.grid);
  }

  private activate(id: ButtonId): void {
    if (id === 'rotate') this.rotateSelected();
    else if (id === 'jettison') { if (this.selected !== null) this.jettison(this.selected); }
    else this.accept();
  }

  private onKeyRotate(e: KeyboardEvent): void {
    if (!e.repeat && !this.accepted) this.rotateSelected();
  }

  private onKeyJettison(e: KeyboardEvent): void {
    if (!e.repeat && !this.accepted && this.selected !== null) this.jettison(this.selected);
  }

  private onKeyAccept(e: KeyboardEvent): void {
    if (!e.repeat) this.accept();
  }

  // ---------------------------------------------------------------- pointer

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.accepted || this.drag) return;
    const right = p.rightButtonDown();

    for (const id of BUTTON_IDS) {
      if (hitRect(this.L.buttons[id], p.x, p.y)) {
        if (!right) this.pressed = id;
        return;
      }
    }

    const part = this.partAt(p.x, p.y);
    if (part && part.uid === 0) {
      // The cockpit is locked: show the glyph, never select it.
      this.selected = null;
      this.flashLock();
      this.refresh();
      return;
    }
    if (part) {
      this.selected = part.uid;
      if (right) {
        this.rotatePart(part.uid); // refreshes
        return;
      }
      this.drag = { uid: part.uid, pointerId: p.id, startX: p.x, startY: p.y, x: p.x, y: p.y, active: false };
      this.refresh();
      return;
    }
    // Empty cell or empty space clears the selection.
    if (this.selected !== null) {
      this.selected = null;
      this.refresh();
    }
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (this.accepted) return;
    const d = this.drag;
    if (!d) {
      // A node on one of the cockpit's corners is not the cockpit.
      const under = this.partAt(p.x, p.y);
      this.lockHover = under?.uid === 0;
      this.updateLock();
      const hovered = under && under.uid !== 0 && !this.cfg.touch ? under.uid : null;
      if (hovered !== this.hovered) {
        this.hovered = hovered;
        this.updateInfo();
      }
      return;
    }
    if (p.id !== d.pointerId) return;
    d.x = p.x;
    d.y = p.y;
    const threshold = this.cfg.touch ? 10 : 6;
    if (!d.active && Math.hypot(p.x - d.startX, p.y - d.startY) > threshold) d.active = true;
    if (d.active) this.updateDragVisuals();
  }

  /**
   * The part under a screen point. Nodes first: a slot sits on the shared corner of four cells,
   * so a press near an occupied slot's centre picks its node; anything else falls through to the cell.
   */
  private partAt(px: number, py: number): PlacedPart | undefined {
    const slot = nearestSlot(this.L, px, py);
    if (slot.dist <= (this.cfg.touch ? NODE_PICK_TOUCH : NODE_PICK)) {
      const node = this.grid.get(slot.x, slot.y);
      if (node) return node;
    }
    const cell = pointToCell(this.L, px, py);
    return cell ? this.grid.get(cell.x, cell.y) : undefined;
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    this.release(p, false);
  }

  private onPointerUpOutside(p: Phaser.Input.Pointer): void {
    this.release(p, true);
  }

  private release(p: Phaser.Input.Pointer, outsideCanvas: boolean): void {
    if (this.accepted) return;
    const pressed = this.pressed;
    this.pressed = null;
    if (pressed) {
      if (!outsideCanvas && hitRect(this.L.buttons[pressed], p.x, p.y)) this.activate(pressed);
      return;
    }
    const d = this.drag;
    if (!d || p.id !== d.pointerId) return;
    this.drag = null;
    this.dropGfx.clear();
    const settle = d.active ? this.drop(d.uid, p.x, p.y, outsideCanvas) : null;
    this.refresh();
    settle?.(); // runs on the rebuilt view
  }

  /**
   * Applies a finished drag: move, jettison, or snap back.
   * Returns the settle animation to run once refresh() has rebuilt the part views.
   */
  private drop(uid: number, px: number, py: number, outsideCanvas: boolean): (() => void) | null {
    const part = this.grid.byUid(uid);
    if (!part) return null;
    const target = this.dropTarget(part, px, py, outsideCanvas);
    if (target === 'jettison') {
      this.jettison(uid);
      return null;
    }
    const welded = !!target && this.grid.move(uid, target);
    const at = this.aim(px, py);
    return () => this.snap(uid, at.x, at.y, welded);
  }

  /** Where a drag aims: the finger itself with a mouse; on touch, a little above the fingertip, where the part is drawn. */
  private aim(px: number, py: number): { x: number; y: number } {
    return this.cfg.touch ? { x: px, y: py - this.L.cell * FINGER_LIFT } : { x: px, y: py };
  }

  /**
   * Where a drag released at (px, py) would go: a cell (a node slot for a node), the bin, or null for snap-back.
   * Octagons only ever target cells; nodes only ever target slots.
   */
  private dropTarget(part: PlacedPart, fx: number, fy: number, outsideCanvas: boolean): Cell | 'jettison' | null {
    // Buttons answer to the finger itself; the grid answers to the aim point (above the finger on touch).
    if (outsideCanvas || hitRect(this.L.buttons.jettison, fx, fy)) return 'jettison';
    // Over Rotate/Accept a slip shouldn't destroy a part (checked first: a rim slot's reach can spill past the grid).
    const overOther = hitRect(this.L.buttons.rotate, fx, fy) || hitRect(this.L.buttons.accept, fx, fy);
    if (overOther) return null;
    const { x: px, y: py } = this.aim(fx, fy);
    const cell = pointToCell(this.L, px, py);
    let target: Cell;
    if (isNode(part.id)) {
      // The nearest slot within reach, rim slots included (they lie on the grid border); on the bench between slots, nothing.
      const slot = nearestSlot(this.L, px, py);
      if (slot.dist > (this.cfg.touch ? NODE_SNAP_TOUCH : NODE_SNAP)) return cell ? null : 'jettison';
      target = { x: slot.x, y: slot.y };
    } else {
      if (!cell) return 'jettison'; // off the grid
      target = cell;
    }
    if (target.x === part.x && target.y === part.y) return null;
    return this.grid.get(target.x, target.y) ? null : target;
  }

  private updateDragVisuals(): void {
    const d = this.drag;
    if (!d || !d.active) return;
    const part = this.grid.byUid(d.uid);
    const view = this.partViews.get(d.uid);
    if (!part || !view) return;
    const target = this.dropTarget(part, d.x, d.y, false);
    const jettisoning = target === 'jettison';
    if (!view.getData('lifted')) this.lift(view);
    const at = this.aim(d.x, d.y);
    view.setPosition(at.x, at.y).setDepth(D.dragged).setScale(LIFT_SCALE).setAlpha(jettisoning ? 0.4 : 0.9);

    const g = this.dropGfx.clear();
    const s = this.L.cell;
    const node = isNode(part.id);
    if (node) this.drawFreeSlots(g);
    const cell = target && target !== 'jettison' ? target : null;
    if (cell) {
      const c = cellCenter(this.L, cell);
      g.fillStyle(CYAN, 0.12).fillPoints(outline(part.id, c.x, c.y, s), true);
      g.lineStyle(2, 0xffffff, 0.7).strokePoints(outline(part.id, c.x, c.y, s - 2), true, true);
    }
    // A dragged node shows what it would touch at its target (nothing while it has none).
    this.hintGfx.clear();
    if (node && cell) this.drawTouchHint({ id: part.id, x: cell.x, y: cell.y, uid: part.uid });
    this.drawButton('jettison', jettisoning);
    // Routes and combo glow follow the part as if it were already welded at the target cell.
    if (this.keyFor(cell) !== this.derivedKey) this.rebuildDerived(cell);
  }

  /** Faint small diamonds at every free slot that touches a connected octagon: where a dragged node can go. */
  private drawFreeSlots(g: Phaser.GameObjects.Graphics): void {
    const s = this.L.cell;
    const loose = new Set(this.grid.disconnected().map(p => p.uid));
    const r = ShipGrid.RADIUS + 0.5;
    g.lineStyle(1.5, CYAN, SLOT_MARK_ALPHA);
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (this.grid.get(x, y)) continue;
        const anchored = CORNERS.some(o => {
          const oct = this.grid.get(x + o.x, y + o.y);
          return !!oct && !isNode(oct.id) && !loose.has(oct.uid);
        });
        if (!anchored) continue;
        const c = cellCenter(this.L, { x, y });
        g.strokePoints(diamondPoints(c.x, c.y, s * SLOT_MARK), true, true);
      }
    }
  }

  /**
   * What the node at `at` feeds: a soft outline and a bright spoke to each octagon it touches, and a dim dotted
   * spoke to each empty spot of its 4, so the player sees where another part would also be boosted.
   */
  private drawTouchHint(at: { id: PartId; x: number; y: number; uid?: number }): void {
    const g = this.hintGfx;
    const s = this.L.cell;
    const colour = partColour(at.id);
    const from = cellCenter(this.L, at);
    for (const o of CORNERS) {
      const spot = { x: at.x + o.x, y: at.y + o.y };
      if (!ShipGrid.isCell(spot)) continue;
      const oct = this.grid.get(spot.x, spot.y);
      // A dragged node's own old spot counts as empty.
      const filled = !!oct && oct.uid !== at.uid && !isNode(oct.id);
      const c = cellCenter(this.L, spot);
      if (filled) {
        g.fillStyle(colour, TOUCH_HINT_ALPHA * 0.15).fillPoints(octagonPoints(c.x, c.y, s - 6), true);
        g.lineStyle(2, colour, TOUCH_HINT_ALPHA).strokePoints(octagonPoints(c.x, c.y, s - 6), true, true);
      }
      this.spoke(g, from, c, colour, filled);
    }
  }

  /** Spokes from a selected octagon to every part it touches (edge neighbours and corner nodes). */
  private drawOctagonSpokes(p: PlacedPart): void {
    const from = cellCenter(this.L, p);
    const colour = partColour(p.id);
    for (const n of this.grid.touching(p)) this.spoke(this.hintGfx, from, cellCenter(this.L, n), colour, true);
  }

  /** A feed spoke from a part toward `to`, ending in a dot just inside the receiving part. Dotted and dim when `to` is empty. */
  private spoke(g: Phaser.GameObjects.Graphics, from: Pt, to: Pt, colour: number, filled: boolean): void {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const ux = dx / len, uy = dy / len;
    const a = 0.22 * this.L.cell, b = len - 0.22 * this.L.cell;
    if (filled) {
      g.lineStyle(3, colour, SPOKE_ALPHA).lineBetween(from.x + ux * a, from.y + uy * a, from.x + ux * b, from.y + uy * b);
      g.fillStyle(colour, SPOKE_ALPHA).fillCircle(from.x + ux * b, from.y + uy * b, 3.5);
      return;
    }
    g.lineStyle(2, colour, SPOKE_EMPTY_ALPHA);
    for (let t = a; t < b; t += SPOKE_DASH * 2) {
      const e = Math.min(b, t + SPOKE_DASH);
      g.lineBetween(from.x + ux * t, from.y + uy * t, from.x + ux * e, from.y + uy * e);
    }
  }

  // ---------------------------------------------------------------- weld feel

  /** Pickup: a black copy of the icon behind it, offset down-right, so the part reads as lifted. */
  private lift(view: Phaser.GameObjects.Container): void {
    view.setData('lifted', true);
    const icon = view.getData('icon') as Phaser.GameObjects.Image | undefined;
    if (icon) {
      const shadow = this.add.image(SHADOW_OFFSET, SHADOW_OFFSET, icon.texture.key)
        .setDisplaySize(icon.displayWidth, icon.displayHeight)
        .setRotation(icon.rotation).setFlipX(icon.flipX)
        .setTintFill(0x000000).setAlpha(SHADOW_ALPHA);
      view.addAt(shadow, 0);
      return;
    }
    const shadow = this.add.graphics().fillStyle(0x000000, SHADOW_ALPHA);
    const part = this.grid.byUid(this.drag?.uid ?? -1);
    if (part && isNode(part.id)) shadow.fillPoints(diamondPoints(SHADOW_OFFSET, SHADOW_OFFSET, this.L.cell), true);
    else {
      const r = this.L.cell * 0.42;
      shadow.fillRect(SHADOW_OFFSET - r, SHADOW_OFFSET - r, 2 * r, 2 * r);
    }
    view.addAt(shadow, 0);
  }

  /** Settles a released part from (fromX, fromY) into its cell; a real move also welds (sparks + clank). */
  private snap(uid: number, fromX: number, fromY: number, weld: boolean): void {
    const view = this.partViews.get(uid);
    const part = this.grid.byUid(uid);
    if (!view || !part) return;
    const to = cellCenter(this.L, part);
    view.setPosition(fromX, fromY).setScale(LIFT_SCALE).setDepth(D.dragged);
    this.tweens.add({
      targets: view, x: to.x, y: to.y, scale: 1, duration: SNAP_MS, ease: 'Quad.easeOut',
      onComplete: () => {
        view.setDepth(D.parts);
        if (!weld) return;
        this.sparkBurst(to.x, to.y, partColour(part.id), isNode(part.id) ? 0.6 : 1);
        Audio.sfx('clank');
      },
    });
  }

  /** Eight short streaks thrown out from a part's edge, fading as they travel. `scale` shrinks the burst for a node. */
  private sparkBurst(x: number, y: number, colour: number, scale = 1): void {
    const s = this.L.cell * scale;
    const g = this.add.graphics().setDepth(D.fx);
    this.fx.add(g);
    const sparks = Array.from({ length: SPARKS }, (_, i) => ({
      a: (i / SPARKS) * Math.PI * 2 + (Math.random() - 0.5) * 0.6,
      d: s * (0.25 + Math.random() * 0.3),
    }));
    const len = Math.max(4, s * 0.12);
    this.tweens.addCounter({
      from: 0, to: 1, duration: SPARK_MS, ease: 'Quad.easeOut',
      onUpdate: tw => {
        const t = tw.getValue() ?? 1;
        g.clear();
        for (const sp of sparks) {
          const r0 = s * 0.38 + sp.d * t;
          const r1 = r0 + len * (1 - t) + 1;
          const cx = Math.cos(sp.a);
          const cy = Math.sin(sp.a);
          g.lineStyle(2, colour, 1 - t).lineBetween(x + cx * r0, y + cy * r0, x + cx * r1, y + cy * r1);
        }
      },
      onComplete: () => {
        this.fx.delete(g);
        g.destroy();
      },
    });
  }

  /** Jettison: the detached view spins 720° and flies off-screen, away from the grid centre. */
  private flyOff(view: Phaser.GameObjects.Container): void {
    this.fx.add(view);
    this.tweens.killTweensOf(view);
    const cx = this.L.gridX + (this.L.cell * 7) / 2;
    const cy = this.L.gridY + (this.L.cell * 7) / 2;
    let dx = view.x - cx;
    let dy = view.y - cy;
    const n = Math.hypot(dx, dy);
    if (n < 1) { dx = 0; dy = 1; } else { dx /= n; dy /= n; }
    const dist = Math.hypot(this.scale.width, this.scale.height) + this.L.cell;
    view.setDepth(D.fx);
    this.tweens.add({
      targets: view, x: view.x + dx * dist, y: view.y + dy * dist, rotation: view.rotation + JETTISON_SPIN,
      duration: JETTISON_MS, ease: 'Quad.easeIn',
      onComplete: () => {
        this.fx.delete(view);
        view.destroy(true);
      },
    });
  }

  // ---------------------------------------------------------------- lock glyph

  private flashLock(): void {
    this.lockTimer?.remove();
    this.lockGfx.setVisible(true);
    this.lockTimer = this.time.delayedCall(1500, () => {
      this.lockTimer = null;
      this.updateLock();
    });
  }

  private updateLock(): void {
    this.lockGfx.setVisible(this.lockHover || this.lockTimer !== null);
  }

  /** A small padlock at the cockpit cell's top-right corner, drawn around (0, 0). */
  private drawLock(): void {
    const s = Math.max(10, this.L.cell * 0.28);
    const c = cellCenter(this.L, { x: 0, y: 0 });
    const g = this.lockGfx.clear().setPosition(c.x + this.L.cell * 0.42, c.y - this.L.cell * 0.42);
    g.fillStyle(0x000000, 0.9).fillCircle(0, 0, s * 0.95);
    g.lineStyle(Math.max(2, s * 0.14), CYAN, 1);
    g.beginPath();
    g.arc(0, -s * 0.12, s * 0.3, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(CYAN, 1).fillRect(-s * 0.45, -s * 0.12, s * 0.9, s * 0.62);
    g.fillStyle(0x000000, 1).fillRect(-s * 0.06, s * 0.05, s * 0.12, s * 0.25);
  }

  // ---------------------------------------------------------------- drawing

  /** Everything that depends only on the screen size. */
  private layoutStatic(): void {
    const { width: w, height: h } = this.scale;
    const L = this.L;
    const compact = L.portrait || w < 900;

    // The paused run stays visible under a deep-blue hologram dim.
    this.dimGfx.clear().fillStyle(OVERLAY_COLOUR, OVERLAY_ALPHA).fillRect(0, 0, w, h);

    const size = L.cell * 7;
    const g = this.gridGfx.clear();
    // Near-opaque bench: the paused run shows around the grid, but its ship must not ghost through the cells.
    g.fillStyle(0x001018, 0.88).fillRect(L.gridX, L.gridY, size, size);
    // Blueprint grid.
    g.lineStyle(1, CYAN, GRID_LINE_ALPHA);
    for (let i = 1; i < 7; i++) {
      g.lineBetween(L.gridX + i * L.cell, L.gridY, L.gridX + i * L.cell, L.gridY + size);
      g.lineBetween(L.gridX, L.gridY + i * L.cell, L.gridX + size, L.gridY + i * L.cell);
    }
    g.lineStyle(1, CYAN, 0.3).strokeRect(L.gridX, L.gridY, size, size);
    // Corner brackets, standing just off the grid.
    const off = 6;
    const arm = Math.max(10, Math.min(28, L.cell * 0.6));
    const x0 = L.gridX - off;
    const y0 = L.gridY - off;
    const x1 = L.gridX + size + off;
    const y1 = L.gridY + size + off;
    g.lineStyle(2, CYAN, 0.9);
    for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      g.beginPath();
      g.moveTo(cx + sx * arm, cy);
      g.lineTo(cx, cy);
      g.lineTo(cx, cy + sy * arm);
      g.strokePath();
    }
    const cc = cellCenter(L, { x: 0, y: 0 });
    g.lineStyle(2, CYAN, 0.9).strokeRect(cc.x - L.cell / 2 + 1, cc.y - L.cell / 2 + 1, L.cell - 2, L.cell - 2);

    // The header is long; shrink it to fit a phone's width rather than wrap into the tutorial line.
    const titleSize = compact ? 18 : 22;
    this.title.setFontSize(titleSize).setPosition(L.textX, L.titleY);
    if (this.title.width > L.textW) this.title.setFontSize(Math.max(10, Math.floor((titleSize * L.textW) / this.title.width)));
    this.tutorial?.setFontSize(compact ? 12 : 14).setWordWrapWidth(L.textW).setPosition(L.textX, L.tutorialY);
    this.info.setFontSize(compact ? 13 : 15).setWordWrapWidth(L.info.w - 2 * INFO_PAD).setPosition(L.info.x + INFO_PAD, L.info.y + INFO_PAD);
    this.infoBody.setWordWrapWidth(L.info.w - 2 * INFO_PAD);
    this.infoGfx.clear().fillStyle(0x001018, 0.85).fillRoundedRect(L.info.x, L.info.y, L.info.w, L.info.h, 6)
      .lineStyle(1, CYAN, 0.35).strokeRoundedRect(L.info.x, L.info.y, L.info.w, L.info.h, 6);
    this.updateInfo();
    for (const id of BUTTON_IDS) this.buttons[id].label.setFontSize(compact ? 14 : 16);
    this.buttons.accept.label.setWordWrapWidth(L.buttons.accept.w - 12);

    this.drawLock();
  }

  /** Redraws everything that depends on the grid. Called after every edit. */
  private refresh(): void {
    this.mimicIds = resolveMimics(this.grid);
    this.drawParts();
    this.drawHighlights();
    this.updateLock();
    for (const id of BUTTON_IDS) this.drawButton(id, false);
    this.updateInfo();
    // Routes and glow: an active drag rebuilds them for its hypothetical grid; otherwise use the real grid.
    this.derivedKey = null;
    if (this.drag?.active) this.updateDragVisuals();
    if (this.derivedKey === null) this.rebuildDerived(null);
  }

  /**
   * The info card: the selected part (or, with a mouse, the hovered one) by name, kind and plain card lines.
   * When every line doesn't fit (a phone), it keeps the main line and the tip; failing that, a smaller font.
   */
  private updateInfo(): void {
    if (!this.infoBody) return;
    const L = this.L;
    const uid = this.selected ?? this.hovered;
    const p = uid !== null ? this.grid.byUid(uid) : undefined;
    if (!p) {
      this.info.setText(this.cfg.touch ? COPY.forgeInfo.touch : COPY.forgeInfo.desktop).setColor('#7fa9b3').setFontStyle('normal');
      this.infoBody.setText('');
      return;
    }
    // A Mimic reads as the part it copies (its card says what it will do on this ship).
    const id = p.id === 'mimic' ? (this.mimicIds.get(p.uid) ?? 'mimic') : p.id;
    const shown = id === 'cockpit' ? 'mimic' : id;
    const colour = partColour(p.id);
    this.info.setText(this.partLabel(p).toUpperCase()).setColor(`#${colour.toString(16).padStart(6, '0')}`).setFontStyle('bold');
    const all = cardLines(shown);
    const main = all.find(l => l.label === 'BOOSTS') ?? all.find(l => l.label === 'IN LINE') ?? all[0];
    const tip = all.find(l => l.label === 'TIP');
    const short = [main, ...(tip && tip !== main ? [tip] : [])];
    // Roomy cards (the landscape column) get a bigger font and a blank line between entries.
    const fmt = (ls: readonly { label: string; text: string }[], gap: string) =>
      [moduleKind(shown), ...ls.map(l => `${l.label}: ${l.text}`)].join(gap);
    const top = this.info.y + this.info.height + 4;
    const room = L.info.y + L.info.h - INFO_PAD / 2 - top;
    this.infoBody.setPosition(L.info.x + INFO_PAD, top);
    const tries = [[all, 14, '\n\n'], [all, 12, '\n'], [all, 11, '\n'], [short, 11, '\n'], [short, 10, '\n']] as const;
    for (const [lines, size, gap] of tries) {
      this.infoBody.setFontSize(size).setText(fmt(lines, gap));
      if (this.infoBody.height <= room) break;
    }
  }

  private partLabel(p: PlacedPart): string {
    if (p.id !== 'mimic') return PARTS[p.id].name;
    const copied = this.mimicIds.get(p.uid);
    // A Mimic with nothing to copy falls back to the pea-shooter; that reads as "unresolved" here.
    return copied && copied !== 'cockpit' ? `${PARTS.mimic.name} → ${PARTS[copied].name}` : PARTS.mimic.name;
  }

  private drawParts(): void {
    for (const v of this.partViews.values()) {
      this.tweens.killTweensOf(v);
      v.destroy(true);
    }
    this.partViews.clear();
    for (const p of this.grid.parts()) this.partViews.set(p.uid, this.makePartView(p));
  }

  private makePartView(p: PlacedPart): Phaser.GameObjects.Container {
    const s = this.L.cell;
    const c = cellCenter(this.L, p);
    const view = this.add.container(c.x, c.y).setDepth(D.parts);
    const key = `part-${p.id}`;
    if (this.textures.exists(key)) {
      if (p.id === 'mimic') {
        // The copied part's icon, ghosted inside the Mimic's own frame.
        const copied = this.mimicIds.get(p.uid);
        const ghostKey = `part-${copied}`;
        if (copied && copied !== 'cockpit' && this.textures.exists(ghostKey)) {
          const ghost = this.add.image(0, 0, ghostKey).setDisplaySize(s * MIMIC_GHOST_SCALE, s * MIMIC_GHOST_SCALE).setAlpha(MIMIC_GHOST_ALPHA);
          if (copied === 'mirror') ghost.setFlipX(p.facing % 2 === 1); // same rule as withMimicsResolved
          else ghost.setRotation((p.facing * Math.PI) / 2);
          view.add(ghost);
        }
      }
      const img = this.add.image(0, 0, key).setDisplaySize(s, s);
      if (p.id === 'mirror') img.setFlipX(p.orient === '\\');
      else img.setRotation((p.facing * Math.PI) / 2);
      view.add(img);
      view.setData('icon', img);
      return view;
    }
    // Fallback so the scene works without BootScene's textures.
    const def = PARTS[p.id];
    const colour = partColour(p.id);
    const g = this.add.graphics();
    const node = isNode(p.id);
    const r = node ? s * 0.22 : s * 0.42;
    if (node) {
      const pts = diamondPoints(0, 0, s);
      g.fillStyle(0x000000, 1).fillPoints(pts, true);
      g.lineStyle(2, colour, 1).strokePoints(pts, true, true);
    } else {
      g.fillStyle(0x000000, 1).fillRect(-r, -r, 2 * r, 2 * r);
      g.lineStyle(2, colour, 1).strokeRect(-r, -r, 2 * r, 2 * r);
    }
    if (p.id === 'mirror') {
      const k = p.orient === '\\' ? -1 : 1;
      g.lineStyle(3, colour, 1).lineBetween(-r * 0.7 * k, r * 0.7, r * 0.7 * k, -r * 0.7);
    } else if (def.routes) {
      const v = DIR_VEC[p.facing];
      g.fillStyle(colour, 1).fillCircle(v.x * r * 0.7, v.y * r * 0.7, Math.max(2, s * 0.06));
    }
    view.add(g);
    if (p.id !== 'mirror') {
      view.add(this.add.text(0, 0, def.name[0], { fontFamily: FONT, fontSize: `${Math.round(s * (node ? 0.25 : 0.4))}px`, color: '#' + colour.toString(16).padStart(6, '0') }).setOrigin(0.5));
    }
    return view;
  }

  // ---------------------------------------------------------------- routes, tethers, glow

  /** Cache key for the working grid: '' for the real grid, or the dragged part at its target cell. */
  private keyFor(cell: Cell | null): string {
    return cell && this.drag ? `${this.drag.uid}@${cell.x},${cell.y}` : '';
  }

  /** The real grid, or a clone with the dragged part already moved to `cell`. */
  private workingGrid(cell: Cell | null): ShipGrid {
    if (!cell || !this.drag) return this.grid;
    const g = this.grid.clone();
    g.move(this.drag.uid, cell);
    return g;
  }

  /** Re-traces routes and tethers and redraws the combo glow for the working grid. Once per edit or drag-target change. */
  private rebuildDerived(cell: Cell | null): void {
    this.derivedKey = this.keyFor(cell);
    const grid = this.workingGrid(cell);
    this.buildRoutes(grid);
    this.buildTethers(grid);
    this.drawGlow(grid);
  }

  /** Every routed part's lines of fire, traced on the Mimic-resolved grid so a copied Mirror bends them. */
  private buildRoutes(grid: ShipGrid): void {
    const resolved = withMimicsResolved(grid).grid;
    const s = this.L.cell;
    const head = Math.max(3, s * 0.1);
    this.routes = [];
    for (const part of resolved.parts()) {
      if (!PARTS[part.id].routes) continue;
      const colour = partColour(part.id);
      for (const route of traceLines(resolved, part.uid)) {
        const pts = route.path.map(c => cellCenter(this.L, c));
        const last = cellCenter(this.L, route.exit.cell);
        const v = DIR_VEC[route.exit.dir];
        const end = { x: last.x + (v.x * s) / 2, y: last.y + (v.y * s) / 2 };
        pts.push(end);
        // Small arrowhead at the exit so direction reads at a glance.
        const px = -v.y;
        const py = v.x;
        this.routes.push({
          pts, colour, head: [
            { x: end.x + v.x * head, y: end.y + v.y * head },
            { x: end.x - v.x * head + px * head, y: end.y - v.y * head + py * head },
            { x: end.x - v.x * head - px * head, y: end.y - v.y * head - py * head },
          ],
        });
      }
    }
  }

  /** One tether per Hook payload: from the riding gun to the Hook it rides, as compileLoadout pairs them. */
  private buildTethers(grid: ShipGrid): void {
    this.tethers = [];
    const seen = new Set<string>();
    for (const m of compileLoadout(grid).mounts) {
      for (const shot of m.shots) {
        for (const pl of shot.payloads) {
          const k = `${pl.uid}>${pl.hookUid}`;
          const from = grid.byUid(pl.uid);
          const to = grid.byUid(pl.hookUid);
          if (seen.has(k) || !from || !to) continue;
          seen.add(k);
          this.tethers.push({ pts: [cellCenter(this.L, from), cellCenter(this.L, to)], colour: partColour(pl.partId), head: null });
        }
      }
    }
  }

  /** Per frame: the cached routes and tethers with their dashes scrolled by `flow`. */
  private drawFlow(): void {
    const g = this.lineGfx.clear();
    const s = this.L.cell;
    const dash = Math.max(5, s * 0.16);
    for (const r of this.routes) {
      // A faint solid underlay keeps the route legible through the dash gaps.
      g.lineStyle(2, r.colour, 0.15);
      g.beginPath();
      g.moveTo(r.pts[0].x, r.pts[0].y);
      for (let i = 1; i < r.pts.length; i++) g.lineTo(r.pts[i].x, r.pts[i].y);
      g.strokePath();
      g.lineStyle(2, r.colour, 0.75);
      strokeDashed(g, r.pts, dash, dash * 0.8, this.flow);
      if (r.head) g.fillStyle(r.colour, 0.8).fillTriangle(r.head[0].x, r.head[0].y, r.head[1].x, r.head[1].y, r.head[2].x, r.head[2].y);
    }
    const tick = Math.max(3, s * 0.07);
    for (const t of this.tethers) {
      g.lineStyle(1.5, t.colour, 0.85);
      strokeDashed(g, t.pts, tick, tick, this.flow);
      const hook = t.pts[t.pts.length - 1];
      g.lineStyle(1.5, t.colour, 0.85).strokeCircle(hook.x, hook.y, tick);
    }
  }

  /** The scan band: a soft trail above a bright leading line, sweeping down the grid every SCAN_MS. */
  private drawScan(): void {
    const L = this.L;
    const size = L.cell * 7;
    const top = L.gridY;
    const lead = top + (size * this.scanT) / SCAN_MS;
    const trail = L.cell * 0.9;
    const slices = 6;
    const g = this.scanGfx.clear();
    for (let i = 0; i < slices; i++) {
      const y0 = Math.max(top, lead - trail + (trail * i) / slices);
      const y1 = lead - trail + (trail * (i + 1)) / slices;
      if (y1 <= y0) continue;
      g.fillStyle(CYAN, 0.012 * (i + 1)).fillRect(L.gridX, y0, size, y1 - y0);
    }
    g.lineStyle(1, CYAN, 0.35).lineBetween(L.gridX, lead, L.gridX + size, lead);
  }

  /** Gold name and outlines for every signature on the working grid that the Archive already knows. */
  private drawGlow(grid: ShipGrid): void {
    const g = this.glowGfx.clear();
    const s = this.L.cell;
    let used = 0;
    const stacked = new Map<string, number>();
    for (const m of recogniseShip(grid)) {
      if (!this.discovered.has(m.id)) continue; // undiscovered combos stay secret
      const parts = m.uids.map(uid => grid.byUid(uid)).filter((p): p is PlacedPart => !!p);
      const cells = parts.map(p => cellCenter(this.L, p));
      if (!cells.length) continue;
      g.lineStyle(2, GOLD, 1);
      parts.forEach((p, i) => g.strokePoints(outline(p.id, cells[i].x, cells[i].y, s - 6), true, true));
      // Centred over the group, just above its topmost cell; labels that land on the same spot stack upward.
      const x = cells.reduce((a, c) => a + c.x, 0) / cells.length;
      const y = Math.min(...cells.map(c => c.y)) - s / 2 - 2;
      const spot = `${Math.round(x)},${Math.round(y)}`;
      const n = stacked.get(spot) ?? 0;
      stacked.set(spot, n + 1);
      this.glowLabel(used++).setText(SIG_BY_ID[m.id].name).setPosition(x, Math.max(16, y - n * 15)).setVisible(true);
    }
    for (let i = used; i < this.glowLabels.length; i++) this.glowLabels[i].setVisible(false);
  }

  private glowLabel(i: number): Phaser.GameObjects.Text {
    while (this.glowLabels.length <= i) {
      this.glowLabels.push(this.add.text(0, 0, '', {
        fontFamily: FONT, fontSize: '13px', fontStyle: 'bold', color: '#ffd740', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(D.glow));
    }
    return this.glowLabels[i];
  }

  private drawHighlights(): void {
    const g = this.hiGfx.clear();
    const s = this.L.cell;
    for (const p of this.grid.disconnected()) {
      const c = cellCenter(this.L, p);
      g.fillStyle(RED, 0.2).fillPoints(outline(p.id, c.x, c.y, s), true);
      g.lineStyle(6, RED, 0.25).strokePoints(outline(p.id, c.x, c.y, s + 2), true, true);
      g.lineStyle(2, RED, 1).strokePoints(outline(p.id, c.x, c.y, s - 4), true, true);
    }
    const sel = this.selected !== null ? this.grid.byUid(this.selected) : undefined;
    if (sel) {
      const c = cellCenter(this.L, sel);
      g.fillStyle(CYAN, 0.16).fillPoints(outline(sel.id, c.x, c.y, s), true);
      g.lineStyle(8, CYAN, 0.22).strokePoints(outline(sel.id, c.x, c.y, s + 4), true, true);
    }
    // The bright frame sits above the part sprites so the selection always reads.
    const f = this.selGfx.clear();
    if (sel) {
      const c = cellCenter(this.L, sel);
      f.lineStyle(3, CYAN, 1).strokePoints(outline(sel.id, c.x, c.y, s - 2), true, true);
    }
    // A selected node shows which octagons receive its effect. Mid-drag, updateDragVisuals draws it at the target instead.
    if (!this.drag?.active) {
      this.hintGfx.clear();
      if (sel && isNode(sel.id)) this.drawTouchHint(sel);
      else if (sel) this.drawOctagonSpokes(sel);
    }
  }

  private drawButton(id: ButtonId, hot: boolean): void {
    const { gfx, label } = this.buttons[id];
    const r: Rect = this.L.buttons[id];
    const radius = Math.min(10, r.h / 4);
    const valid = this.grid.isValid();
    const hasPart = this.selected !== null || !!this.drag?.active;
    gfx.clear();

    let text = '';
    if (id === 'accept') {
      text = valid ? COPY.accept : COPY.reconnect;
      if (valid) {
        gfx.lineStyle(8, CYAN, 0.2).strokeRoundedRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, radius + 3);
        gfx.fillStyle(CYAN, 1).fillRoundedRect(r.x, r.y, r.w, r.h, radius);
        label.setColor('#000000');
      } else {
        gfx.fillStyle(0x000000, 0.7).fillRoundedRect(r.x, r.y, r.w, r.h, radius);
        gfx.lineStyle(2, GREY, 1).strokeRoundedRect(r.x, r.y, r.w, r.h, radius);
        label.setColor('#6d7f86');
      }
    } else {
      text = id === 'rotate' ? COPY.rotate : COPY.jettison;
      const colour = hot ? RED : hasPart ? CYAN : GREY;
      gfx.fillStyle(hot ? RED : 0x00141a, hot ? 0.25 : 0.85).fillRoundedRect(r.x, r.y, r.w, r.h, radius);
      gfx.lineStyle(hot ? 3 : 2, colour, 1).strokeRoundedRect(r.x, r.y, r.w, r.h, radius);
      label.setColor(hot ? '#ff2d55' : hasPart ? '#00e5ff' : '#6d7f86');
    }
    label.setText(text);

    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    if (id !== 'jettison') {
      label.setPosition(cx, cy);
      return;
    }
    // Jettison gets a small bin icon so "drag to bin" reads on touch.
    const icon = Math.min(14, r.h * 0.3);
    const gap = 8;
    const total = icon + gap + label.width;
    const x0 = cx - total / 2;
    label.setPosition(x0 + icon + gap, cy);
    const binColour = hot ? RED : hasPart ? CYAN : GREY;
    gfx.lineStyle(2, binColour, 1);
    gfx.lineBetween(x0 - 1, cy - icon * 0.45, x0 + icon + 1, cy - icon * 0.45); // lid
    gfx.lineBetween(x0 + icon * 0.35, cy - icon * 0.6, x0 + icon * 0.65, cy - icon * 0.6); // handle
    gfx.strokeRect(x0 + icon * 0.1, cy - icon * 0.3, icon * 0.8, icon * 0.85); // body
  }
}
