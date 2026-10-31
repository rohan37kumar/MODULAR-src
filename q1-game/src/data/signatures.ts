import type { PartId, ShipJSON, SignatureId } from '../core/types';

export interface SignatureDef {
  id: SignatureId;
  /** Archive order, 1..21 (design §11, addendum A§3). */
  index: number;
  name: string;
  recipe: string;
  /** The onboard analysis AI's one-liner (≤ 90 chars). */
  quip: string;
  /** Unlocked as a Blueprint start on discovery. */
  keyPart: PartId;
  /** Flourish colour; distinct from every part family colour. */
  colour: number;
  /** Smaller signatures this one replaces when it contains them. */
  supersedes: SignatureId[];
  /** Has its own effect code (no general rule produces it). */
  dedicated: boolean;
  /** Example layout used by tests, the debug sandbox and Archive diagrams. */
  diagram: ShipJSON;
}

export const SIGNATURES: SignatureDef[] = [
  {
    id: 'splitBeam', index: 1, name: 'Split Beam', recipe: 'Beam Lance → Mirror (line)',
    quip: 'Photon path bifurcated at the mirror. One branch obeys physics. The other obeys the hull.',
    keyPart: 'mirror', colour: 0xe0f7ff, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'beam', x: 0, y: -1, facing: 0 }, { id: 'mirror', x: 0, y: -2, facing: 0, orient: '/' }] },
  },
  {
    id: 'clusterShell', index: 2, name: 'Cluster Shell', recipe: 'Bomb Pod touching Pulse Cannon or Needle Turret',
    quip: 'Bomb casing accepted live rounds as payload. Twelve bolts per burst. Unwise. Effective.', keyPart: 'bomb', colour: 0xff7a00, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'bomb', x: 0, y: -1, facing: 0 }, { id: 'pulse', x: 1, y: -1, facing: 1 }] },
  },
  {
    id: 'hallOfMirrors', index: 3, name: 'Hall of Mirrors', recipe: 'Beam Lance → 2+ Mirrors (line)',
    quip: 'Beam re-split at each mirror. I can no longer find the original. Neither can the swarm.', keyPart: 'mirror', colour: 0x9ef0ff, supersedes: ['splitBeam'], dedicated: false,
    diagram: {
      parts: [
        { id: 'beam', x: 0, y: -1, facing: 0 },
        { id: 'mirror', x: 0, y: -2, facing: 0, orient: '/' },
        { id: 'mirror', x: 0, y: -3, facing: 0, orient: '/' },
      ],
    },
  },
  {
    id: 'slugRound', index: 4, name: 'Slug Round', recipe: 'Pulse Cannon → Lens (line)',
    quip: 'Three bolts entered the lens. One left. It did not stop for anything.', keyPart: 'lens', colour: 0xffe14d, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'pulse', x: 0, y: -1, facing: 0 }, { id: 'lens', x: 0, y: -2, facing: 0 }] },
  },
  {
    id: 'halo', index: 5, name: 'Halo', recipe: 'Orbit Ring node touching a Beam Lance',
    quip: 'The long-range beam now circles the cockpit. Engagement range: whatever touches us.', keyPart: 'orbit', colour: 0xfff4b8, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'beam', x: 0, y: -1, facing: 0 }, { id: 'orbit', x: 0.5, y: -1.5, facing: 0 }] },
  },
  {
    id: 'gravitySling', index: 6, name: 'Gravity Sling', recipe: 'Orbit Ring node touching a Pulse Cannon or Needle Turret',
    quip: 'Rounds held in orbit pending a target. Release distance: point-blank. Patience rewarded.', keyPart: 'orbit', colour: 0x7c4dff, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'pulse', x: 0, y: -1, facing: 0 }, { id: 'orbit', x: 0.5, y: -1.5, facing: 0 }] },
  },
  {
    id: 'afterburnerLance', index: 7, name: 'Afterburner Lance', recipe: 'Thruster node touching a Lens',
    quip: 'Exhaust focused into an aft lance. Retreat is now an attack vector. Recommend: run away.', keyPart: 'thruster', colour: 0x2979ff, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'lens', x: 0, y: 1, facing: 0 }, { id: 'thruster', x: 0.5, y: 1.5, facing: 2 }] },
  },
  {
    id: 'resonator', index: 8, name: 'Resonator', recipe: 'Beam Lance → two back-to-back Mirrors, opposite orientations (line)',
    quip: 'Mirror gap temperature rising. Three seconds to discharge. Do not look directly at it.', keyPart: 'mirror', colour: 0xff4dff, supersedes: ['splitBeam'], dedicated: true,
    diagram: {
      parts: [
        { id: 'beam', x: 0, y: -1, facing: 0 },
        { id: 'mirror', x: 0, y: -2, facing: 0, orient: '/' },
        { id: 'mirror', x: 0, y: -3, facing: 0, orient: '\\' },
      ],
    },
  },
  {
    id: 'trident', index: 9, name: 'Trident', recipe: 'Beam Lance → Prism (line)',
    quip: 'Three prongs at 60 percent each. Net gain: 80 percent. Arithmetic approved.', keyPart: 'prism', colour: 0xffd1f0, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'beam', x: 0, y: -1, facing: 0 }, { id: 'prism', x: 0, y: -2, facing: 0 }] },
  },
  {
    id: 'shatterstorm', index: 10, name: 'Shatterstorm', recipe: 'Cryo Turret touching Pulse Cannon or Needle Turret',
    quip: 'Frozen targets fracture on impact. The fragments are also cold. The reaction propagates.', keyPart: 'cryo', colour: 0xb3e5fc, supersedes: [], dedicated: true,
    diagram: { parts: [{ id: 'cryo', x: 1, y: 0, facing: 1 }, { id: 'pulse', x: 1, y: -1, facing: 0 }] },
  },
  {
    id: 'jumpstart', index: 11, name: 'Jumpstart', recipe: 'Arc Coil touching Repair Node',
    quip: 'Charged casualties rebooting on our signal. Loyalty duration: six seconds. Spend them.', keyPart: 'repair', colour: 0x1de9b6, supersedes: [], dedicated: true,
    diagram: { parts: [{ id: 'arc', x: 1, y: 0, facing: 1 }, { id: 'repair', x: 1.5, y: 0.5, facing: 1 }] },
  },
  {
    id: 'coinSlinger', index: 12, name: 'Coin Slinger', recipe: 'Magnet touching Pulse Cannon or Needle Turret',
    quip: 'Scrap is now ammunition. Filed under unserious. Revising: kill rate is serious.', keyPart: 'magnet', colour: 0xffc400, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'pulse', x: 0, y: -1, facing: 0 }, { id: 'magnet', x: 0.5, y: -1.5, facing: 1 }] },
  },
  {
    id: 'stormSeed', index: 13, name: 'Storm Seed', recipe: 'Arc Coil touching Bomb Pod',
    quip: 'Bombs are not detonating. They are taking root. Lightning yield: four seconds per pylon.', keyPart: 'arc', colour: 0x80d8ff, supersedes: [], dedicated: true,
    diagram: { parts: [{ id: 'arc', x: -1, y: 0, facing: 3 }, { id: 'bomb', x: -2, y: 0, facing: 3 }] },
  },
  {
    id: 'porcupine', index: 14, name: 'Porcupine', recipe: 'Magnet and Bulwark Plate nodes on the same part',
    quip: 'Enemy rounds embedding in the plate. Holding them. At twenty, returning them.', keyPart: 'bulwark', colour: 0xc6ff00, supersedes: [], dedicated: true,
    diagram: { parts: [{ id: 'bulwark', x: -0.5, y: 0.5, facing: 2 }, { id: 'magnet', x: 0.5, y: 0.5, facing: 1 }] },
  },
  {
    id: 'grandFinale', index: 15, name: 'Grand Finale', recipe: 'Bomb Pod + Bomb Pod + Pulse Cannon, with an Echo Coil touching a Pod',
    quip: 'Bombs inside bombs inside an echo. Round count near 150. I have stopped counting.', keyPart: 'echo', colour: 0xff6e40, supersedes: ['clusterShell'], dedicated: true,
    diagram: {
      parts: [
        { id: 'bomb', x: -1, y: 0, facing: 3 },
        { id: 'bomb', x: -2, y: 0, facing: 3 },
        { id: 'pulse', x: -1, y: -1, facing: 0 },
        { id: 'echo', x: -1.5, y: 0.5, facing: 2 },
      ],
    },
  },
  // ---- Addendum signatures (A§3). Quips are drafted for the user's review in docs/q1/quips-review.md. ----
  {
    id: 'ricochet', index: 16, name: 'Ricochet', recipe: 'Saw touching Relay',
    quip: 'Blade redirects on each kill. Odds halve per hop: 100, 50, 25. It always comes home.', keyPart: 'saw', colour: 0xe6ee9c, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'saw', x: 1, y: 0, facing: 1 }, { id: 'relay', x: 1.5, y: -0.5, facing: 0 }] },
  },
  {
    id: 'stickyBomb', index: 17, name: 'Sticky Bomb', recipe: 'Pulse Cannon or Needle Turret → Hook (line), Bomb Pod touching the Hook',
    quip: 'Each bolt plants a charge at 60 percent yield. The swarm is now wearing our ordnance.', keyPart: 'hook', colour: 0xff8a80, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'pulse', x: 0, y: -1, facing: 0 }, { id: 'hook', x: 0, y: -2, facing: 0 }, { id: 'bomb', x: 1, y: -2, facing: 1 }] },
  },
  {
    id: 'lightningRod', index: 18, name: 'Lightning Rod', recipe: 'Beam Lance → Hook (line), Arc Coil touching the Hook',
    quip: 'The beam now conducts. Each contact forks lightning sideways. A line became a web.', keyPart: 'hook', colour: 0x84ffff, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'beam', x: 0, y: -1, facing: 0 }, { id: 'hook', x: 0, y: -2, facing: 0 }, { id: 'arc', x: 1, y: -2, facing: 1 }] },
  },
  {
    id: 'flashFreeze', index: 19, name: 'Flash Freeze', recipe: 'Overclock touching Cryo Turret',
    quip: 'Chill rate tripled. Time to freeze: negligible. Each freeze blooms frost into the crowd.', keyPart: 'overclock', colour: 0xe1f5fe, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'cryo', x: 1, y: 0, facing: 1 }, { id: 'overclock', x: 1.5, y: -0.5, facing: 0 }] },
  },
  {
    id: 'domino', index: 20, name: 'Domino', recipe: 'Relay touching Pulse Cannon',
    quip: 'Each kill passes the shot on and sprays the corpse outward. Packed swarms fall in order.', keyPart: 'relay', colour: 0xffd740, supersedes: [], dedicated: false,
    diagram: { parts: [{ id: 'pulse', x: 0, y: -1, facing: 0 }, { id: 'relay', x: 0.5, y: -1.5, facing: 1 }] },
  },
  {
    id: 'impostor', index: 21, name: 'Impostor', recipe: 'Any combo completed by a Mimic',
    quip: 'The combo holds. One component is lying about what it is. The output does not care.', keyPart: 'mimic', colour: 0xea80fc, supersedes: [], dedicated: false,
    diagram: {
      parts: [
        { id: 'pulse', x: 0, y: -1, facing: 0 },
        { id: 'mimic', x: 0, y: -2, facing: 0 },
        { id: 'lens', x: -1, y: -2, facing: 0 },
        { id: 'lens', x: 1, y: -2, facing: 0 },
      ],
    },
  },
];

export const SIG_BY_ID = Object.fromEntries(SIGNATURES.map(s => [s.id, s])) as Record<SignatureId, SignatureDef>;
