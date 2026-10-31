import Phaser from 'phaser';
import { SIGNATURE_POWER } from '../core/loadout';
import { DIR_VEC } from '../core/math';
import { compileShot } from '../core/shot';
import type { MountSpec, ShotSpec, SignatureId } from '../core/types';
import { SIG_BY_ID } from '../data/signatures';
import type { GameScene } from '../scenes/GameScene';
import { Audio } from './Audio';
import { CELL, type Bolt, type DamageSrc, type Enemy } from './runtime';
import { Status } from './Status';

// Resonator (design §11 #8): charge, then a crossbar pulse out of both mirrors.
const RES_CHARGE_MS = 3000;
const RES_PULSE_MS = 400;
const RES_PULSE = { width: 24, range: 600, damage: 150 };
// Shatterstorm (#10).
const SHATTER_BONUS = 25;
const SHARDS = 6;
const SHARD = { damage: 8, range: 260 };
const MAX_SHARDS = 40;
const SHARD_FREEZE_MS = 1500;
// Jumpstart (#11).
const ALLY_MS = 6000;
const MAX_ALLIES = 10;
const ALLY_SPEED = 240;
const ALLY_RAM_MUL = 2;
// Storm Seed (#13).
const PYLON_MS = 4000;
const PYLON_ZAP_MS = 500;
const MAX_PYLONS = 4;
const PYLON_ZAP = { range: 140, damage: 12 };
// Porcupine (#14).
const SPIKES_TO_FIRE = 20;
const SPIKE_BOLT = { damage: 20, pierce: 2, speed: 520, range: 420 };
// Grand Finale (#15).
const BOMBLETS = 4;
const BOMBLET = { radius: 40, damage: 25, bolts: 12, spread: 80 };
const FINALE_ECHO_MS = 400;
const FINALE_BOLT_CAP = 150;

interface Resonance {
  charge: number;
  /** ms of pulse left; 0 while charging. */
  pulse: number;
  whine: number;
}

interface Pylon {
  x: number;
  y: number;
  ttl: number;
  zap: number;
  src: DamageSrc;
}

/** Shared by one Grand Finale volley and its echo: bolts still allowed. */
export interface Volley {
  left: number;
}

interface Ally {
  x: number;
  y: number;
  radius: number;
  damage: number;
  ttl: number;
  img: Phaser.GameObjects.Image;
}

/**
 * The six dedicated signatures (design §9.4): behaviours no general rule produces.
 * Task 16: Resonator, Shatterstorm, Jumpstart. Task 17: Storm Seed, Porcupine, Grand Finale.
 */
export class SignatureEffects {
  private readonly g: Phaser.GameObjects.Graphics;
  private res = new Map<number, Resonance>();
  private shards = 0;
  private allies: Ally[] = [];
  private pylons: Pylon[] = [];
  /** Porcupine: spike angles stuck in each Bulwark (ship-local radians). */
  private spikes = new Map<number, number[]>();
  private pending: { at: number; fire: () => void }[] = [];
  private finales = 0;

  constructor(private readonly scene: GameScene) {
    this.g = scene.add.graphics().setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
    scene.listen('enemy-killed', (e: Enemy) => this.onEnemyKilled(e));
    scene.listen('loadout-changed', () => this.res.clear());
  }

  /** Credits a dedicated signature to whichever recognised match it belongs to. */
  private fired(id: SignatureId, mountUid?: number): void {
    const sigs = this.scene.ship.loadout.signatures;
    const m = sigs.find(s => s.id === id && (mountUid === undefined || s.uids.includes(mountUid))) ?? sigs.find(s => s.id === id);
    if (m) this.scene.sigs.fired(id, m.uids);
  }

