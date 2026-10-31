import { expect, test } from 'vitest';
import { LOOSE_PART_IDS, NODE_IDS, PART_IDS, PARTS } from '../../src/data/parts';
import { cardLines, MODULE_TEXT, moduleKind } from '../../src/data/modules';
import { SIGNATURES } from '../../src/data/signatures';
import { ENEMIES } from '../../src/data/enemies';
import { TUNING } from '../../src/data/tuning';

test('smoke', () => {
  expect(1 + 1).toBe(2);
});

test('addendum parts', () => {
  expect(PARTS.saw).toMatchObject({ family: 'weapon', aim: 'turret', trait: 'boomerang', routes: true, isModifier: false });
  expect(PARTS.hook).toMatchObject({ family: 'modifier', trait: 'snag', isModifier: true, routes: false });
  expect(PARTS.overclock.trait).toBe('overclock');
  expect(PARTS.relay.trait).toBe('relay');
  expect(PARTS.mimic.trait).toBeNull();
  expect(PARTS.mimic.family).toBe('utility');
  expect(LOOSE_PART_IDS.length).toBe(20);
});

test('addendum enemy and saw tuning', () => {
  expect(ENEMIES.shielder).toEqual({ hp: 40, speed: 95, radius: 10, contactDamage: 8 });
  expect(TUNING.weapons.saw).toMatchObject({ shape: 'bolt', pierce: 99, effects: ['boomerang'] });
  expect(TUNING.weapons.saw!.range).toBe(104);
});

test('module card text: every part has ALONE / TOUCH / IN LINE / TIP, each 1–60 chars, at most one number per card', () => {
  expect(Object.keys(MODULE_TEXT).sort()).toEqual([...PART_IDS].sort());
  for (const id of PART_IDS) {
    const card = MODULE_TEXT[id];
    for (const line of [card.alone, card.touch, card.inLine, card.tip]) {
      expect(line.length, `${id}: "${line}"`).toBeGreaterThan(0);
      expect(line.length, `${id}: "${line}"`).toBeLessThanOrEqual(60);
    }
    // "The 4 around it" names a node's reach, not a stat.
    const numbers = `${card.alone} ${card.touch} ${card.inLine} ${card.tip}`.replace(/the 4 (parts )?around it/gi, '').match(/\d+/g) ?? [];
    expect(numbers.length, id).toBeLessThanOrEqual(1);
  }
});

// Readability pass (2026-10-31): plain card lines shared by the Archive and the Forge strip.
test('a node card says BOOSTS and has no IN LINE; a shot changer keeps IN LINE; every card ends with a TIP', () => {
  for (const id of NODE_IDS) {
    expect(cardLines(id).map(l => l.label), id).toEqual(['ALONE', 'BOOSTS', 'TIP']);
    expect(moduleKind(id), id).toMatch(/^BOOSTER/);
  }
  expect(cardLines('lens').map(l => l.label)).toEqual(['ALONE', 'TOUCHING', 'IN LINE', 'TIP']);
  expect(cardLines('pulse').map(l => l.label)).toEqual(['ALONE', 'TOUCHING', 'TIP']);
  expect(moduleKind('pulse')).toBe('GUN · octagon');
  expect(moduleKind('lens')).toBe('SHOT CHANGER · octagon');
});

test('tips never name a combo (the Archive gives no combo hints)', () => {
  for (const id of PART_IDS) {
    for (const sig of SIGNATURES) expect(MODULE_TEXT[id].tip.toLowerCase(), `${id} vs ${sig.name}`).not.toContain(sig.name.toLowerCase());
  }
});
