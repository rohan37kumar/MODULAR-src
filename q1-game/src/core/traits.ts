import { LINE_NODE_IDS, PARTS } from '../data/parts';
import type { ShipGrid } from './grid';
import type { TraitId } from './types';

/**
 * Layer 1 of the combo engine (design §9.2): every part gives its trait to everything it touches
 * (`grid.touching`: edge neighbours, then corner nodes; a node gives to the 4 octagons around it).
 * Returns the traits each part receives, keyed by uid (every part, cockpit included), in touching order,
 * without duplicates. Neighbours with no trait (the cockpit) give nothing.
 * An Orbit or Echo node gives a routed weapon its line effect instead (see `compileLoadout`), not its trait.
 */
export function computeTraits(grid: ShipGrid): Map<number, TraitId[]> {
  const out = new Map<number, TraitId[]>();
  for (const p of grid.parts()) {
    const received: TraitId[] = [];
    for (const n of grid.touching(p)) {
      if (LINE_NODE_IDS.has(n.id) && PARTS[p.id].routes) continue;
      const trait = PARTS[n.id].trait;
      if (trait && !received.includes(trait)) received.push(trait);
    }
    out.set(p.uid, received);
  }
  return out;
}