  update(dtMs: number): void {
    this.g.clear();
    const now = this.scene.timeMs;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i].at > now) continue;
      const p = this.pending[i];
      this.pending.splice(i, 1);
      p.fire();
    }
    this.updateAllies(dtMs);
    this.updatePylons(dtMs);
    this.drawSpikes();
  }

  // ---- Resonator ----

  /**
   * Replaces a resonator beam's output (called from WeaponSystem.continuous inside the beam pass).
   * Charges for 3 s with the mirror gap glowing hotter, then pulses out of both mirrors' turned exits.
   */
  resonator(m: MountSpec, dtMs: number): void {
    const ship = this.scene.ship;
    const match = ship.loadout.signatures.find(s => s.id === 'resonator' && s.uids.includes(m.uid));
    if (!match) return;
    const mirrors = match.uids.filter(u => u !== m.uid).map(u => ship.grid.byUid(u)!).filter(Boolean);
    if (mirrors.length < 2) return;
    const colour = SIG_BY_ID.resonator.colour;
    const st = this.res.get(m.uid) ?? { charge: 0, pulse: 0, whine: 0 };
    this.res.set(m.uid, st);
    const [a, b] = mirrors.map(p => ship.cellWorld(p));

    if (st.pulse > 0) {
      st.pulse -= dtMs;
      const spec: ShotSpec = {
        shape: 'beam', damage: (RES_PULSE.damage * SIGNATURE_POWER) / (RES_PULSE_MS / 1000), count: 1, spreadDeg: 0,
        speed: 0, range: RES_PULSE.range, width: RES_PULSE.width, pierce: 99, fuse: 1, orbit: false, echoes: [],
        extraShards: 0, twin: false, effects: m.traits, power: SIGNATURE_POWER, rateMul: 1,
      };
      const src: DamageSrc = { mountUid: m.uid, partId: 'beam', signatures: m.signatures, effects: m.traits };
      // Both ends of the crossbar: each mirror's turned exit (the routes that end on a turn).
      m.shots.forEach(({ route }, i) => {
        const last = route?.steps[route.steps.length - 1];
        if (!route || !last?.turned) return;
        const v = DIR_VEC[route.exit.dir];
        const o = ship.cellWorld({ x: route.exit.cell.x + v.x * 0.5, y: route.exit.cell.y + v.y * 0.5 });
        const k = Math.min(1, st.pulse / 120);
        this.scene.weapons.beams.line(`${m.uid}:res:${i}`, spec, o.x, o.y, ship.dirAngle(route.exit.dir), src, dtMs, Math.max(0.3, k), colour);
      });
      if (st.pulse <= 0) st.charge = 0;
      return;
    }

    st.charge += dtMs;
    const k = Math.min(1, st.charge / RES_CHARGE_MS);
    // The gap glows hotter: a thickening, flickering bar between the mirrors.
    const flick = 0.8 + Math.random() * 0.2;
    this.g.lineStyle(4 + k * 14, colour, (0.15 + 0.5 * k) * flick).lineBetween(a.x, a.y, b.x, b.y);
    this.g.lineStyle(2 + k * 4, 0xffffff, (0.3 + 0.6 * k) * flick).lineBetween(a.x, a.y, b.x, b.y);
    this.g.fillStyle(colour, 0.25 * k).fillCircle((a.x + b.x) / 2, (a.y + b.y) / 2, CELL * (0.4 + k * 0.8));
    // Rising whine: short beam blips climbing in pitch.
    st.whine -= dtMs;
    if (st.whine <= 0) {
      st.whine = 250 - 150 * k;
      Audio.sfx('beam', { pitch: 0.6 + k * 1.4, vol: 0.4 + 0.4 * k });
    }
    if (st.charge >= RES_CHARGE_MS) {
      st.pulse = RES_PULSE_MS;
      this.scene.fx.shake(10, 300);
      this.scene.fx.hitstop(60);
      Audio.sfx('explode', { pitch: 1.3 });
      this.fired('resonator', m.uid);
    }
  }

  // ---- Shatterstorm ----

  /** Called by WeaponSystem for every bolt hit, before the bolt's own on-hit effects. */
  onBoltHit(b: Bolt, e: Enemy): void {
    if (!b.src.signatures.includes('shatterstorm')) return;
    if (e.status.frozen > 0) {
      e.status.frozen = 0;
      if (e.alive) this.scene.enemies.damage(e, SHATTER_BONUS, b.src);
      this.shatter(e.x, e.y, b);
      this.fired('shatterstorm', b.src.mountUid);
    } else if (b.flags.shard && e.alive) {
      Status.apply(e, 'frozen', SHARD_FREEZE_MS);
    }
  }

  private shatter(x: number, y: number, by: Bolt): void {
    const colour = SIG_BY_ID.shatterstorm.colour;
    const ring = this.scene.add.circle(x, y, 8).setStrokeStyle(3, colour, 0.9).setDepth(16);
    this.scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
    const base = compileShot('cryo', [], null, 1);
    if (!base) return;
    const spec: ShotSpec = { ...base, damage: SHARD.damage, range: SHARD.range, width: 3, pierce: 0, effects: [] };
    const src: DamageSrc = { ...by.src, partId: 'cryo', effects: [] };
    const turn = Math.random() * Math.PI * 2;
    for (let i = 0; i < SHARDS && this.shards < MAX_SHARDS; i++) {
      const bolt = this.scene.weapons.fireBolt(spec, x, y, turn + (i / SHARDS) * Math.PI * 2, src, { colour, scale: 0.8 });
      if (!bolt) break;
      bolt.flags.shard = 1;
      this.shards++;
    }
    Audio.sfx('hit', { pitch: 1.8 });
  }

  /** WeaponSystem calls this when any bolt ends, so the live-shard cap stays accurate. */
  onBoltExpired(b: Bolt): void {
    if (b.flags.shard) this.shards = Math.max(0, this.shards - 1);
  }

  // ---- Jumpstart ----

  private onEnemyKilled(e: Enemy): void {
    if (e.status.charged <= 0 || e.kind === 'carrier' || this.allies.length >= MAX_ALLIES) return;
    if (!this.scene.ship.loadout.signatures.some(s => s.id === 'jumpstart')) return;
    const colour = SIG_BY_ID.jumpstart.colour;
    const img = this.scene.add.image(e.x, e.y, e.img.texture.key).setTint(colour).setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
    this.allies.push({ x: e.x, y: e.y, radius: e.radius, damage: Math.max(4, e.contactDamage) * ALLY_RAM_MUL, ttl: ALLY_MS, img });
    const ring = this.scene.add.circle(e.x, e.y, e.radius).setStrokeStyle(2, colour, 0.9).setDepth(16);
    this.scene.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
    this.fired('jumpstart');
  }

  private updateAllies(dtMs: number): void {
    const enemies = this.scene.enemies;
    const src: DamageSrc = { mountUid: -1, signatures: ['jumpstart'] };
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const a = this.allies[i];
      a.ttl -= dtMs;
      const t = a.ttl > 0 ? enemies.nearest(a.x, a.y, 500) : null;
      let popped = a.ttl <= 0;
      if (t) {
        const d = Math.hypot(t.x - a.x, t.y - a.y) || 1;
        const step = Math.min(d, (ALLY_SPEED * dtMs) / 1000);
        a.x += ((t.x - a.x) / d) * step;
        a.y += ((t.y - a.y) / d) * step;
        a.img.setRotation(Math.atan2(t.y - a.y, t.x - a.x) + Math.PI / 2);
        if (d <= a.radius + t.radius + 2) {
          enemies.damage(t, a.damage, src);
          popped = true;
        }
      }
      a.img.setPosition(a.x, a.y).setAlpha(a.ttl < 600 ? 0.4 + 0.6 * Math.abs(Math.sin(a.ttl / 60)) : 1);
      if (!popped) continue;
      this.pop(a);
      this.allies.splice(i, 1);
    }
  }

  private pop(a: Ally): void {
    const colour = SIG_BY_ID.jumpstart.colour;
    const ring = this.scene.add.circle(a.x, a.y, a.radius).setStrokeStyle(3, colour, 1).setDepth(16);
    this.scene.tweens.add({ targets: ring, scale: 2.5, alpha: 0, duration: 250, onComplete: () => ring.destroy() });
    a.img.destroy();
  }

  // ---- Storm Seed ----

  /** A Storm Seed bomb lands as a lightning pylon (Emitters calls this from the burst). */
  pylon(x: number, y: number, src: DamageSrc): void {
    if (this.pylons.length >= MAX_PYLONS) this.pylons.shift();
    this.pylons.push({ x, y, ttl: PYLON_MS, zap: 0, src });
  }

  private updatePylons(dtMs: number): void {
    const colour = SIG_BY_ID.stormSeed.colour;
    const spec: ShotSpec = {
      shape: 'chain', damage: PYLON_ZAP.damage, count: 1, spreadDeg: 0, speed: 0, range: PYLON_ZAP.range, width: 2,
      // Arc hops = 3 + pierce: two enemies per zap.
      pierce: -1, fuse: 1, orbit: false, echoes: [], extraShards: 0, twin: false, effects: [], power: 1, rateMul: 1,
    };
    for (let i = this.pylons.length - 1; i >= 0; i--) {
      const p = this.pylons[i];
      p.ttl -= dtMs;
      if (p.ttl <= 0) {
        this.pylons.splice(i, 1);
        continue;
      }
      p.zap -= dtMs;
      if (p.zap <= 0) {
        p.zap += PYLON_ZAP_MS;
        if (this.scene.weapons.emitters.arc(spec, p.x, p.y - 18, p.src).length) {
          this.fired('stormSeed', p.src.mountUid);
          Audio.sfx('beam', { pitch: 1.6, vol: 0.5 });
        }
      }
      // A lightning rod: base ring, mast, and a pulsing tip.
      const a = Math.min(1, p.ttl / 400);
      const pulse = 0.6 + 0.4 * Math.sin(this.scene.timeMs / 70);
      this.g.lineStyle(2, colour, 0.8 * a).strokeCircle(p.x, p.y, 8);
      this.g.lineStyle(3, colour, 0.9 * a).lineBetween(p.x, p.y, p.x, p.y - 18);
      this.g.lineStyle(1.5, 0xffffff, 0.9 * a).lineBetween(p.x - 5, p.y - 10, p.x + 5, p.y - 14);
      this.g.fillStyle(colour, 0.35 * pulse * a).fillCircle(p.x, p.y - 18, 9);
      this.g.fillStyle(0xffffff, 0.9 * a).fillCircle(p.x, p.y - 18, 3);
    }
  }

  // ---- Porcupine ----

  /**
   * An enemy bullet hit Bulwark `uid`. If that plate is in a Porcupine, the bullet sticks as a spike
   * (no damage) and true is returned; at 20 spikes they all fire back out in a ring.
   */
  spike(uid: number): boolean {
    const ship = this.scene.ship;
    if (!ship.loadout.signatures.some(s => s.id === 'porcupine' && s.uids.includes(uid))) return false;
    const list = this.spikes.get(uid) ?? [];
    this.spikes.set(uid, list);
    list.push(Math.random() * Math.PI * 2);
    Audio.sfx('hit', { pitch: 0.7 });
    if (list.length < SPIKES_TO_FIRE) return true;
    list.length = 0;
    const p = ship.grid.byUid(uid);
    if (!p) return true;
    const at = ship.cellWorld(p);
    const colour = SIG_BY_ID.porcupine.colour;
    const spec: ShotSpec = {
      shape: 'bolt', damage: SPIKE_BOLT.damage, count: 1, spreadDeg: 0, speed: SPIKE_BOLT.speed, range: SPIKE_BOLT.range,
      width: 3, pierce: SPIKE_BOLT.pierce, fuse: 1, orbit: false, echoes: [], extraShards: 0, twin: false, effects: [], power: 1, rateMul: 1,
    };
    const src: DamageSrc = { mountUid: uid, partId: 'bulwark', signatures: ['porcupine'], effects: [] };
    for (let i = 0; i < SPIKES_TO_FIRE; i++) {
      this.scene.weapons.fireBolt(spec, at.x, at.y, (i / SPIKES_TO_FIRE) * Math.PI * 2, src, { colour, scale: 1.1 });
    }
    this.scene.fx.shake(5, 180);
    Audio.sfx('explode', { pitch: 1.6, vol: 0.7 });
    this.fired('porcupine', uid);
    return true;
  }

  /** Stuck spikes, drawn on their plates (they turn with the ship). */
  private drawSpikes(): void {
    const ship = this.scene.ship;
    const colour = SIG_BY_ID.porcupine.colour;
    for (const [uid, list] of this.spikes) {
      const p = ship.grid.byUid(uid);
      if (!p || !list.length) continue;
      const c = ship.cellWorld(p);
      this.g.lineStyle(2, colour, 0.9);
      for (const a0 of list) {
        const a = a0 + ship.rotation, r0 = CELL * 0.3, r1 = CELL * 0.62;
        this.g.lineBetween(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0, c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1);
      }
    }
  }

  // ---- Grand Finale ----

  /**
   * A Grand Finale pod burst: 4 bomblets that each burst into 12 pulse bolts, and the echo repeats
   * the whole volley 0.4 s later. One volley (with its echo) spawns at most 150 bolts.
   */
  grandFinale(x: number, y: number, src: DamageSrc): void {
    const colour = SIG_BY_ID.grandFinale.colour;
    const volley: Volley = { left: FINALE_BOLT_CAP };
    const spec: ShotSpec = {
      shape: 'burst', damage: BOMBLET.damage, count: 1, spreadDeg: 0, speed: 380, range: BOMBLET.spread * 2,
      width: BOMBLET.radius, pierce: 0, fuse: 1, orbit: false, echoes: [], extraShards: 0, twin: false, effects: [], power: 1, rateMul: 1,
    };
    const fire = () => {
      const turn = Math.random() * Math.PI * 2;
      for (let k = 0; k < BOMBLETS; k++) {
        const a = turn + (k / BOMBLETS) * Math.PI * 2;
        const target = { x: x + Math.cos(a) * BOMBLET.spread, y: y + Math.sin(a) * BOMBLET.spread };
        this.scene.weapons.emitters.lob(spec, x, y, target, src, 'pulse', { bolts: BOMBLET.bolts, volley, colour });
      }
    };
    fire();
    this.pending.push({ at: this.scene.timeMs + FINALE_ECHO_MS, fire });
    // The first volley of a run gets the biggest shake in the game; later ones a tremor.
    if (this.finales++ === 0) this.scene.fx.shake(14, 500);
    else this.scene.fx.shake(3, 150);
    this.fired('grandFinale', src.mountUid);
  }

  get allyCount(): number {
    return this.allies.length;
  }
}

