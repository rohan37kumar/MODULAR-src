export type PartId = 'cockpit' | 'pulse' | 'beam' | 'needle' | 'bomb' | 'arc' | 'cryo'
  | 'mirror' | 'lens' | 'orbit' | 'echo' | 'prism' | 'thruster' | 'magnet' | 'bulwark' | 'repair'
  | 'saw' | 'hook' | 'overclock' | 'relay' | 'mimic';
export type Dir = 0 | 1 | 2 | 3;
export type MirrorOrient = '/' | '\\';
export type Family = 'core' | 'weapon' | 'modifier' | 'utility';
export type AimClass = 'fixed' | 'turret' | 'emitter' | 'none';
export type TraitId = 'shrapnel' | 'pierce' | 'twin' | 'warhead' | 'charge' | 'chill' | 'bounce' | 'focus'
  | 'orbit' | 'echo' | 'split' | 'ignite' | 'pull' | 'harden' | 'mend'
  | 'boomerang' | 'snag' | 'overclock' | 'relay';
export type SignatureId = 'splitBeam' | 'clusterShell' | 'hallOfMirrors' | 'slugRound' | 'halo' | 'gravitySling'
  | 'afterburnerLance' | 'resonator' | 'trident' | 'shatterstorm' | 'jumpstart' | 'coinSlinger' | 'stormSeed'
  | 'porcupine' | 'grandFinale'
  | 'ricochet' | 'stickyBomb' | 'lightningRod' | 'flashFreeze' | 'domino' | 'impostor';
export type EnemyKind = 'mote' | 'drone' | 'spitter' | 'lancer' | 'carrier' | 'shielder';

export interface Cell { x: number; y: number }
export interface PlacedPart { uid: number; id: PartId; x: number; y: number; facing: Dir; orient?: MirrorOrient }
/** The cockpit is implicit: it is never listed in `parts`. */
export interface ShipJSON { parts: { id: PartId; x: number; y: number; facing: Dir; orient?: MirrorOrient }[] }

export interface RouteStep { uid: number; partId: PartId; cell: Cell; turned?: boolean }
export interface Route { sourceUid: number; steps: RouteStep[]; path: Cell[]; exit: { cell: Cell; dir: Dir }; damageMul: number }
/** `uids` are sorted ascending. */
export interface SignatureMatch { id: SignatureId; uids: number[] }

export type ShotShape = 'bolt' | 'beam' | 'ring' | 'flame' | 'lance' | 'burst' | 'chain';
export interface ShotSpec {
  shape: ShotShape; damage: number; count: number; spreadDeg: number; speed: number; range: number;
  width: number; pierce: number; fuse: number; orbit: boolean;
  echoes: { delay: number; mul: number }[]; extraShards: number; twin: boolean;
  effects: TraitId[]; power: number;
  /** Fire-rate multiplier (Overclock); 1 by default. */
  rateMul: number;
}
/** A Hook payload: a weapon touching the Hook, released by the carrier's shot on impact. */
export interface Payload { partId: PartId; uid: number; hookUid: number }
export interface MountSpec {
  uid: number; partId: PartId; cell: Cell; facing: Dir; aim: AimClass; traits: TraitId[];
  /** Uids of everything this part touches (`grid.touching`). */
  touches: number[];
  shots: { route: Route | null; spec: ShotSpec; payloads: Payload[] }[]; signatures: SignatureId[];
  payload: PartId | null; feeds: number[];
  /** A resolved Mimic standing in for `partId`. */
  mimic: boolean;
}
export interface Loadout {
  mounts: MountSpec[]; signatures: SignatureMatch[];
  stats: { speedMul: number; pickupRadius: number; regenPerSec: number };
}

export type Drop = { type: 'part'; part: PartId } | { type: 'forge' } | { type: 'repair' } | { type: 'scrap'; n: number };
export interface SpawnEvent { kind: EnemyKind; count: number }
export interface SaveData {
  version: 1; discovered: SignatureId[]; blueprints: PartId[];
  bestRun: { timeMs: number; kills: number } | null; runs: number;
  /** The Blueprint start picked last on the Title (null = bare cockpit). */
  lastBlueprint: PartId | null;
  /** Sound off (Title / pause toggle). */
  muted: boolean;
  /** Parts the player has seen (Archive MODULES tab). */
  modules: PartId[];
}
