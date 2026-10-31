import type { PartId } from '../core/types';
import { isNode, PARTS } from './parts';

/**
 * Module card text, in plain words for a casual player (user decision 2026-10-31): the Xeno Archive MODULES tab
 * and the Forge Uplink info strip both read it. Each line ≤ 60 chars, '-' when a part has no IN LINE role.
 * Nodes (the square parts in the gaps) have no line of fire; their `touch` line says what the 4 parts around them get.
 * Tips point at a general placement, never at a named combo: the Archive gives no combo hints (decision 2026-10-29).
 */
export const MODULE_TEXT: Record<PartId, { alone: string; touch: string; inLine: string; tip: string }> = {
  cockpit: {
    alone: 'Your core. Its small gun aims itself at enemies.',
    touch: 'Gives nothing, but its gun takes boosts from neighbours.',
    inLine: '-',
    tip: 'Every part must link back to it, edge to edge.',
  },
  pulse: {
    alone: 'Fires fast bolts straight ahead. Steer to aim.',
    touch: 'Shots from parts it touches burst into small bolts.',
    inLine: '-',
    tip: 'Face it outward. Parts in front of it change its bolts.',
  },
  beam: {
    alone: 'A short laser straight ahead. Steer to aim.',
    touch: 'Shots from parts it touches pierce one more enemy.',
    inLine: '-',
    tip: 'Face it outward. Parts in front of it bend or split it.',
  },
  needle: {
    alone: 'Darts that aim themselves at the nearest enemy.',
    touch: 'Parts it touches fire an extra, weaker shot.',
    inLine: '-',
    tip: 'Anywhere: it aims itself. Parts in front still change it.',
  },
  bomb: {
    alone: 'Lobs a bomb into the thickest crowd.',
    touch: 'Shots from parts it touches explode where they hit.',
    inLine: '-',
    tip: 'Next to other guns, so their shots explode too.',
  },
  arc: {
    alone: 'Lightning jumps between nearby enemies.',
    touch: 'Shots from parts it touches leave enemies charged.',
    inLine: '-',
    tip: 'In the middle of your guns, to share its charge.',
  },
  cryo: {
    alone: 'Icicles that aim themselves. They slow, then freeze.',
    touch: 'Shots from parts it touches slow what they hit.',
    inLine: '-',
    tip: 'Next to fast guns, so everything they hit slows down.',
  },
  mirror: {
    alone: 'Bounces enemy bullets back at the swarm.',
    touch: 'Shots from parts it touches bounce to one more enemy.',
    inLine: 'A shot fired into it turns sideways; a copy goes on.',
    tip: 'In front of a gun\'s muzzle. Rotate it to pick the turn.',
  },
  lens: {
    alone: 'Zaps the nearest enemy with a weak ray.',
    touch: 'Parts it touches hit harder.',
    inLine: 'Fuses shots fired into it into one big piercing slug.',
    tip: 'In front of a gun\'s muzzle, for big shots that pierce.',
  },
  orbit: {
    alone: 'Gently pushes nearby enemies away.',
    touch: 'The 4 around it: shots circle the ship, then strike.',
    inLine: '-',
    tip: 'Between guns, to wrap your ship in circling shots.',
  },
  echo: {
    alone: 'Adds an echo shot to the cockpit\'s gun.',
    touch: 'The 4 around it fire every shot twice. Can overheat.',
    inLine: '-',
    tip: 'Between your best guns.',
  },
  prism: {
    alone: 'Sprays a small fan of sparks now and then.',
    touch: 'Shots from parts it touches throw two side shards.',
    inLine: 'Splits each shot fired into it into a fan of three.',
    tip: 'In front of a gun\'s muzzle, to cover a wide arc.',
  },
  thruster: {
    alone: 'A faster ship. Its flame burns what\'s behind it.',
    touch: 'The 4 around it: their shots set enemies on fire.',
    inLine: '-',
    tip: 'Rotate it so the flame points away from the ship.',
  },
  magnet: {
    alone: 'Pulls pickups in from further away.',
    touch: 'The 4 around it: their shots curve toward enemies.',
    inLine: '-',
    tip: 'Between guns that keep missing.',
  },
  bulwark: {
    alone: 'Armour: the 4 parts around it take less damage.',
    touch: 'The 4 around it: their shots destroy enemy bullets.',
    inLine: '-',
    tip: 'On the side of your ship that gets hit the most.',
  },
  repair: {
    alone: 'Slowly repairs the hull.',
    touch: 'The 4 around it: their kills drop small heal motes.',
    inLine: '-',
    tip: 'Between your busiest guns, for more heal motes.',
  },
  saw: {
    alone: 'Throws a blade that cuts through all, then flies back.',
    touch: 'Bolts from parts it touches fly out, then come back.',
    inLine: '-',
    tip: 'Next to guns that fire bolts, for a second hit.',
  },
  hook: {
    alone: 'Reels in nearby loose parts and pickups.',
    touch: 'Hits from parts it touches briefly stop the target.',
    inLine: 'Where a shot through it lands, guns touching it fire too.',
    tip: 'In front of one gun, with more guns touching its sides.',
  },
  overclock: {
    alone: 'Spinning teeth grind enemies on its open sides.',
    touch: 'The 4 around it fire 3× faster, at half damage.',
    inLine: '-',
    tip: 'Between guns. Four guns around it is the best spot.',
  },
  relay: {
    alone: 'Kills near it throw a spark at another enemy.',
    touch: 'The 4 around it: a bolt that kills jumps to a new enemy.',
    inLine: '-',
    tip: 'Between guns that fire bolts, deep in the swarm.',
  },
  mimic: {
    alone: 'Turns into the part it touches most.',
    touch: 'Gives whatever the copied part gives.',
    inLine: 'Does whatever the copied part does.',
    tip: 'Next to the part you want a second copy of.',
  },
};

/** What kind of part this is, in plain words, plus its shape: the first thing a card says. */
export function moduleKind(id: PartId): string {
  if (id === 'cockpit') return 'COCKPIT';
  if (isNode(id)) return 'BOOSTER · square, sits in a gap';
  if (id === 'mimic') return 'COPYCAT · octagon';
  return PARTS[id].family === 'weapon' ? 'GUN · octagon' : 'SHOT CHANGER · octagon';
}

/**
 * A card's labelled lines in reading order, skipping a missing IN LINE. A node's touch line is labelled BOOSTS:
 * it touches the 4 octagons around it, which is its whole job.
 */
export function cardLines(id: PartId): { label: string; text: string }[] {
  const t = MODULE_TEXT[id];
  const lines = [
    { label: 'ALONE', text: t.alone },
    { label: isNode(id) ? 'BOOSTS' : 'TOUCHING', text: t.touch },
    { label: 'IN LINE', text: t.inLine },
    { label: 'TIP', text: t.tip },
  ];
  return lines.filter(l => l.text !== '-');
}
