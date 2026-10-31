import { PARTS } from '../data/parts';
import type { ShipGrid } from './grid';
import { addCell, DIRS } from './math';
import type { Family, PartId } from './types';

/** Tie-break order between part families (design addendum A§1, Mimic). */
const FAMILY_RANK: Record<Family, number> = { core: 3, weapon: 0, modifier: 1, utility: 2 };

/**
 * What each Mimic copies: the part type it touches most. Ties go weapon > modifier > utility,
 * then to the type of the lowest-uid neighbour. Only the cockpit and other Mimics are never copied;
 * a Mimic with nothing else to copy resolves to `'cockpit'` (the pea-shooter).
 */
export function resolveMimics(grid: ShipGrid): Map<number, PartId> {
  const out = new Map<number, PartId>();
  for (const p of grid.parts()) {
    if (p.id !== 'mimic') continue;
    const tally = new Map<PartId, { n: number; minUid: number }>();
    for (const d of DIRS) {
      const c = addCell(p, d);
      const n = grid.get(c.x, c.y);
      if (!n || n.id === 'mimic' || n.id === 'cockpit') continue;
      const t = tally.get(n.id);
      if (t) { t.n++; t.minUid = Math.min(t.minUid, n.uid); } else tally.set(n.id, { n: 1, minUid: n.uid });
    }
    let best: PartId = 'cockpit';
    let bestT: { n: number; minUid: number } | null = null;
    for (const [id, t] of tally) {
      const better = !bestT || t.n > bestT.n || (t.n === bestT.n && (
        FAMILY_RANK[PARTS[id].family] < FAMILY_RANK[PARTS[best].family]
        || (FAMILY_RANK[PARTS[id].family] === FAMILY_RANK[PARTS[best].family] && t.minUid < bestT.minUid)));
      if (better) { best = id; bestT = t; }
    }
    out.set(p.uid, best);
  }
  return out;
}

/**
 * A clone of the grid with every Mimic replaced by the part it copies (uids, cells and facings kept),
 * plus the set of Mimic uids. Traits, lines, recognition and the loadout all run on this grid.
 */
export function withMimicsResolved(grid: ShipGrid): { grid: ShipGrid; mimics: Set<number> } {
  const resolved = resolveMimics(grid);
  const g = grid.clone();
  for (const [uid, id] of resolved) {
    const p = g.byUid(uid)!;
    p.id = id;
    // Rotate turns a Mimic's facing, never an orientation: even facings read '/', odd ones '\\'.
    if (id === 'mirror') p.orient = p.facing % 2 === 0 ? '/' : '\\';
  }
  return { grid: g, mimics: new Set(resolved.keys()) };
}
