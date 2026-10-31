import type { Dir, MirrorOrient, PartId, ShipJSON, SignatureId } from '../core/types';
import { diamondPoints, octagonPoints, PART_SHAPES, partColour, type ShapePath } from '../data/partShapes';
import { isNode, PARTS } from '../data/parts';
import { SIG_BY_ID, SIGNATURES } from '../data/signatures';

/**
 * End-of-run "ship snapshot": a 1080×1350 neon share card of the final ship, drawn with plain Canvas2D
 * (no Phaser), plus a save/share helper. The pure layout maths is exported separately so it can be
 * unit-tested in Node; only `renderSnapshot` and `downloadSnapshot` touch the DOM.
 */

export interface SnapshotStats {
  timeMs: number; kills: number; parts: number;
  newThisRun: SignatureId[]; firedThisRun: SignatureId[];
  archiveCount: number;
  /** Parts newly unlocked as Blueprint starts this run (may be empty). */
  blueprints: PartId[];
}

export const SNAPSHOT_W = 1080;
export const SNAPSHOT_H = 1350;
const ARCHIVE_TOTAL = SIGNATURES.length;

/** Hero box for the ship (centre and size, px). */
const SHIP_BOX = { cx: SNAPSHOT_W / 2, cy: 490, w: 760, h: 660 };
/** A single cockpit would otherwise fill the whole box. */
const MAX_CELL_PX = 150;

const BG = '#05060a';
const CYAN = 0x00e5ff;
const LABEL_FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const NUM_FONT = "Consolas, 'Courier New', monospace";

// ---- Pure helpers (tested) -----------------------------------------------------------------

export interface SnapCell { id: PartId; x: number; y: number; facing: Dir; orient?: MirrorOrient }

/** Every cell to draw: the implicit cockpit at (0,0) first, then the ship's parts (duplicates dropped). */
export function shipCells(ship: ShipJSON): SnapCell[] {
  const out: SnapCell[] = [{ id: 'cockpit', x: 0, y: 0, facing: 0 }];
  const seen = new Set(['0,0']);
  for (const p of ship.parts) {
    const k = `${p.x},${p.y}`;
    if (p.id === 'cockpit' || seen.has(k)) continue;
    seen.add(k);
    out.push({ id: p.id, x: p.x, y: p.y, facing: p.facing, orient: p.orient });
  }
  return out;
}

export interface GridBounds { minX: number; maxX: number; minY: number; maxY: number; cols: number; rows: number }

export function gridBounds(cells: { x: number; y: number }[]): GridBounds {
  if (cells.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, cols: 1, rows: 1 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of cells) {
    minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
    minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
  }
  return { minX, maxX, minY, maxY, cols: maxX - minX + 1, rows: maxY - minY + 1 };
}

/** Cell size in px so a `cols × rows` grid fits the box, capped at `maxCell`. */
export function fitCellSize(cols: number, rows: number, boxW: number, boxH: number, maxCell = MAX_CELL_PX): number {
  return Math.min(boxW / Math.max(1, cols), boxH / Math.max(1, rows), maxCell);
}

/** Centre (px) of grid cell (x, y) when the grid's bounding box is centred on (cx, cy). */
export function cellCentre(x: number, y: number, b: GridBounds, cell: number, cx: number, cy: number): { x: number; y: number } {
  return { x: cx + (x - (b.minX + b.maxX) / 2) * cell, y: cy + (y - (b.minY + b.maxY) / 2) * cell };
}

