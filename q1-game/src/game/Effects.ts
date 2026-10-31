import type { TraitId } from '../core/types';
import type { GameScene } from '../scenes/GameScene';
import type { DamageSrc, Enemy } from './runtime';
import { Status } from './Status';

/** Visible tint per trait so touch traits always read on the output (design §9.2). */
export const TRAIT_TINT: Partial<Record<TraitId, number>> = {
  charge: 0x7df9ff,
  chill: 0x9ec9ff,
  ignite: 0xff8a1f,
  warhead: 0xff5a36,
  shrapnel: 0xffd36b,
  bounce: 0xffffff,
  harden: 0x39ff88,
  mend: 0x7dffb2,
  pull: 0xd0a8ff,
  orbit: 0xb388ff,
  overclock: 0xff5252,
  relay: 0xffd740,
  snag: 0xbdbdbd,
  boomerang: 0xe6ee9c,
};

/** Output colour for a part's shots, tinted by its first visible trait. */
export function shotColour(base: number, effects: TraitId[]): number {
  for (const t of effects) {
    const c = TRAIT_TINT[t];
    if (c !== undefined) return c;
  }
  return base;
}

/** On-hit status effects shared by bolts, beams, bursts and chains. */
export function applyHitEffects(e: Enemy, effects: TraitId[] | undefined): void {
  if (!effects || !e.alive) return;
  if (effects.includes('charge')) Status.apply(e, 'charged', 4000);
  if (effects.includes('chill')) Status.apply(e, 'slow', 2000, 0.4);
  if (effects.includes('ignite')) Status.apply(e, 'burn', 3000, 4);
  if (effects.includes('snag')) Status.snag(e);
}

/** Damages every enemy whose circle overlaps (x, y, r) and plays a ring. */
export function blast(scene: GameScene, x: number, y: number, r: number, damage: number, src: DamageSrc, colour: number): void {
  for (const e of scene.enemies.inRadius(x, y, r)) {
    scene.enemies.damage(e, damage, src);
    applyHitEffects(e, src.effects);
  }
  const ring = scene.add.circle(x, y, r * 0.4).setStrokeStyle(2, colour, 0.9).setDepth(16);
  scene.tweens.add({ targets: ring, scale: 2.5, alpha: 0, duration: 220, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
}
