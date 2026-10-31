import type Phaser from 'phaser';
import { compileShot } from '../core/shot';
import type { MountSpec, PartId, ShotSpec } from '../core/types';
import { SIG_BY_ID } from '../data/signatures';
import { Audio } from './Audio';
import type { GameScene } from '../scenes/GameScene';
import { applyHitEffects, blast } from './Effects';
import { CELL, COLOURS, type DamageSrc, type Enemy } from './runtime';
import { MAX_HULL } from './Ship';
import { leadAngle } from './WeaponSystem';

/** Magnet slug feed (design §10): every kill on screen is 1 ammo (scrap drops were removed, user decision 2026-10-31). */
const AMMO_MAX = 10;
const AMMO_PER_SLUG = 2;
const SLUG_EVERY_MS = 250;
const SLUG_DAMAGE_MUL = 3;
const COIN_COLOUR = SIG_BY_ID.coinSlinger.colour;
/** The feed streak: wreck → Magnet, and how many may fly at once. */
const STREAK_MS = 240;
const STREAK_CAP = 16;
/** Bulwark Plate. */
export const BULWARK_TAKEN = 0.6;
const BULWARK_TAKEN_BOOSTED = 1 - (1 - BULWARK_TAKEN) * 1.15;
const BULWARK_REFLECT = 10;
/** Bulwark traits that act on whoever hits it; any other trait boosts its damage reduction instead. */
const BULWARK_ACTIVE = ['charge', 'chill', 'ignite', 'warhead', 'harden'];

/**
 * Utility parts at runtime: Magnet kill-fed slugs, Repair Node regen, Thruster exhaust trail,
 * Bulwark damage reduction and its trait reactions. Event: 'scrap-slug' (magnet mountUid).
 */
