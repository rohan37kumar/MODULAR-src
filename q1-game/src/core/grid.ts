import { isNode } from '../data/parts';
import { addCell, cellKey, DIR_VEC, DIRS } from './math';
import type { Cell, Dir, MirrorOrient, PartId, PlacedPart, ShipJSON } from './types';

/** From a node slot (a cell corner) to the four cells around it, and from a cell to its four corners: NW, NE, SE, SW. */
export const CORNERS: readonly Cell[] = [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }];

const half = (v: number) => Number.isInteger(v - 0.5);

/**
 * The ship's part layout: a 7×7 grid of octagon cells (-3..3) around a fixed cockpit at (0,0), plus the
 * 8×8 node slots at the cell corners (-3.5..3.5), where the square nodes sit (see `isNode`).
 * Octagons touch their 4 edge neighbours and their 4 corner nodes; a node touches the 4 cells around it.
 * Pure data; rendering and physics live elsewhere.
 */
export class ShipGrid {
  static RADIUS = 3;

  private byCell = new Map<string, PlacedPart>();
  private nextUid = 1;

  constructor() {
    this.byCell.set(cellKey({ x: 0, y: 0 }), { uid: 0, id: 'cockpit', x: 0, y: 0, facing: 0 });
  }

  static fromJSON(j: ShipJSON): ShipGrid {
    const g = new ShipGrid();
    for (const p of j.parts) {
      if (p.id === 'cockpit') continue;
      g.place(p.id, { x: p.x, y: p.y }, p.facing, p.orient);
    }
    return g;
  }

  static inBounds(c: Cell): boolean {
    return Math.abs(c.x) <= ShipGrid.RADIUS && Math.abs(c.y) <= ShipGrid.RADIUS;
  }

  /** An octagon cell: integer coordinates inside the 7×7. */
  static isCell(c: Cell): boolean {
    return Number.isInteger(c.x) && Number.isInteger(c.y) && ShipGrid.inBounds(c);
  }

  /** A node slot: a cell corner (half-integer coordinates), including the outer rim. */
  static isNodeSlot(c: Cell): boolean {
    const r = ShipGrid.RADIUS + 0.5;
    return half(c.x) && half(c.y) && Math.abs(c.x) <= r && Math.abs(c.y) <= r;
  }

  /** Can part `id` sit at `c`? Nodes go in slots, everything else in cells. */
  static fits(id: PartId, c: Cell): boolean {
    return isNode(id) ? ShipGrid.isNodeSlot(c) : ShipGrid.isCell(c);
  }

  toJSON(): ShipJSON {
    return {
      parts: this.parts()
        .filter(p => p.uid !== 0)
        .map(p => (p.orient ? { id: p.id, x: p.x, y: p.y, facing: p.facing, orient: p.orient } : { id: p.id, x: p.x, y: p.y, facing: p.facing })),
    };
  }

  clone(): ShipGrid {
    const g = new ShipGrid();
    g.byCell = new Map([...this.byCell].map(([k, p]) => [k, { ...p }]));
    g.nextUid = this.nextUid;
    return g;
  }

  get(x: number, y: number): PlacedPart | undefined {
    return this.byCell.get(cellKey({ x, y }));
  }

  byUid(uid: number): PlacedPart | undefined {
    for (const p of this.byCell.values()) if (p.uid === uid) return p;
    return undefined;
  }

  /** All parts, sorted by uid (cockpit first). */
  parts(): PlacedPart[] {
    return [...this.byCell.values()].sort((a, b) => a.uid - b.uid);
  }

  count(): number {
    return this.byCell.size;
  }

  /**
   * Everything `p` touches. An octagon: its edge neighbours (up, right, down, left), then its corner nodes
   * (NW, NE, SE, SW). A node: the octagons around it (NW, NE, SE, SW). Nodes never touch each other.
   */
  touching(p: { id: PartId; x: number; y: number }): PlacedPart[] {
    const at = (c: Cell) => this.get(c.x, c.y);
    const corners = CORNERS.map(o => at({ x: p.x + o.x, y: p.y + o.y }));
    const out = isNode(p.id) ? corners : [...DIRS.map(d => at(addCell(p, d))), ...corners];
    return out.filter((n): n is PlacedPart => !!n);
  }

