/**
 * Pure screen layout for the Forge Uplink editor (no Phaser, so it is unit-testable).
 * Landscape: grid centred in the left area; on the right a column with the part info card on top and the buttons below.
 * Portrait (h > w): grid in the top ~70%, then the part info card, then a row of buttons.
 */

export interface Rect { x: number; y: number; w: number; h: number }

export interface ForgeLayout {
  cell: number;
  /** Top-left px of the 7×7 grid. */
  gridX: number;
  gridY: number;
  portrait: boolean;
  buttons: { rotate: Rect; jettison: Rect; accept: Rect };
  titleY: number;
  tutorialY: number;
  /** Top of the part info card (= `info.y`). */
  infoY: number;
  /** The part info card: the selected part's name, kind and plain card lines (above the buttons). */
  info: Rect;
  /** Horizontal centre and wrap width for the title, tutorial and info text. */
  textX: number;
  textW: number;
}

const SIZE = 7;
const HALF = 3;
const MARGIN = 16;
const GAP = 12;
const BTN_H = 52;
/** Portrait info card height: a name line plus about four wrapped lines. */
const INFO_H = 84;
export const MIN_TOUCH = 44;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

export function computeForgeLayout(w: number, h: number): ForgeLayout {
  const portrait = h > w;
  const base = (Math.min(w, h) * 0.8) / SIZE;

  if (portrait) {
    const titleY = MARGIN;
    const tutorialY = MARGIN + 28;
    const top = MARGIN + 68; // room for the title plus a tutorial that wraps to two lines
    const bottomBlock = INFO_H + GAP + BTN_H + MARGIN;
    const regionBottom = Math.min(h * 0.7, h - bottomBlock);
    const cell = Math.max(4, Math.min(base, (w - 2 * MARGIN) / SIZE, (regionBottom - top) / SIZE));
    const size = cell * SIZE;
    const gridX = (w - size) / 2;
    const gridY = top + Math.max(0, (regionBottom - top - size) / 2);
    const infoY = gridY + size + 6;
    const rowY = Math.min(Math.max(infoY + INFO_H, h * 0.72), h - MARGIN - BTN_H);
    const info: Rect = { x: MARGIN, y: infoY, w: w - 2 * MARGIN, h: Math.max(0, rowY - GAP / 2 - infoY) };
    // Accept is wider so "Reconnect all parts" fits.
    const unit = (w - 2 * MARGIN - 2 * GAP) / 3.5;
    const rotate: Rect = { x: MARGIN, y: rowY, w: unit, h: BTN_H };
    const jettison: Rect = { x: MARGIN + unit + GAP, y: rowY, w: unit, h: BTN_H };
    const accept: Rect = { x: MARGIN + 2 * (unit + GAP), y: rowY, w: unit * 1.5, h: BTN_H };
    return {
      cell, gridX, gridY, portrait, buttons: { rotate, jettison, accept },
      titleY, tutorialY, infoY, info, textX: w / 2, textW: w - 2 * MARGIN,
    };
  }

  const titleY = MARGIN;
  const tutorialY = MARGIN + 30;
  const top = MARGIN + 60;
  const colW = clamp(w * 0.22, 140, 260);
  const availW = w - 3 * MARGIN - colW;
  const availH = h - top - MARGIN;
  const cell = Math.max(4, Math.min(base, availW / SIZE, availH / SIZE));
  const size = cell * SIZE;
  const gridX = MARGIN + (availW - size) / 2;
  const gridY = top + Math.max(0, (availH - size) / 2);

  const colX = w - MARGIN - colW;
  const acceptGap = GAP * 2.5; // keep Accept apart from the destructive buttons
  const colH = 3 * BTN_H + GAP + acceptGap;
  // Buttons at the bottom of the column, so the info card above them gets the height.
  const y0 = Math.max(MARGIN, h - MARGIN - colH);
  const rotate: Rect = { x: colX, y: y0, w: colW, h: BTN_H };
  const jettison: Rect = { x: colX, y: y0 + BTN_H + GAP, w: colW, h: BTN_H };
  const accept: Rect = { x: colX, y: y0 + 2 * BTN_H + GAP + acceptGap, w: colW, h: BTN_H };
  const info: Rect = { x: colX, y: top, w: colW, h: Math.max(0, y0 - GAP - top) };
  return {
    cell, gridX, gridY, portrait, buttons: { rotate, jettison, accept },
    titleY, tutorialY, infoY: info.y, info, textX: MARGIN + availW / 2, textW: availW,
  };
}

/** Grid cell (-3..3 on both axes) under a screen point, or null outside the grid. */
export function pointToCell(L: ForgeLayout, px: number, py: number): { x: number; y: number } | null {
  const gx = Math.floor((px - L.gridX) / L.cell);
  const gy = Math.floor((py - L.gridY) / L.cell);
  if (!(gx >= 0 && gx < SIZE && gy >= 0 && gy < SIZE)) return null;
  return { x: gx - HALF, y: gy - HALF };
}

export function cellCenter(L: ForgeLayout, c: { x: number; y: number }): { x: number; y: number } {
  return { x: L.gridX + (c.x + HALF + 0.5) * L.cell, y: L.gridY + (c.y + HALF + 0.5) * L.cell };
}

/** Continuous grid coordinates under a screen point: cell centres are integers, node slots (cell corners) half-integers. */
export function pointToGrid(L: ForgeLayout, px: number, py: number): { x: number; y: number } {
  return { x: (px - L.gridX) / L.cell - HALF - 0.5, y: (py - L.gridY) / L.cell - HALF - 0.5 };
}

/**
 * The node slot (cell corner, half-integer coordinates within ±3.5, rim included) nearest a screen point,
 * and the pointer's distance from it in cells. Always returns a slot; callers gate on `dist`.
 */
export function nearestSlot(L: ForgeLayout, px: number, py: number): { x: number; y: number; dist: number } {
  const g = pointToGrid(L, px, py);
  const r = HALF + 0.5;
  const x = clamp(Math.floor(g.x) + 0.5, -r, r);
  const y = clamp(Math.floor(g.y) + 0.5, -r, r);
  return { x, y, dist: Math.hypot(g.x - x, g.y - y) };
}

/** Half-diagonal of a node's diamond frame, as a fraction of the cell size (fits the gap where four octagons meet). */
export const NODE_FRAME = 0.36;

/** A diamond (45°-rotated square) centred on cx,cy with half-diagonal NODE_FRAME · s. Top, right, bottom, left. */
export function diamondPoints(cx: number, cy: number, s: number): { x: number; y: number }[] {
  const h = NODE_FRAME * s;
  return [{ x: cx, y: cy - h }, { x: cx + h, y: cy }, { x: cx, y: cy + h }, { x: cx - h, y: cy }];
}

export function hitRect(r: Rect, px: number, py: number): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