export class Utility {
  private ammo = new Map<number, number>();
  private slugCd = new Map<number, number>();
  private trailCd = 0;
  private pulseCd = 0;
  private streaks: { x: number; y: number; uid: number; t: number; coin: boolean }[] = [];
  private readonly streakG: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: GameScene) {
    this.streakG = scene.add.graphics().setDepth(16).setBlendMode('ADD');
  }

  update(dtMs: number): void {
    const ship = this.scene.ship;
    const { regenPerSec } = ship.loadout.stats;
    if (regenPerSec > 0 && ship.hull < MAX_HULL) this.scene.heal((regenPerSec * dtMs) / 1000);

    this.pulseCd -= dtMs;
    this.trailCd -= dtMs;
    const pulse = this.pulseCd <= 0;
    const trail = this.trailCd <= 0 && ship.moving;
    if (pulse) this.pulseCd = 1200;
    if (trail) this.trailCd = 45;

    for (const m of ship.loadout.mounts) {
      if (m.partId === 'magnet') this.fireSlugs(m, dtMs);
      else if (m.partId === 'repair' && pulse) this.ring(ship.cellWorld(m.cell), COLOURS.utility, 0.35);
      else if (m.partId === 'thruster' && trail) this.exhaust(m);
    }
    this.drawStreaks(dtMs);
  }

  /** A kill inside the camera view feeds 1 ammo to the first slug-feeding Magnet with room. */
  onKill(e: Enemy): void {
    if (!this.scene.cameras.main.worldView.contains(e.x, e.y)) return;
    const m = this.scene.ship.loadout.mounts.find(x => x.partId === 'magnet' && x.feeds.length > 0 && (this.ammo.get(x.uid) ?? 0) < AMMO_MAX);
    if (!m) return;
    this.ammo.set(m.uid, (this.ammo.get(m.uid) ?? 0) + 1);
    if (this.streaks.length < STREAK_CAP) this.streaks.push({ x: e.x, y: e.y, uid: m.uid, t: 0, coin: m.signatures.includes('coinSlinger') });
  }

  /** Each streak's head races from the wreck to its Magnet (which moves with the ship), trailing a fading tail. */
  private drawStreaks(dtMs: number): void {
    const g = this.streakG;
    g.clear();
    if (!this.streaks.length) return;
    const ship = this.scene.ship;
    this.streaks = this.streaks.filter(st => {
      st.t += dtMs;
      const m = ship.loadout.mounts.find(x => x.uid === st.uid);
      if (!m || st.t >= STREAK_MS) return false;
      const end = ship.cellWorld(m.cell);
      const head = 1 - (1 - st.t / STREAK_MS) ** 2, tail = Math.max(0, head - 0.35);
      const at = (k: number) => ({ x: st.x + (end.x - st.x) * k, y: st.y + (end.y - st.y) * k });
      const a = at(tail), b = at(head);
      g.lineStyle(2, st.coin ? COIN_COLOUR : COLOURS.scrap, 0.85).lineBetween(a.x, a.y, b.x, b.y);
      g.fillStyle(0xffffff, 0.9).fillCircle(b.x, b.y, 2);
      return true;
    });
  }

  private fireSlugs(m: MountSpec, dtMs: number): void {
    const cd = (this.slugCd.get(m.uid) ?? 0) - dtMs;
    this.slugCd.set(m.uid, Math.max(0, cd));
    if (cd > 0 || m.feeds.length === 0) return;
    const ship = this.scene.ship;
    const origin = ship.cellWorld(m.cell);
    let ammo = this.ammo.get(m.uid) ?? 0;
    for (const uid of m.feeds) {
      if (ammo < AMMO_PER_SLUG) break;
      const fed = ship.loadout.mounts.find(x => x.uid === uid);
      if (!fed) continue;
      const base = compileShot(fed.partId, [], null, 1);
      if (!base) continue;
      // Heavy piercing slug, carrying the magnet's own received traits.
      const spec: ShotSpec = { ...base, damage: base.damage * SLUG_DAMAGE_MUL, pierce: 99, width: 6, effects: m.traits, power: base.power };
      let angle: number;
      if (fed.aim === 'turret') {
        const t = this.scene.enemies.nearest(origin.x, origin.y, spec.range);
        if (!t) continue;
        angle = leadAngle(origin, t, spec.speed);
      } else {
        angle = ship.dirAngle(fed.shots[0]?.route?.exit.dir ?? fed.facing);
      }
      const src: DamageSrc = { mountUid: m.uid, partId: fed.partId, signatures: m.signatures, effects: spec.effects };
      // Coin Slinger fires gold coins; the plain scrap-feed rule fires scrap-green slugs.
      const coin = m.signatures.includes('coinSlinger');
      this.scene.weapons.fireBolt(spec, origin.x, origin.y, angle, src, coin ? { colour: COIN_COLOUR, scale: 1.6 } : { colour: COLOURS.scrap, scale: 1.2 });
      // The cha-ching.
      if (coin) Audio.sfx('pickup', { pitch: 1.8, vol: 0.7 });
      ammo -= AMMO_PER_SLUG;
      this.scene.events.emit('scrap-slug', m.uid);
    }
    this.ammo.set(m.uid, ammo);
    this.slugCd.set(m.uid, SLUG_EVERY_MS);
  }

  /** The Bulwark node guarding part `uid`: the node itself, or one touching that octagon (user decision 2026-10-31). */
  guardOf(partId: PartId, uid: number): number | null {
    if (partId === 'bulwark') return uid;
    return this.scene.ship.loadout.mounts.find(m => m.partId === 'bulwark' && m.touches.includes(uid))?.uid ?? null;
  }

  /** Damage multiplier for a hit landing on part `uid` (guarded by a Bulwark: −40%, −46% with a passive trait). */
  damageTaken(partId: PartId, uid: number): number {
    const guard = this.guardOf(partId, uid);
    if (guard === null) return 1;
    const traits = this.scene.ship.loadout.mounts.find(m => m.uid === guard)?.traits ?? [];
    return traits.some(t => !BULWARK_ACTIVE.includes(t)) ? BULWARK_TAKEN_BOOSTED : BULWARK_TAKEN;
  }

  /** A contact hit on a guarded part applies its Bulwark's received traits to the attacker. */
  onContact(partId: PartId, uid0: number, attacker: Enemy): void {
    const uid = this.guardOf(partId, uid0);
    if (uid === null) return;
    const traits = this.scene.ship.loadout.mounts.find(m => m.uid === uid)?.traits ?? [];
    if (!traits.length) return;
    const src: DamageSrc = { mountUid: uid, partId, signatures: [], effects: traits };
    applyHitEffects(attacker, traits);
    if (traits.includes('warhead')) blast(this.scene, attacker.x, attacker.y, 30, 20, src, 0xff5a36);
    if (traits.includes('harden')) this.scene.enemies.damage(attacker, BULWARK_REFLECT, src);
  }

  private exhaust(m: MountSpec): void {
    const ship = this.scene.ship;
    const p = ship.cellWorld(m.cell);
    const a = ship.dirAngle(m.facing);
    const dot = this.scene.add.image(p.x + Math.cos(a) * CELL * 0.5, p.y + Math.sin(a) * CELL * 0.5, 'spark')
      .setTint(0xff8a1f).setDepth(7).setBlendMode('ADD');
    this.scene.tweens.add({
      targets: dot, x: dot.x + Math.cos(a) * 30, y: dot.y + Math.sin(a) * 30, alpha: 0, scale: 0.3,
      duration: 260, onComplete: () => dot.destroy(),
    });
  }

  private ring(p: { x: number; y: number }, colour: number, alpha: number): void {
    const r = this.scene.add.circle(p.x, p.y, CELL * 0.4).setStrokeStyle(2, colour, alpha).setDepth(19);
    this.scene.tweens.add({ targets: r, scale: 1.8, alpha: 0, duration: 600, onComplete: () => r.destroy() });
  }
}