/** Run time as m:ss (minutes are not capped: 75 min reads 75:00). */
export function formatRunTime(ms: number): string {
  const s = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Integer with thousands separators: 12345 → "12,345". */
export function formatCount(n: number): string {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export interface ComboLine { id: SignatureId; name: string; colour: number; isNew: boolean }

/**
 * The combos to list: `fired` in order, deduped, unknown ids dropped. A new discovery missing from
 * `fired` is appended too, so a discovery is never left off the card.
 */
export function comboLines(fired: SignatureId[], fresh: SignatureId[]): ComboLine[] {
  const freshSet = new Set(fresh);
  const seen = new Set<SignatureId>();
  const out: ComboLine[] = [];
  for (const id of [...fired, ...fresh]) {
    const sig = SIG_BY_ID[id];
    if (!sig || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: sig.name, colour: sig.colour, isNew: freshSet.has(id) });
  }
  return out;
}

/** One column up to 6 lines, otherwise two (the left column takes the odd one). */
export function comboColumns<T>(lines: T[]): T[][] {
  if (lines.length <= 6) return [lines];
  const half = Math.ceil(lines.length / 2);
  return [lines.slice(0, half), lines.slice(half)];
}

/** Deterministic seed from the ship layout: the same ship always gets the same starfield. */
export function seedFromShip(ship: ShipJSON): number {
  const key = shipCells(ship).map(c => `${c.id}:${c.x}:${c.y}:${c.facing}:${c.orient ?? ''}`).join('|');
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: a tiny seeded PRNG returning [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 0xRRGGBB → "rgba(r,g,b,a)". */
export function rgba(colour: number, alpha = 1): string {
  return `rgba(${(colour >> 16) & 255},${(colour >> 8) & 255},${colour & 255},${alpha})`;
}

/** Blend a colour toward white by `t` (0..1): the hot core of a neon tube. */
export function whiten(colour: number, t: number): number {
  const ch = (s: number) => {
    const c = (colour >> s) & 255;
    return Math.round(c + (255 - c) * t);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

// ---- Drawing ---------------------------------------------------------------------------------

type Ctx = CanvasRenderingContext2D;

/** Width of `text` as spacedText draws it, in the current font. */
function spacedWidth(ctx: Ctx, text: string, spacing: number): number {
  const chars = [...text];
  return chars.reduce((a, c) => a + ctx.measureText(c).width, 0) + spacing * Math.max(0, chars.length - 1);
}

/** Text with manual letter spacing (ctx.letterSpacing is not universal yet), centred on cx. */
function spacedText(ctx: Ctx, text: string, cx: number, y: number, spacing: number): void {
  const chars = [...text];
  const widths = chars.map(c => ctx.measureText(c).width);
  let x = cx - spacedWidth(ctx, text, spacing) / 2;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
}

function glow(ctx: Ctx, colour: number, blur: number, alpha = 1): void {
  ctx.shadowColor = rgba(colour, alpha);
  ctx.shadowBlur = blur;
}

function noGlow(ctx: Ctx): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

function background(ctx: Ctx, rand: () => number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SNAPSHOT_W, SNAPSHOT_H);

  // Two faint nebula washes: player cyan high, swarm magenta low.
  const wash = (x: number, y: number, r: number, colour: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(colour, a));
    g.addColorStop(1, rgba(colour, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SNAPSHOT_W, SNAPSHOT_H);
  };
  wash(200 + rand() * 680, 300 + rand() * 200, 620, CYAN, 0.07);
  wash(150 + rand() * 780, 1000 + rand() * 250, 560, 0xff00c8, 0.05);

  // Faint grid.
  ctx.strokeStyle = rgba(CYAN, 0.035);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= SNAPSHOT_W; x += 54) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, SNAPSHOT_H); }
  for (let y = 0; y <= SNAPSHOT_H; y += 54) { ctx.moveTo(0, y + 0.5); ctx.lineTo(SNAPSHOT_W, y + 0.5); }
  ctx.stroke();

  // Starfield (same mix as the in-game layers: mostly white, every ninth star pale cyan).
  for (let i = 0; i < 260; i++) {
    const x = rand() * SNAPSHOT_W, y = rand() * SNAPSHOT_H;
    const r = 0.5 + rand() * (i % 5 === 0 ? 1.8 : 0.9);
    ctx.fillStyle = i % 9 === 0 ? `rgba(158,240,255,${0.3 + rand() * 0.6})` : `rgba(255,255,255,${0.2 + rand() * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vignette.
  const v = ctx.createRadialGradient(SNAPSHOT_W / 2, SNAPSHOT_H / 2, SNAPSHOT_H * 0.3, SNAPSHOT_W / 2, SNAPSHOT_H / 2, SNAPSHOT_H * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, SNAPSHOT_W, SNAPSHOT_H);

  // HUD frame: a thin inset border with brighter corner brackets.
  const m = 24, L = 46;
  ctx.strokeStyle = rgba(CYAN, 0.16);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m, m, SNAPSHOT_W - 2 * m, SNAPSHOT_H - 2 * m);
  ctx.strokeStyle = rgba(CYAN, 0.7);
  ctx.lineWidth = 3;
  glow(ctx, CYAN, 10);
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [SNAPSHOT_W - m, m, -1, 1], [m, SNAPSHOT_H - m, 1, -1], [SNAPSHOT_W - m, SNAPSHOT_H - m, -1, -1]]) {
    ctx.moveTo(x, y + sy * L);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * L, y);
  }
  ctx.stroke();
  noGlow(ctx);
}

function header(ctx: Ctx): void {
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 64px ${LABEL_FONT}`;
  ctx.fillStyle = rgba(whiten(CYAN, 0.35));
  glow(ctx, CYAN, 26);
  spacedText(ctx, 'MODULAR', SNAPSHOT_W / 2, 100, 22);
  spacedText(ctx, 'MODULAR', SNAPSHOT_W / 2, 100, 22); // second pass doubles the bloom
  noGlow(ctx);
  ctx.font = `600 20px ${LABEL_FONT}`;
  ctx.fillStyle = rgba(CYAN, 0.6);
  spacedText(ctx, 'SALVAGE LOG', SNAPSHOT_W / 2, 140, 9);
}

/** Traces one ShapePath in unit-cell coordinates (the context is already scaled to the cell). */
function trace(ctx: Ctx, p: ShapePath): void {
  ctx.beginPath();
  p.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  if (p.closed) ctx.closePath();
}

/**
 * One part icon, matching BootScene.shapeTexture (faint fill on closed paths, a wide soft
 * under-stroke, a crisp stroke) and Ship.redraw (rotate by facing; a '\' mirror is the '/' icon
 * flipped horizontally, never rotated), with real shadow-blur glow and a hot white core on top.
 */
function drawPart(ctx: Ctx, c: SnapCell, px: number, py: number, size: number): void {
  const paths = PART_SHAPES[c.id];
  const colour = partColour(c.id);
  ctx.save();
  ctx.translate(px, py);
  if (c.id === 'mirror') {
    if (c.orient === '\\') ctx.scale(-1, 1);
  } else {
    ctx.rotate((c.facing * Math.PI) / 2);
  }
  ctx.scale(size, size);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const p of paths) {
    if (!p.closed) continue;
    ctx.fillStyle = rgba(colour, 0.14);
    trace(ctx, p);
    ctx.fill();
  }
  // Glow: one soft wide under-stroke, then the crisp stroke casting a modest shadow. Stacking more
  // (or drawing additively) saturates the white modifier icons into solid tiles.
  for (const p of paths) {
    ctx.strokeStyle = rgba(colour, 0.12);
    ctx.lineWidth = 0.18;
    trace(ctx, p);
    ctx.stroke();
  }
  glow(ctx, colour, Math.max(6, size * 0.13), 0.85);
  ctx.strokeStyle = rgba(colour, 1);
  ctx.lineWidth = 0.05;
  for (const p of paths) {
    trace(ctx, p);
    ctx.stroke();
  }
  noGlow(ctx);
  ctx.strokeStyle = rgba(whiten(colour, 0.7), 0.85);
  ctx.lineWidth = 0.017;
  for (const p of paths) {
    trace(ctx, p);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShip(ctx: Ctx, ship: ShipJSON): void {
  const cells = shipCells(ship);
  const b = gridBounds(cells);
  const size = fitCellSize(b.cols, b.rows, SHIP_BOX.w, SHIP_BOX.h);
  const at = (x: number, y: number) => cellCentre(x, y, b, size, SHIP_BOX.cx, SHIP_BOX.cy);

  // Soft engine-light halo behind the whole hull, strongest at the cockpit.
  const core = at(0, 0);
  const reach = Math.max(b.cols, b.rows) * size * 0.75 + size;
  const halo = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, reach);
  halo.addColorStop(0, rgba(CYAN, 0.16));
  halo.addColorStop(0.45, rgba(CYAN, 0.05));
  halo.addColorStop(1, rgba(CYAN, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, SNAPSHOT_W, SNAPSHOT_H);

  // Grid: faint dots on every lattice corner of the bounding box (+1 cell margin)...
  ctx.fillStyle = rgba(CYAN, 0.22);
  for (let gx = b.minX - 1; gx <= b.maxX + 2; gx++) {
    for (let gy = b.minY - 1; gy <= b.maxY + 2; gy++) {
      const p = at(gx - 0.5, gy - 0.5);
      if (p.x < 40 || p.x > SNAPSHOT_W - 40 || p.y < 160 || p.y > SHIP_BOX.cy + SHIP_BOX.h / 2 + 10) continue;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
  }
  // ...and a faint outline on every occupied cell, so the bolted-on structure reads.
  ctx.strokeStyle = rgba(CYAN, 0.16);
  ctx.lineWidth = Math.max(1, size * 0.012);
  for (const c of cells) {
    const p = at(c.x, c.y);
    const pts = isNode(c.id) ? diamondPoints(p.x, p.y, size) : octagonPoints(p.x, p.y, size - 4);
    ctx.beginPath();
    pts.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
    ctx.closePath();
    ctx.stroke();
  }

  // The cockpit gets its own bright pool of light so it reads as the heart of the ship.
  const pool = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, size * 0.9);
  pool.addColorStop(0, rgba(CYAN, 0.28));
  pool.addColorStop(1, rgba(CYAN, 0));
  ctx.fillStyle = pool;
  ctx.fillRect(core.x - size, core.y - size, size * 2, size * 2);

  for (const c of cells) {
    const p = at(c.x, c.y);
    drawPart(ctx, c, p.x, p.y, size);
  }
}

function stats(ctx: Ctx, s: SnapshotStats): void {
  const cols: [string, string][] = [
    [formatRunTime(s.timeMs), 'RUN TIME'],
    [formatCount(s.kills), 'KILLS'],
    [formatCount(s.parts), 'PARTS'],
  ];
  cols.forEach(([value, label], i) => {
    const cx = 180 + i * 360;
    ctx.font = `700 62px ${NUM_FONT}`;
    ctx.fillStyle = rgba(whiten(CYAN, 0.55));
    glow(ctx, CYAN, 18);
    ctx.textAlign = 'center';
    ctx.fillText(value, cx, 905);
    noGlow(ctx);
    ctx.font = `600 17px ${LABEL_FONT}`;
    ctx.fillStyle = rgba(CYAN, 0.55);
    spacedText(ctx, label, cx, 938, 5);
  });
  // Hairline separators between the three stats.
  ctx.strokeStyle = rgba(CYAN, 0.18);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const x of [360, 720]) { ctx.moveTo(x, 860); ctx.lineTo(x, 935); }
  ctx.stroke();
}

function divider(ctx: Ctx, y: number): void {
  const g = ctx.createLinearGradient(80, 0, SNAPSHOT_W - 80, 0);
  g.addColorStop(0, rgba(CYAN, 0));
  g.addColorStop(0.5, rgba(CYAN, 0.35));
  g.addColorStop(1, rgba(CYAN, 0));
  ctx.strokeStyle = g;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, y + 0.5);
  ctx.lineTo(SNAPSHOT_W - 80, y + 0.5);
  ctx.stroke();
}

const BADGE_W = 54;
const BADGE_GAP = 12;
const BULLET = 16;

function combos(ctx: Ctx, s: SnapshotStats): void {
  ctx.font = `600 17px ${LABEL_FONT}`;
  ctx.fillStyle = rgba(CYAN, 0.55);
  spacedText(ctx, 'COMBOS FIRED', SNAPSHOT_W / 2, 1002, 5);

  const lines = comboLines(s.firedThisRun, s.newThisRun);
  if (lines.length === 0) {
    ctx.font = `italic 400 26px ${LABEL_FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('No combos fired — the Archive is waiting.', SNAPSHOT_W / 2, 1090);
    return;
  }

  const columns = comboColumns(lines);
  const two = columns.length === 2;
  const step = two ? 27 : 31;
  const fontPx = two ? 23 : 26;
  const centres = two ? [290, 790] : [SNAPSHOT_W / 2];
  const rowWidth = (line: ComboLine) => {
    ctx.font = `600 ${fontPx}px ${LABEL_FONT}`;
    return BULLET + ctx.measureText(line.name).width + (line.isNew ? BADGE_GAP + BADGE_W : 0);
  };
  columns.forEach((col, ci) => {
    // Rows are left-aligned; the column block (its widest row) is centred on the column centre.
    const left = centres[ci] - Math.max(...col.map(rowWidth)) / 2;
    col.forEach((line, ri) => {
      const y = 1042 + ri * step;
      ctx.font = `600 ${fontPx}px ${LABEL_FONT}`;
      const nameW = ctx.measureText(line.name).width;
      let x = left;

      // Diamond bullet in the combo's colour.
      ctx.fillStyle = rgba(line.colour);
      glow(ctx, line.colour, 10);
      ctx.beginPath();
      const by = y - fontPx * 0.35;
      ctx.moveTo(x + 5, by - 5); ctx.lineTo(x + 10, by); ctx.lineTo(x + 5, by + 5); ctx.lineTo(x, by);
      ctx.closePath();
      ctx.fill();
      x += BULLET;

      ctx.textAlign = 'left';
      glow(ctx, line.colour, 14, 0.9);
      ctx.fillText(line.name, x, y);
      noGlow(ctx);
      x += nameW;

      if (line.isNew) {
        x += BADGE_GAP;
        const h = 22, top = y - fontPx * 0.35 - h / 2;
        ctx.fillStyle = rgba(CYAN);
        glow(ctx, CYAN, 12);
        roundRect(ctx, x, top, BADGE_W, h, 4);
        ctx.fill();
        noGlow(ctx);
        ctx.fillStyle = BG;
        ctx.font = `800 14px ${LABEL_FONT}`;
        spacedText(ctx, 'NEW', x + BADGE_W / 2, top + 16, 2);
      }
    });
  });
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function footer(ctx: Ctx, s: SnapshotStats): void {
  divider(ctx, 1258);
  const n = Math.max(0, Math.min(ARCHIVE_TOTAL, Math.floor(s.archiveCount)));

  // "XENO ARCHIVE 7/21" followed by one pip per signature, centred as one group (21 fit on one row).
  ctx.font = `700 22px ${LABEL_FONT}`;
  const label = `XENO ARCHIVE  ${n}/${ARCHIVE_TOTAL}`;
  const labelW = spacedWidth(ctx, label, 2);
  const pip = 12, pipGap = 6;
  const pipsW = ARCHIVE_TOTAL * pip + (ARCHIVE_TOTAL - 1) * pipGap;
  const total = labelW + 22 + pipsW;
  const left = SNAPSHOT_W / 2 - total / 2;
  const y = 1296;

  ctx.fillStyle = rgba(whiten(CYAN, 0.3));
  glow(ctx, CYAN, 12);
  spacedText(ctx, label, left + labelW / 2, y, 2);
  noGlow(ctx);

  let px = left + labelW + 22;
  for (let i = 0; i < ARCHIVE_TOTAL; i++, px += pip + pipGap) {
    const top = y - 15;
    if (i < n) {
      ctx.fillStyle = rgba(CYAN);
      glow(ctx, CYAN, 8);
      ctx.fillRect(px, top, pip, pip);
      noGlow(ctx);
    } else {
      ctx.strokeStyle = rgba(CYAN, 0.3);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 0.75, top + 0.75, pip - 1.5, pip - 1.5);
    }
  }

  if (s.blueprints.length > 0) {
    const names = s.blueprints.map(id => PARTS[id]?.name ?? id).join(', ');
    ctx.font = `600 19px ${LABEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(0x39ff88, 0.95);
    glow(ctx, 0x39ff88, 10);
    ctx.fillText(`Blueprint unlocked: ${names}`, SNAPSHOT_W / 2, 1328, SNAPSHOT_W - 120);
    noGlow(ctx);
  }
}

/** Draws the share card for a finished run. Pure Canvas2D, 1080×1350 (4:5 portrait). */
export function renderSnapshot(ship: ShipJSON, stats_: SnapshotStats): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SNAPSHOT_W;
  canvas.height = SNAPSHOT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const rand = mulberry32(seedFromShip(ship));
  background(ctx, rand);
  header(ctx);
  drawShip(ctx, ship);
  stats(ctx, stats_);
  divider(ctx, 966);
  combos(ctx, stats_);
  footer(ctx, stats_);
  return canvas;
}

const FILE_NAME = 'modular-run.png';

function isAbort(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError';
}

/**
 * Saves the card: the native share sheet where files can be shared (phones), otherwise a PNG
 * download. Never throws; a cancelled share sheet is silent.
 */
export async function downloadSnapshot(canvas: HTMLCanvasElement): Promise<void> {
  try {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      console.warn('[snapshot] canvas.toBlob returned null');
      return;
    }
    const file = new File([blob], FILE_NAME, { type: 'image/png' });
    let canShare = false;
    try {
      canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    } catch (e) {
      console.warn('[snapshot] canShare failed', e);
    }
    if (canShare) {
      try {
        await navigator.share({ files: [file], title: 'MODULAR run' });
        return;
      } catch (e) {
        if (isAbort(e)) return; // the player closed the share sheet
        console.warn('[snapshot] share failed, falling back to download', e);
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = FILE_NAME;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (e) {
    console.warn('[snapshot] save failed', e);
  }
}
