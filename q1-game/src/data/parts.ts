import type { AimClass, Family, PartId, TraitId } from '../core/types';

export interface PartDef {
  id: PartId;
  name: string;
  family: Family;
  aim: AimClass;
  /** Trait given to every orthogonal neighbour (design §10). */
  trait: TraitId | null;
  /** Transforms shots passing through it in a line of fire. */
  isModifier: boolean;
  /** Has a muzzle and fires along a traced line. */
  routes: boolean;
}

const def = (id: PartId, name: string, family: Family, aim: AimClass, trait: TraitId | null, routes = false): PartDef =>
  ({ id, name, family, aim, trait, isModifier: family === 'modifier', routes });

export const PARTS: Record<PartId, PartDef> = {
  // The pea-shooter auto-aims (user decision at Checkpoint A): 8-way keyboard steering can't aim a nose gun.
  cockpit: def('cockpit', 'Cockpit', 'core', 'turret', null, true),
  pulse: def('pulse', 'Pulse Cannon', 'weapon', 'fixed', 'shrapnel', true),
  beam: def('beam', 'Beam Lance', 'weapon', 'fixed', 'pierce', true),
  needle: def('needle', 'Needle Turret', 'weapon', 'turret', 'twin', true),
  bomb: def('bomb', 'Bomb Pod', 'weapon', 'emitter', 'warhead'),
  arc: def('arc', 'Arc Coil', 'weapon', 'emitter', 'charge'),
  cryo: def('cryo', 'Cryo Turret', 'weapon', 'turret', 'chill', true),
  mirror: def('mirror', 'Mirror', 'modifier', 'none', 'bounce'),
  lens: def('lens', 'Lens', 'modifier', 'none', 'focus'),
  orbit: def('orbit', 'Orbit Ring', 'modifier', 'none', 'orbit'),
  echo: def('echo', 'Echo Coil', 'modifier', 'none', 'echo'),
  prism: def('prism', 'Prism', 'modifier', 'none', 'split'),
  // A node: its exhaust leaves from its own corner along its facing (no line of fire).
  thruster: def('thruster', 'Thruster', 'utility', 'fixed', 'ignite'),
  magnet: def('magnet', 'Magnet', 'utility', 'none', 'pull'),
  bulwark: def('bulwark', 'Bulwark Plate', 'utility', 'none', 'harden'),
  repair: def('repair', 'Repair Node', 'utility', 'none', 'mend'),
  saw: def('saw', 'Saw', 'weapon', 'turret', 'boomerang', true),
  hook: def('hook', 'Hook', 'modifier', 'none', 'snag'),
  overclock: def('overclock', 'Overclock', 'utility', 'none', 'overclock'),
  relay: def('relay', 'Relay', 'utility', 'none', 'relay'),
  mimic: def('mimic', 'Mimic', 'utility', 'none', null),
};

export const PART_IDS = Object.keys(PARTS) as PartId[];

/**
 * Nodes (user decision 2026-10-31): the violet and green parts are small squares that sit in the gaps
 * between octagons (cell corners) and touch the four octagons around them. They never sit in a line of fire.
 */
export const NODE_IDS: ReadonlySet<PartId> = new Set<PartId>(['orbit', 'echo', 'thruster', 'magnet', 'bulwark', 'repair', 'overclock', 'relay']);
export const isNode = (id: PartId): boolean => NODE_IDS.has(id);
/** Nodes that give the weapons they touch their old line-of-fire effect instead of their touch trait. */
export const LINE_NODE_IDS: ReadonlySet<PartId> = new Set<PartId>(['orbit', 'echo']);
/** Every part that can drop or be attached (everything but the cockpit). */
export const LOOSE_PART_IDS = PART_IDS.filter(id => id !== 'cockpit');
