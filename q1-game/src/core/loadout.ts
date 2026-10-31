import { LINE_NODE_IDS, PARTS } from '../data/parts';
import type { ShipGrid } from './grid';
import { traceLines } from './lines';
import { withMimicsResolved } from './mimic';
import { recognise } from './recogniser';
import { baseShot, compileShot } from './shot';
import { computeTraits } from './traits';
import type { Loadout, MountSpec, PartId, Payload, PlacedPart, Route, RouteStep, SignatureId } from './types';

/** Damage bonus for any part taking part in a recognised signature. */
export const SIGNATURE_POWER = 1.5;
const PAYLOAD_ORDER: PartId[] = ['pulse', 'needle', 'cryo'];
const FEEDABLE: PartId[] = ['pulse', 'needle', 'cryo', 'cockpit'];
/** A Hook payload fires at this fraction of its gun's damage (addendum A§2.2). */
export const HOOK_PAYLOAD_MUL = 0.6;
/** At most this many payloads ride one carrier shot. */
export const HOOK_MAX_PAYLOADS = 2;

/**
 * Compiles the whole ship into what the runtime executes: one mount per part,
 * each with its compiled shots per route, plus the signatures and ship stats.
 */
export function compileLoadout(ship: ShipGrid): Loadout {
  // Mimics become ordinary parts first, so every rule below sees what they copy (addendum A§2.5).
  const { grid, mimics } = withMimicsResolved(ship);
  const traits = computeTraits(grid);
  const signatures = recognise(grid, mimics);
  const neighbours = (p: PlacedPart): PlacedPart[] => grid.touching(p);
  const asStep = (n: PlacedPart): RouteStep => ({ uid: n.uid, partId: n.id, cell: { x: n.x, y: n.y } });

  /**
   * Weapons touching each Hook the route passes through, in route order; never the carrier or the real cockpit.
   * Over the cap, the named payloads (Bomb Pod → Sticky Bomb, Arc Coil → Lightning Rod) take their slots first,
   * so a recognised signature can always fire.
   */
  const payloadsOf = (route: Route | null, carrier: number): Payload[] => {
    const all: Payload[] = [];
    for (const step of route?.steps ?? []) {
      if (step.partId !== 'hook') continue;
      for (const n of neighbours(grid.byUid(step.uid)!)) {
        const gun = PARTS[n.id].family === 'weapon' || (n.id === 'cockpit' && n.uid !== 0);
        if (!gun || n.uid === carrier || all.some(o => o.uid === n.uid)) continue;
        all.push({ partId: n.id, uid: n.uid, hookUid: step.uid });
      }
    }
    const named = (p: Payload) => (p.partId === 'bomb' || p.partId === 'arc' ? 0 : 1);
    return all.sort((a, b) => named(a) - named(b)).slice(0, HOOK_MAX_PAYLOADS);
  };

  const mounts: MountSpec[] = grid.parts().map(p => {
    const def = PARTS[p.id];
    const sigs = [...new Set(signatures.filter(m => m.uids.includes(p.uid)).map(m => m.id))] as SignatureId[];
    const power = sigs.length ? SIGNATURE_POWER : 1;
    const received = traits.get(p.uid) ?? [];

    let shots: MountSpec['shots'] = [];
    if (baseShot(p.id)) {
      let routes: (Route | null)[] = def.routes ? traceLines(grid, p.uid) : [null];
      if (def.routes) {
        // Orbit and Echo nodes touching a routed weapon act as if every shot passed through them first.
        const nodeSteps = neighbours(p).filter(n => LINE_NODE_IDS.has(n.id)).map(asStep);
        if (nodeSteps.length) routes = routes.map(r => r && { ...r, steps: [...nodeSteps, ...r.steps] });
      } else if (p.id === 'thruster') {
        // A Thruster node's exhaust goes through the Lenses it touches (Afterburner Lance).
        const lenses = neighbours(p).filter(n => n.id === 'lens').map(asStep);
        if (lenses.length) routes = [{ sourceUid: p.uid, steps: lenses, path: [], exit: { cell: { x: p.x, y: p.y }, dir: p.facing }, damageMul: 1 }];
      }
      shots = routes.map(route => ({ route, spec: compileShot(p.id, received, route, power)!, payloads: payloadsOf(route, p.uid) }));
    }

    const near = neighbours(p);
    const payload = p.id === 'bomb' ? PAYLOAD_ORDER.find(id => near.some(n => n.id === id)) ?? null : null;
    const feeds = p.id === 'magnet' ? near.filter(n => FEEDABLE.includes(n.id)).map(n => n.uid) : [];

    return {
      uid: p.uid, partId: p.id, cell: { x: p.x, y: p.y }, facing: p.facing, aim: def.aim, traits: received, touches: near.map(n => n.uid),
      shots, signatures: sigs, payload, feeds, mimic: mimics.has(p.uid),
    };
  });

  const n = (id: PartId) => grid.parts().filter(p => p.id === id).length;
  return {
    mounts,
    signatures,
    stats: {
      speedMul: Math.min(1.6, 1 + 0.15 * n('thruster')),
      pickupRadius: Math.min(220, 40 + 60 * n('magnet')),
      regenPerSec: 0.2 * n('repair'),
    },
  };
}
