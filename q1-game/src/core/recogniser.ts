import { SIG_BY_ID, SIGNATURES } from '../data/signatures';
import type { ShipGrid } from './grid';
import { traceLines } from './lines';
import { withMimicsResolved } from './mimic';
import type { PartId, PlacedPart, Route, SignatureId, SignatureMatch } from './types';

const SHOT_BOLTS: PartId[] = ['pulse', 'needle'];

/** Line signatures: a source whose line's first modifier is `mod` (design §11). */
const LINE_RULES: { id: SignatureId; sources: PartId[]; mod: PartId }[] = [
  { id: 'splitBeam', sources: ['beam'], mod: 'mirror' },
  { id: 'slugRound', sources: ['pulse'], mod: 'lens' },
  { id: 'trident', sources: ['beam'], mod: 'prism' },
];

/**
 * Touch signatures: a touching pair (`grid.touching`), one part from each side. Halo, Gravity Sling and
 * Afterburner Lance were line combos until Orbit Ring and Thruster became nodes (2026-10-31): a node gives
 * the weapon it touches its old line effect, so the recipe is now "the node touches the weapon".
 */
const TOUCH_RULES: { id: SignatureId; a: PartId[]; b: PartId[] }[] = [
  { id: 'halo', a: ['orbit'], b: ['beam'] },
  { id: 'gravitySling', a: ['orbit'], b: SHOT_BOLTS },
  { id: 'afterburnerLance', a: ['thruster'], b: ['lens'] },
  { id: 'clusterShell', a: ['bomb'], b: SHOT_BOLTS },
  { id: 'shatterstorm', a: ['cryo'], b: SHOT_BOLTS },
  { id: 'jumpstart', a: ['arc'], b: ['repair'] },
  { id: 'coinSlinger', a: ['magnet'], b: SHOT_BOLTS },
  { id: 'stormSeed', a: ['arc'], b: ['bomb'] },
  { id: 'ricochet', a: ['saw'], b: ['relay'] },
  { id: 'flashFreeze', a: ['overclock'], b: ['cryo'] },
  { id: 'domino', a: ['relay'], b: ['pulse'] },
];

/** Hook signatures: a source whose line passes through a Hook that touches the payload part (addendum A§3). */
const HOOK_RULES: { id: SignatureId; sources: PartId[]; payload: PartId }[] = [
  { id: 'stickyBomb', sources: SHOT_BOLTS, payload: 'bomb' },
  { id: 'lightningRod', sources: ['beam'], payload: 'arc' },
];

/**
 * Layer 3 of the combo engine: finds every named signature on the ship.
 * Matches are deduplicated by id + participants, and a match fully contained in a
 * larger signature that supersedes it is dropped (design §9.4, "overlaps").
 * Output is in Archive order, then by participant uids.
 *
 * `grid` must already have its Mimics resolved (`withMimicsResolved`); pass their uids as `mimics`
 * so any combo a Mimic completes is also credited as Impostor. Outside the loadout, use `recogniseShip`.
 */
export function recognise(grid: ShipGrid, mimics: Set<number> = new Set()): SignatureMatch[] {
  const found = new Map<string, SignatureMatch>();
  const add = (id: SignatureId, uids: number[]) => {
    const sorted = [...new Set(uids)].sort((a, b) => a - b);
    found.set(`${id}:${sorted.join(',')}`, { id, uids: sorted });
  };

  const parts = grid.parts();
  const routesOf = new Map<number, Route[]>(parts.map(p => [p.uid, traceLines(grid, p.uid)]));
  const neighbours = (p: PlacedPart): PlacedPart[] => grid.touching(p);

  for (const rule of LINE_RULES) {
    for (const p of parts) {
      if (!rule.sources.includes(p.id)) continue;
      for (const r of routesOf.get(p.uid)!) {
        const first = r.steps[0];
        if (first?.partId === rule.mod) add(rule.id, [p.uid, first.uid]);
      }
    }
  }

  for (const beam of parts.filter(p => p.id === 'beam')) {
    const routes = routesOf.get(beam.uid)!;
    let resonant = false;
    for (const r of routes) {
      const [m1, m2] = r.steps;
      if (m1?.partId !== 'mirror' || m2?.partId !== 'mirror' || m1.turned !== false) continue;
      const adjacent = Math.abs(m1.cell.x - m2.cell.x) + Math.abs(m1.cell.y - m2.cell.y) === 1;
      if (adjacent && grid.byUid(m1.uid)!.orient !== grid.byUid(m2.uid)!.orient) {
        add('resonator', [beam.uid, m1.uid, m2.uid]);
        resonant = true;
      }
    }
    const mirrors = new Set(routes.flatMap(r => r.steps.filter(s => s.partId === 'mirror').map(s => s.uid)));
    const startsAtMirror = routes.some(r => r.steps[0]?.partId === 'mirror');
    if (startsAtMirror && mirrors.size >= 2 && !resonant) add('hallOfMirrors', [beam.uid, ...mirrors]);
  }

  for (const rule of TOUCH_RULES) {
    for (const a of parts) {
      if (!rule.a.includes(a.id)) continue;
      for (const b of neighbours(a)) if (rule.b.includes(b.id)) add(rule.id, [a.uid, b.uid]);
    }
  }

  for (const rule of HOOK_RULES) {
    for (const p of parts) {
      if (!rule.sources.includes(p.id)) continue;
      for (const r of routesOf.get(p.uid)!) {
        for (const step of r.steps) {
          if (step.partId !== 'hook') continue;
          for (const n of neighbours(grid.byUid(step.uid)!)) if (n.id === rule.payload) add(rule.id, [p.uid, step.uid, n.uid]);
        }
      }
    }
  }

  // Porcupine: a Magnet node and a Bulwark node on the same octagon (two nodes never touch each other directly).
  for (const m of parts.filter(p => p.id === 'magnet')) {
    for (const o of neighbours(m)) for (const b of neighbours(o)) if (b.id === 'bulwark') add('porcupine', [m.uid, b.uid]);
  }

  // Grand Finale: bomb A touching bomb B, a pulse touching either, an echo touching either.
  for (const a of parts.filter(p => p.id === 'bomb')) {
    for (const b of neighbours(a).filter(n => n.id === 'bomb')) {
      const around = [...neighbours(a), ...neighbours(b)];
      const pulse = around.find(n => n.id === 'pulse');
      const echo = around.find(n => n.id === 'echo');
      if (pulse && echo) add('grandFinale', [a.uid, b.uid, pulse.uid, echo.uid]);
    }
  }

  const all = [...found.values()];
  const kept = all.filter(m =>
    !all.some(big => big !== m && SIG_BY_ID[big.id].supersedes.includes(m.id) && m.uids.every(u => big.uids.includes(u))));
  // Impostor rides along with every kept combo a Mimic helped complete (same participants).
  const impostors = new Map<string, SignatureMatch>();
  for (const m of kept) if (m.uids.some(u => mimics.has(u))) impostors.set(m.uids.join(','), { id: 'impostor', uids: m.uids });
  kept.push(...impostors.values());
  const order = new Map(SIGNATURES.map(s => [s.id, s.index]));
  return kept.sort((x, y) => order.get(x.id)! - order.get(y.id)! || x.uids.join(',').localeCompare(y.uids.join(',')));
}

/** Recognises a ship as built: resolves its Mimics first, then credits Impostor. */
export function recogniseShip(grid: ShipGrid): SignatureMatch[] {
  const { grid: g, mimics } = withMimicsResolved(grid);
  return recognise(g, mimics);
}