  /**
   * Bolts a floating part onto the free neighbour of `contact` nearest `point`
   * (both in cell units, ship-local). Ties break up, right, down, left.
   * The part faces away from the contacted cell. Returns null when no neighbour is free.
   */
  attach(id: PartId, contact: Cell, point: { x: number; y: number }): PlacedPart | null {
    // A node can't anchor an octagon (octagons join edge to edge), so a node contact hands over to its nearest octagon.
    const hit = this.get(contact.x, contact.y);
    if (hit && isNode(hit.id)) {
      const d2 = (c: Cell) => (c.x - point.x) ** 2 + (c.y - point.y) ** 2;
      const oct = this.touching(hit).sort((a, b) => d2(a) - d2(b))[0];
      if (!oct) return null;
      contact = { x: oct.x, y: oct.y };
    }
    let best: { cell: Cell; dir: Dir; d2: number } | null = null;
    const consider = (cell: Cell, dir: Dir) => {
      if (!ShipGrid.fits(id, cell) || this.get(cell.x, cell.y)) return;
      const d2 = (cell.x - point.x) ** 2 + (cell.y - point.y) ** 2;
      if (!best || d2 < best.d2) best = { cell, dir, d2 };
    };
    if (isNode(id)) for (const o of CORNERS) consider({ x: contact.x + o.x, y: contact.y + o.y }, 0);
    else for (const dir of DIRS) consider(addCell(contact, dir), dir);
    if (!best) return null;
    const b = best as { cell: Cell; dir: Dir };
    return this.place(id, b.cell, isNode(id) ? awayFromCockpit(b.cell) : b.dir);
  }

  /** Puts a part at an exact cell. Mirrors default to orientation '/'. */
  place(id: PartId, cell: Cell, facing: Dir, orient?: MirrorOrient): PlacedPart | null {
    if (id === 'cockpit' || !ShipGrid.fits(id, cell) || this.get(cell.x, cell.y)) return null;
    const p: PlacedPart = { uid: this.nextUid++, id, x: cell.x, y: cell.y, facing };
    if (id === 'mirror') p.orient = orient ?? '/';
    this.byCell.set(cellKey(cell), p);
    return p;
  }

  /** Moves a part to an empty cell (a node to an empty slot). May leave parts disconnected; see isValid(). */
  move(uid: number, to: Cell): boolean {
    const p = this.byUid(uid);
    if (!p || uid === 0 || !ShipGrid.fits(p.id, to) || this.get(to.x, to.y)) return false;
    this.byCell.delete(cellKey(p));
    p.x = to.x;
    p.y = to.y;
    this.byCell.set(cellKey(to), p);
    return true;
  }

  /** Mirrors toggle '/' ⇄ '\'; everything else turns 90° clockwise. */
  rotate(uid: number): boolean {
    const p = this.byUid(uid);
    if (!p || uid === 0) return false;
    if (p.id === 'mirror') p.orient = p.orient === '/' ? '\\' : '/';
    else p.facing = ((p.facing + 1) % 4) as Dir;
    return true;
  }

  jettison(uid: number): boolean {
    const p = this.byUid(uid);
    if (!p || uid === 0) return false;
    return this.byCell.delete(cellKey(p));
  }

  /** Octagons with no edge-to-edge path back to the cockpit, and nodes touching no connected octagon; sorted by uid. */
  disconnected(): PlacedPart[] {
    const seen = new Set<string>([cellKey({ x: 0, y: 0 })]);
    const queue: Cell[] = [{ x: 0, y: 0 }];
    while (queue.length) {
      const c = queue.shift()!;
      for (const v of Object.values(DIR_VEC)) {
        const n = { x: c.x + v.x, y: c.y + v.y };
        const k = cellKey(n);
        if (!seen.has(k) && this.byCell.has(k)) {
          seen.add(k);
          queue.push(n);
        }
      }
    }
    return this.parts().filter(p => isNode(p.id) ? !this.touching(p).some(o => seen.has(cellKey(o))) : !seen.has(cellKey(p)));
  }

  isValid(): boolean {
    return this.disconnected().length === 0;
  }
}

/** Where a Blueprint start part goes: the cell in front of the cockpit, or for a node the gap at its front-right corner. */
export function blueprintSpot(id: PartId): Cell {
  return isNode(id) ? { x: 0.5, y: -0.5 } : { x: 0, y: -1 };
}

/** A newly attached node faces away from the cockpit along its longer axis (ties go vertical). */
export function awayFromCockpit(c: Cell): Dir {
  if (Math.abs(c.x) > Math.abs(c.y)) return c.x > 0 ? 1 : 3;
  return c.y > 0 ? 2 : 0;
}
