import Phaser from 'phaser';
import { relayChance, RELAY_RANGE } from '../core/combat';
import { CORNERS } from '../core/grid';
import { SIGNATURE_POWER } from '../core/loadout';
import { addCell, DIR_VEC, DIRS } from '../core/math';
import { capVolley, compileShot } from '../core/shot';
import type { Loadout, MountSpec, PartId, Payload, Route, ShotSpec, SignatureId } from '../core/types';
import { partColour } from '../data/partShapes';
import { isNode } from '../data/parts';
import { SIG_BY_ID } from '../data/signatures';
import { TUNING } from '../data/tuning';
import type { GameScene } from '../scenes/GameScene';
import { Audio, type SfxName } from './Audio';
import { Beams, type BeamStyle } from './Beams';
import { BEAM_SIGS } from './SignatureRuntime';
import { applyHitEffects, blast, shotColour } from './Effects';
import { Emitters, PAYLOAD_BOLTS } from './Emitters';
import type { BoltOpts } from './Projectiles';
import { CELL, COLOURS, type Bolt, type DamageSrc, type Enemy } from './runtime';
import { Status } from './Status';

const BOLT_COLOUR: Partial<Record<PartId, number>> = {
  cockpit: COLOURS.player, pulse: 0xffb000, needle: 0xffe08a, cryo: 0x9ee7ff, saw: 0xe6ee9c,
};
const CONTINUOUS = new Set(['beam', 'flame', 'lance', 'ring']);

// Line Orbit Ring: parked shots (design §10).
const PARK_RADIUS = 48;
const PARK_MAX = 16;
const PARK_RELEASE = 120;
// Trait behaviours (plan Task 11).
const ORBIT_TRAIT_MS = 600;
const PULL_RATE = Phaser.Math.DegToRad(90);
const BOUNCE_RANGE = 250;
// Echo Coil heat.
const HEAT_MAX = 24;
const OVERHEAT_MS = 3000;
// Modifier "alone" behaviours.
const LENS_RAY = { damage: 8, everyMs: 1000, range: 300 };
const ORBIT_PUSH = { radius: 70, speed: 60 };
const PRISM_SPARKS = { n: 5, damage: 4, range: 300, everyMs: 2000, fanDeg: 40 };
const IDLE_FLAME = 0.4;
/** Fixed-weapon aim assist half-angle (0 disables). Covers the 22.5° gap of 8-way keyboard headings. */
export const AIM_ASSIST_DEG = 25;
const MEND_HEAL = 2;
// Signature flourishes (plan Task 15).
const CLUSTER_BOLTS = 12;
const SLING_GROUP_MS = 120;
const SLING_RELEASE_RANGE = 400;
// Addendum parts (A§2) and signatures (A§3).
/** Saw blade: a returning blade homes back to its exit point and ends within this distance. */
const BOOM_CATCH = 14;
/** Relay alone: kills within this range of a Relay throw one spark. */
const DEATH_SPARK = { reach: CELL * 3, damage: 5, range: 156 };
/** Overclock alone: teeth on exposed sides, ~15 dps. */
const GRINDER = { everyMs: 100, damage: 1.5, reach: CELL * 0.6 };
/** Hook alone: reel in the nearest loose pickup every few seconds. */
const GRAPPLE = { everyMs: 3000, range: 260, flashMs: 200 };
/** Hook tethers: dashes scrolling from each payload gun to its Hook. */
const TETHER = { dash: 6, gap: 4, alpha: 0.55, speed: 0.03 };
/** Domino: a shrapnel ring from each relay corpse. */
const DOMINO = { n: 6, mul: 0.3, range: 120 };
/** Flash Freeze: a frost bloom chills everything within ~1.5 cells of a freeze. */
const FROST_BLOOM = { r: CELL * 1.5, ms: 2000, mag: 0.6 };
/** Line signatures whose colour/flourish belongs to one route (the route starting at the signature's modifier). */
/** Shot pitch per gun, so a mixed loadout reads by ear. */
const SHOT_PITCH: Partial<Record<PartId, number>> = { cockpit: 1.25, pulse: 1, needle: 1.6, cryo: 0.75 };
const BEAM_SFX_MS = 280;
const LINE_SIGS: SignatureId[] = ['splitBeam', 'hallOfMirrors', 'halo', 'trident', 'afterburnerLance', 'slugRound', 'gravitySling'];

/** Aim that intercepts a moving enemy (one refinement step of the intercept time is plenty here). */
export function leadAngle(o: { x: number; y: number }, e: Enemy, speed: number): number {
  const mul = Status.speedMul(e);
  const vx = e.vx * mul, vy = e.vy * mul;
  let t = Math.hypot(e.x - o.x, e.y - o.y) / Math.max(1, speed);
  t = Math.hypot(e.x + vx * t - o.x, e.y + vy * t - o.y) / Math.max(1, speed);
  return Math.atan2(e.y + vy * t - o.y, e.x + vx * t - o.x);
}

interface MountState {
  mount: MountSpec;
  /** Seconds until the next trigger. */
  cooldown: number;
  triggers: number;
}

interface Flash {
  pts: { x: number; y: number }[];
  ttl: number;
  colour: number;
  width: number;
}

/**
 * Executes the compiled Loadout (design §9): fixed guns fire along their facing, turrets
 * route through their conduit then auto-aim, emitters find their own targets, continuous
 * shapes burn every step. Also runs the line/trait runtime flags and modifiers' alone behaviours.
 */
export class WeaponSystem {
  readonly beams: Beams;
  readonly emitters: Emitters;
  private states: MountState[] = [];
  private pending: { at: number; fire: () => void }[] = [];
  private heat = new Map<number, number>();
  private overheat = new Map<number, number>();
  private aloneTimers = new Map<number, number>();
  private flashes: Flash[] = [];
  private parked = 0;
  /** Per beam emitter: current assist offset from the muzzle direction (radians). */
  private beamAim = new Map<string, number>();
  /** Per continuous emitter key: the rule-based beam signature it carries (firing detection). */
  private beamSig = new Map<string, { uid: number; id: SignatureId }>();
  /** Gravity Sling: when each mount last released, so its parked bolts leave together. */
  private slingRelease = new Map<number, number>();
  private beamSfx = 0;
  /** Hooks some gun fires through: they carry payloads instead of grappling. */
  private carrierHooks = new Set<number>();
  private readonly g: Phaser.GameObjects.Graphics;
  /** Above the hull (depth 20): Hook tethers must read over the parts they link. */
  private readonly tg: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: GameScene) {
    this.beams = new Beams(scene);
    this.emitters = new Emitters(scene);
    this.g = scene.add.graphics().setDepth(13);
    this.tg = scene.add.graphics().setDepth(21);
    this.beams.onTick = (key, hitAny) => {
      const s = this.beamSig.get(key);
      if (s) scene.sigs.beamTick(key, s.uid, s.id, hitAny, 100);
    };
    const p = scene.projectiles;
    p.onSteer = (b, dt) => this.steer(b, dt);
    p.onHit = (b, e) => this.hit(b, e);
    p.onExpire = (b, e) => this.expire(b, e);
    p.onRangeEnd = b => this.rangeEnd(b);
    // A shield stops the bolt, but its payloads still go off against the arc (A§4: payloads beat Shielders).
    p.onBlocked = (b, e) => {
      if (b.src.payloads) for (const q of b.src.payloads) scene.payloads.release(q, b.x, b.y, b.src, e.id);
    };
    scene.listen('enemy-killed', (e: Enemy, src: DamageSrc) => {
      if (src.effects?.includes('mend')) this.healMote(e.x, e.y);
      this.deathSpark(e);
    });
    if (!scene.textures.exists('saw-blade')) {
      // Six hooked teeth around a hub, white so the bolt tint colours it.
      const g = scene.make.graphics({}, false);
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = i % 2 === 0 ? 7 : 4.2;
        pts.push({ x: 8 + Math.cos(a) * r, y: 8 + Math.sin(a) * r });
      }
      g.fillStyle(0xffffff, 0.35).fillCircle(8, 8, 8);
      g.fillStyle(0xffffff, 1).fillPoints(pts, true);
      g.fillStyle(0x000000, 1).fillCircle(8, 8, 1.8);
      g.generateTexture('saw-blade', 16, 16);
      g.destroy();
    }
  }

  rebuild(l: Loadout): void {
    this.states = l.mounts.map(mount => {
      const rate = this.rateOf(mount);
      return { mount, cooldown: rate > 0 ? Math.random() / rate : 0, triggers: 0 };
    });
    this.beamSig.clear();
    this.carrierHooks = new Set(l.mounts.flatMap(m => m.shots.flatMap(s => s.route?.steps.filter(st => st.partId === 'hook').map(st => st.uid) ?? [])));
    // Forget heat on coils that are gone.
    const uids = new Set(l.mounts.map(m => m.uid));
    for (const k of [...this.heat.keys()]) if (!uids.has(k)) this.heat.delete(k);
    for (const k of [...this.overheat.keys()]) if (!uids.has(k)) this.overheat.delete(k);
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    const now = this.scene.timeMs;

    for (const [uid, ms] of this.overheat) {
      if (ms - dtMs <= 0) this.overheat.delete(uid);
      else this.overheat.set(uid, ms - dtMs);
    }
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i].at > now) continue;
      const p = this.pending[i];
      this.pending.splice(i, 1);
      p.fire();
    }

    this.beams.begin();
    const echoCoils = this.states.filter(s => s.mount.partId === 'echo').length;
    for (const st of this.states) {
      const m = st.mount;
      if (m.shots.length === 0) {
        this.alone(m, dtMs);
        continue;
      }
      if (CONTINUOUS.has(m.shots[0].spec.shape)) {
        this.continuous(m, dtMs);
        continue;
      }
      const rate = this.rateOf(m);
      if (rate <= 0) continue;
      st.cooldown -= dt;
      if (st.cooldown > 0) continue;
      if (this.trigger(st, m.partId === 'cockpit' ? Math.min(2, echoCoils) : 0)) st.cooldown += 1 / rate;
      else st.cooldown = 0;
    }
    this.beams.end();
    this.emitters.update(dtMs);
    this.cutBulletsWithHardenedBolts();
    this.draw(dtMs);
  }

  /** One trigger of a rate-based mount. Returns false when nothing could fire (turret/emitter without a target). */
  private trigger(st: MountState, extraEchoes: number): boolean {
    const m = st.mount;
    let fired = false;
    st.triggers++;
    for (let i = 0; i < m.shots.length; i++) {
      let spec = this.effectiveSpec(m, i);
      const route = m.shots[i].route;
      // Lens fusion: only every `fuse`-th trigger releases the slug.
      if (spec.fuse > 1 && st.triggers % spec.fuse !== 0) {
        fired = true;
        continue;
      }
      if (extraEchoes > 0) spec = capVolley({ ...spec, echoes: [...spec.echoes, ...Array(extraEchoes).fill({ delay: 0.3, mul: 0.6 })] });
      const src = this.src(m, spec, m.shots[i].payloads);
      const origin = this.origin(m, route);

      if (m.aim === 'emitter') {
        if (spec.shape === 'burst') {
          const target = this.scene.enemies.densest(origin.x, origin.y, spec.range, 70);
          if (!target) continue;
          this.emitters.lob(spec, origin.x, origin.y, target, src, m.payload);
        } else {
          if (!this.scene.enemies.nearest(origin.x, origin.y, spec.range)) continue;
          this.emitters.arc(spec, origin.x, origin.y, src);
        }
        fired = true;
        continue;
      }

      let angle: number;
      if (m.aim === 'turret') {
        const t = this.scene.enemies.nearest(origin.x, origin.y, spec.range);
        if (!t) continue;
        angle = leadAngle(origin, t, spec.speed);
        if (route && route.path.length > 1) {
          this.flashes.push({ pts: route.path.map(c => this.scene.ship.cellWorld(c)), ttl: 150, colour: COLOURS.player, width: 2 });
        }
      } else {
        angle = this.assist(origin, this.scene.ship.dirAngle(route?.exit.dir ?? m.facing), spec);
      }
      this.heatUp(route);
      const sig = this.routeSig(m, route);
      this.fireSpec(spec, origin, angle, src, sig ? { colour: SIG_BY_ID[sig].colour } : {});
      if (sig === 'slugRound' && spec.fuse > 1) this.scene.sigs.byMount(m.uid, sig);
      this.sfx('shoot', SHOT_PITCH[m.partId] ?? 1, m.partId === 'cockpit' ? 0.35 : 0.55);
      fired = true;
    }
    return fired;
  }

  /** Beams, flames, lances and rings burn every step. */
  private continuous(m: MountSpec, dtMs: number): void {
    // Resonator replaces the beam's normal output entirely (Task 16).
    if (m.signatures.includes('resonator')) return this.scene.sigFx.resonator(m, dtMs);
    const ship = this.scene.ship;
    const intensity = m.partId === 'thruster' && !ship.moving ? IDLE_FLAME : 1;
    m.shots.forEach(({ route, payloads }, i) => {
      const spec = this.effectiveSpec(m, i);
      const src = this.src(m, spec, payloads);
      const key = `${m.uid}:${i}`;
      const sig = this.routeSig(m, route);
      if (sig && BEAM_SIGS.includes(sig)) this.beamSig.set(key, { uid: m.uid, id: sig });
      if (m.partId !== 'thruster' && this.scene.timeMs - this.beamSfx > BEAM_SFX_MS) {
        this.beamSfx = this.scene.timeMs;
        this.sfx('beam', 1, 0.3);
      }
      const colour = sig ? SIG_BY_ID[sig].colour : undefined;
      const style: BeamStyle = { ghost: sig === 'hallOfMirrors', shimmer: sig === 'afterburnerLance', spokes: sig === 'halo' };
      if (spec.shape === 'ring') {
        this.beams.ring(key, spec, ship.x, ship.y, src, dtMs, colour, style);
      } else {
        const o = this.origin(m, route);
        const dir = ship.dirAngle(route?.exit.dir ?? m.facing);
        // Exhaust stays straight; beams and lances get the same aim assist as fixed guns.
        const angle = m.partId === 'thruster' ? dir : this.assist(o, dir, spec, key);
        this.beams.line(key, spec, o.x, o.y, angle, src, dtMs, intensity, colour, style);
        // Split Beam: a white fork flash where the mirror splits the line. Trident: a core flash at the prism.
        if (sig === 'splitBeam' && route) {
          const at = ship.cellWorld(route.steps[0].cell);
          this.beams.flare(at.x, at.y, 7, colour!);
        } else if (sig === 'trident') {
          this.beams.flare(o.x, o.y, 8, colour!);
        }
      }
      // Heat accrues per beam tick rather than per frame: about 10 "shots" a second.
      if (route?.steps.some(s => s.partId === 'echo') && Math.random() < dtMs / 100) this.heatUp(route);
    });
  }

  /**
   * The single entry point for firing a compiled shot from a world point (Task 10 interface;
   * signature effects reuse it). Bolts fan by count/spread and add twin, shards and echoes.
   */
  fireSpec(spec: ShotSpec, origin: { x: number; y: number }, angle: number, src: DamageSrc, opts: Partial<BoltOpts> = {}): void {
    if (spec.shape === 'burst') {
      const t = this.scene.enemies.densest(origin.x, origin.y, spec.range, 70) ?? { x: origin.x + Math.cos(angle) * 160, y: origin.y + Math.sin(angle) * 160 };
      this.emitters.lob(spec, origin.x, origin.y, t, src, null);
      return;
    }
    if (spec.shape === 'chain') {
      this.emitters.arc(spec, origin.x, origin.y, src);
      return;
    }
    const volley = (mul: number, dx: number, dy: number) => {
      const n = Math.max(1, spec.count);
      const step = n > 1 ? Phaser.Math.DegToRad(spec.spreadDeg) / (n - 1) : 0;
      const x = origin.x + dx, y = origin.y + dy;
      for (let i = 0; i < n; i++) this.fireBolt(spec, x, y, angle + (i - (n - 1) / 2) * step, src, { ...opts, damage: spec.damage * mul });
      if (spec.twin) this.fireBolt(spec, x, y, angle + Phaser.Math.DegToRad(6), src, { ...opts, damage: spec.damage * 0.4 * mul, scale: 0.7 });
      for (let k = 0; k < spec.extraShards; k++) {
        const side = (k % 2 === 0 ? 1 : -1) * Phaser.Math.DegToRad(25);
        this.fireBolt({ ...spec, orbit: false }, x, y, angle + side, src, { ...opts, damage: spec.damage * 0.3 * mul, scale: 0.6 });
      }
    };
    volley(1, 0, 0);
    const ship = this.scene.ship;
    const sx = ship.x, sy = ship.y;
    for (const e of spec.echoes) {
      // Echoes re-fire from the same spot relative to the (moving) ship.
      this.pending.push({ at: this.scene.timeMs + e.delay * 1000, fire: () => volley(e.mul, ship.x - sx, ship.y - sy) });
    }
  }

  /** One bolt, with its runtime trait flags. Returns null when the projectile pool is full. */
  fireBolt(spec: ShotSpec, x: number, y: number, angle: number, src: DamageSrc, opts: Partial<BoltOpts> = {}): Bolt | null {
    const base = BOLT_COLOUR[src.partId ?? 'pulse'] ?? 0xffd36b;
    const saw = src.partId === 'saw';
    const b = this.scene.projectiles.fire(spec, x, y, angle, src, {
      colour: opts.colour ?? shotColour(base, spec.effects), ...(saw ? { texture: 'saw-blade' } : {}), ...opts,
    });
    if (!b) return null;
    if (saw) b.flags.spin = 1;
    if (spec.orbit && this.parked < PARK_MAX) {
      b.flags.park = 1;
      b.flags.phase = Math.random() * Math.PI * 2;
      this.parked++;
    } else if (spec.effects.includes('orbit')) {
      b.flags.orbitT = ORBIT_TRAIT_MS;
      b.flags.orbitA = Math.atan2(y - this.scene.ship.y, x - this.scene.ship.x);
      b.flags.launch = angle;
    }
    if (spec.effects.includes('pull')) b.flags.pull = 1;
    if (spec.effects.includes('bounce')) b.flags.bounce = 1;
    if (spec.effects.includes('boomerang')) {
      // Home offset: the blade comes back to where it left the hull, wherever the ship has moved.
      b.flags.boom = 1;
      b.flags.hx = x - this.scene.ship.x;
      b.flags.hy = y - this.scene.ship.y;
    }
    return b;
  }

  /**
   * Aim assist for fixed weapons: keyboard steering only gives 8 headings, 45° apart, so a
   * nose gun bends toward the nearest enemy inside ±AIM_ASSIST_DEG of its muzzle (and in range).
   * Continuous beams swing toward it smoothly (keyed) instead of snapping.
   */
  private assist(o: { x: number; y: number }, dir: number, spec: ShotSpec, key?: string): number {
    if (AIM_ASSIST_DEG <= 0) return dir;
    const cone = Phaser.Math.DegToRad(AIM_ASSIST_DEG);
    let best = dir, bestOff = cone;
    for (const e of this.scene.enemies.hash.query(o.x, o.y, spec.range)) {
      const d = Math.hypot(e.x - o.x, e.y - o.y);
      if (d > spec.range + e.radius) continue;
      const a = spec.speed > 0 ? leadAngle(o, e, spec.speed) : Math.atan2(e.y - o.y, e.x - o.x);
      const off = Math.abs(Phaser.Math.Angle.Wrap(a - dir));
      if (off < bestOff) {
        bestOff = off;
        best = a;
      }
    }
    if (!key) return best;
    // Beams: ease toward the target so the line sweeps rather than flickers between enemies.
    const prev = this.beamAim.get(key);
    const rel = Phaser.Math.Angle.Wrap(best - dir);
    const eased = prev === undefined ? rel : prev + Phaser.Math.Angle.Wrap(rel - prev) * 0.25;
    this.beamAim.set(key, Phaser.Math.Clamp(eased, -cone, cone));
    return dir + this.beamAim.get(key)!;
  }

  /** Bolts per Bomb Pod payload ring. */
  payloadBolts(src: DamageSrc): number {
    return src.signatures.includes('clusterShell') ? CLUSTER_BOLTS : PAYLOAD_BOLTS;
  }

  private steer(b: Bolt, dtMs: number): void {
    const ship = this.scene.ship;
    if (b.flags.ret) {
      const hx = ship.x + b.flags.hx, hy = ship.y + b.flags.hy;
      const d = Math.hypot(hx - b.x, hy - b.y);
      if (d <= BOOM_CATCH) {
        this.scene.projectiles.expire(b);
        return;
      }
      b.vx = ((hx - b.x) / d) * b.spec.speed;
      b.vy = ((hy - b.y) / d) * b.spec.speed;
      return;
    }
    if (b.flags.park) {
      b.flags.phase += (dtMs / 1000) * 3;
      b.x = ship.x + Math.cos(b.flags.phase) * PARK_RADIUS;
      b.y = ship.y + Math.sin(b.flags.phase) * PARK_RADIUS;
      b.vx = b.vy = 0;
      const sling = b.src.signatures.includes('gravitySling');
      if (sling) b.img.setScale(1.4 + 0.35 * Math.sin(this.scene.timeMs / 70 + b.flags.phase));
      // Gravity Sling: once one parked bolt sees a target, the whole ring unloads together.
      const group = sling && this.scene.timeMs - (this.slingRelease.get(b.src.mountUid) ?? -1e9) <= SLING_GROUP_MS;
      const t = this.scene.enemies.nearest(b.x, b.y, group ? SLING_RELEASE_RANGE : PARK_RELEASE);
      if (t) {
        b.flags.park = 0;
        this.parked--;
        const a = Math.atan2(t.y - b.y, t.x - b.x);
        b.vx = Math.cos(a) * b.spec.speed;
        b.vy = Math.sin(a) * b.spec.speed;
        b.travel = b.spec.range;
        if (!group) {
          if (sling) this.slingRelease.set(b.src.mountUid, this.scene.timeMs);
          this.scene.events.emit('orbit-release', b.src.mountUid);
        }
      }
      return;
    }
    if (b.flags.orbitT > 0) {
      b.flags.orbitT -= dtMs;
      b.flags.orbitA += (Math.PI * 2 * dtMs) / ORBIT_TRAIT_MS;
      b.x = ship.x + Math.cos(b.flags.orbitA) * 40;
      b.y = ship.y + Math.sin(b.flags.orbitA) * 40;
      b.vx = b.vy = 0;
      if (b.flags.orbitT <= 0) {
        b.vx = Math.cos(b.flags.launch) * b.spec.speed;
        b.vy = Math.sin(b.flags.launch) * b.spec.speed;
      }
      return;
    }
    if (b.flags.pull) {
      const t = this.scene.enemies.nearest(b.x, b.y, 300, b.hit);
      if (t) {
        const cur = Math.atan2(b.vy, b.vx);
        const want = Math.atan2(t.y - b.y, t.x - b.x);
        const a = Phaser.Math.Angle.RotateTo(cur, want, (PULL_RATE * dtMs) / 1000);
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(a) * sp;
        b.vy = Math.sin(a) * sp;
      }
    }
  }

  private hit(b: Bolt, e: Enemy): void {
    this.sfx('hit', 1, 0.35);
    this.scene.sigFx.onBoltHit(b, e);
    applyHitEffects(e, b.spec.effects);
    if (b.src.payloads) for (const p of b.src.payloads) this.scene.payloads.release(p, e.x, e.y, b.src, e.id);
    if (b.spec.fuse > 1 && b.src.signatures.includes('slugRound')) this.shockwave(e.x, e.y, SIG_BY_ID.slugRound.colour);
    // Shatterstorm shards freeze directly (SignatureEffects), so they skip the cryo hit count.
    if (b.src.partId === 'cryo' && e.alive && !b.flags.shard && Status.cryoHit(e) && b.src.signatures.includes('flashFreeze')) {
      this.frostBloom(e.x, e.y);
      this.scene.sigs.byMount(b.src.mountUid, 'flashFreeze');
    }
    if (!e.alive && b.spec.effects.includes('relay')) this.relay(b, e);
    if (b.flags.bounce && !b.flags.bounced) {
      const t = this.scene.enemies.nearest(e.x, e.y, BOUNCE_RANGE, b.hit);
      if (t) {
        b.flags.bounced = 1;
        const a = Math.atan2(t.y - b.y, t.x - b.x);
        const sp = Math.hypot(b.vx, b.vy) || b.spec.speed;
        b.vx = Math.cos(a) * sp;
        b.vy = Math.sin(a) * sp;
        b.pierceLeft++;
        b.travel = Math.max(b.travel, BOUNCE_RANGE);
      }
    }
  }

  private expire(b: Bolt, _e: Enemy | null): void {
    if (b.flags.park) this.parked--;
    this.scene.sigFx.onBoltExpired(b);
    const fx = b.spec.effects;
    if (fx.includes('shrapnel')) {
      const a = Math.atan2(b.vy, b.vx);
      const shard: ShotSpec = { ...b.spec, effects: [], orbit: false, pierce: 0, width: 2 };
      for (const side of [-1, 1]) {
        this.fireBolt(shard, b.x, b.y, a + side * Phaser.Math.DegToRad(35), { ...b.src, effects: [] }, { colour: 0xffd36b, damage: b.damage * 0.3, range: 140, scale: 0.6 });
      }
    }
    if (fx.includes('warhead')) blast(this.scene, b.x, b.y, 30, b.damage * 0.5, b.src, 0xff5a36);
  }

  /** Harden: bolts erase enemy bullets they touch. */
  private cutBulletsWithHardenedBolts(): void {
    const hard = this.scene.projectiles.list.filter(b => b.alive && b.spec.effects.includes('harden'));
    if (!hard.length) return;
    const bullets = this.scene.enemies.bullets;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const eb = bullets[i];
      if (eb.reflected) continue;
      if (hard.some(b => (b.x - eb.x) ** 2 + (b.y - eb.y) ** 2 <= (b.radius + 6) ** 2)) this.scene.enemies.removeBullet(eb);
    }
  }

  /** Modifiers on their own (design §10 "Alone"), using their received traits as flags. */
  private alone(m: MountSpec, dtMs: number): void {
    const p = this.scene.ship.cellWorld(m.cell);
    const tick = (every: number) => {
      const t = (this.aloneTimers.get(m.uid) ?? Math.random() * every) - dtMs;
      if (t > 0) {
        this.aloneTimers.set(m.uid, t);
        return false;
      }
      this.aloneTimers.set(m.uid, t + every);
      return true;
    };
    const src: DamageSrc = { mountUid: m.uid, partId: m.partId, signatures: m.signatures, effects: m.traits };
    switch (m.partId) {
      case 'lens':
        if (tick(LENS_RAY.everyMs)) {
          const t = this.scene.enemies.nearest(p.x, p.y, LENS_RAY.range);
          if (t) {
            const dmg = LENS_RAY.damage * (m.traits.includes('focus') ? 1.2 : 1);
            if (this.scene.enemies.damage(t, dmg, src, true, p)) applyHitEffects(t, m.traits);
            this.flashes.push({ pts: [p, { x: t.x, y: t.y }], ttl: 110, colour: 0xffffff, width: 2 });
          }
        }
        break;
      case 'orbit':
        for (const e of this.scene.enemies.inRadius(p.x, p.y, ORBIT_PUSH.radius)) {
          if (e.kind === 'carrier') continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
          e.x += ((e.x - p.x) / d) * ORBIT_PUSH.speed * (dtMs / 1000);
          e.y += ((e.y - p.y) / d) * ORBIT_PUSH.speed * (dtMs / 1000);
        }
        break;
      case 'prism':
        if (tick(PRISM_SPARKS.everyMs)) {
          const spark: ShotSpec = {
            shape: 'bolt', damage: PRISM_SPARKS.damage, count: PRISM_SPARKS.n, spreadDeg: PRISM_SPARKS.fanDeg, speed: 420,
            range: PRISM_SPARKS.range, width: 2, pierce: 0, fuse: 1, orbit: false, echoes: [], extraShards: 0, twin: false,
            effects: m.traits.filter(t => t !== 'orbit'), power: 1, rateMul: 1,
          };
          this.fireSpec(spark, p, this.scene.ship.dirAngle(m.facing), src, { colour: 0xffffff, scale: 0.6 });
        }
        break;
      case 'hook':
        if (!this.carrierHooks.has(m.uid) && tick(GRAPPLE.everyMs)) {
          const at = this.scene.pickups.grapple(p.x, p.y, GRAPPLE.range);
          if (at) this.flashes.push({ pts: [p, at], ttl: GRAPPLE.flashMs, colour: 0xffffff, width: 2 });
        }
        break;
      case 'overclock':
        if (tick(GRINDER.everyMs) && this.exposedSides(m).length) {
          for (const e of this.scene.enemies.inRadius(p.x, p.y, GRINDER.reach)) this.scene.enemies.damage(e, GRINDER.damage, src, true, p);
        }
        break;
      default:
        // Mirror reflection is resolved in GameScene's bullet collision; echo coils add cockpit echoes.
        break;
    }
  }

  /** Shots per second, with Overclock's rate multiplier (A§2.3). */
  private rateOf(m: MountSpec): number {
    return (TUNING.weapons[m.partId]?.fireRate ?? 0) * (m.shots[0]?.spec.rateMul ?? 1);
  }

  /** Boomerang: at the end of its range a blade turns home once (and again after each Ricochet). */
  private rangeEnd(b: Bolt): boolean {
    if (!b.flags.boom || b.flags.ret) return false;
    b.flags.ret = 1;
    b.hit.clear();
    b.travel = 2000;
    return true;
  }

  /**
   * Relay (A§2.4): a kill passes the shot on to the next enemy, at 100/50/25…% odds per hop.
   * A Saw blade redirects itself (Ricochet); other bolts fire one fresh bolt from the corpse (+ Domino's ring).
   */
  private relay(b: Bolt, e: Enemy): void {
    const hop = (b.flags.hop ?? 0) + 1;
    if (Math.random() >= relayChance(hop)) return;
    const t = this.nearestAlive(e.x, e.y, RELAY_RANGE, b.hit);
    if (!t) return;
    const a = Math.atan2(t.y - e.y, t.x - e.x);
    const uid = b.src.mountUid;
    if (b.src.partId === 'saw') {
      b.flags.ret = 0;
      b.flags.hop = hop;
      b.vx = Math.cos(a) * b.spec.speed;
      b.vy = Math.sin(a) * b.spec.speed;
      b.travel = RELAY_RANGE;
      this.scene.sigs.byMount(uid, 'ricochet');
      return;
    }
    const spec: ShotSpec = { ...b.spec, count: 1, echoes: [], twin: false, extraShards: 0, orbit: false, effects: b.spec.effects.filter(t => t !== 'orbit' && t !== 'boomerang') };
    const next = this.fireBolt(spec, e.x, e.y, a, b.src, { colour: b.colour, damage: b.damage });
    if (next) next.flags.hop = hop;
    if (b.src.signatures.includes('domino')) {
      const shard: ShotSpec = { ...spec, effects: [], pierce: 0, width: 2 };
      const colour = SIG_BY_ID.domino.colour;
      for (let i = 0; i < DOMINO.n; i++) {
        this.fireBolt(shard, e.x, e.y, a + (i / DOMINO.n) * Math.PI * 2, { ...b.src, effects: [] },
          { colour, damage: b.damage * DOMINO.mul, range: DOMINO.range, scale: 0.6 });
      }
      this.scene.sigs.byMount(uid, 'domino');
    }
  }

  /** Relay alone: a kill near a Relay throws one 5-damage spark at the nearest other enemy. */
  private deathSpark(dead: Enemy): void {
    const ship = this.scene.ship;
    const reach2 = DEATH_SPARK.reach ** 2;
    const relay = this.states.find(s => {
      if (s.mount.partId !== 'relay') return false;
      const c = ship.cellWorld(s.mount.cell);
      return (c.x - dead.x) ** 2 + (c.y - dead.y) ** 2 <= reach2;
    })?.mount;
    if (!relay) return;
    const t = this.nearestAlive(dead.x, dead.y, DEATH_SPARK.range, new Set([dead.id]));
    if (!t) return;
    this.flashes.push({ pts: [{ x: dead.x, y: dead.y }, { x: t.x, y: t.y }], ttl: 110, colour: 0xffffff, width: 2 });
    this.scene.enemies.damage(t, DEATH_SPARK.damage, { mountUid: relay.uid, partId: 'relay', signatures: relay.signatures, effects: [] }, true, dead);
  }

  /** Flash Freeze: a frost ring that chills every enemy around a fresh freeze. */
  private frostBloom(x: number, y: number): void {
    for (const e of this.scene.enemies.inRadius(x, y, FROST_BLOOM.r)) Status.apply(e, 'slow', FROST_BLOOM.ms, FROST_BLOOM.mag);
    const colour = SIG_BY_ID.flashFreeze.colour;
    const ring = this.scene.add.circle(x, y, FROST_BLOOM.r * 0.3).setStrokeStyle(3, colour, 0.95).setFillStyle(colour, 0.12).setDepth(16);
    this.scene.tweens.add({ targets: ring, scale: 1 / 0.3, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  /** Nearest enemy that is still alive (the hash still holds this frame's kills). */
  private nearestAlive(x: number, y: number, r: number, skip?: Set<number>): Enemy | null {
    let best: Enemy | null = null;
    let bestD = r * r;
    for (const e of this.scene.enemies.hash.query(x, y, r)) {
      if (!e.alive || skip?.has(e.id)) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d <= bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** Hook tethers: a scrolling dashed line from every payload gun to the Hook its carrier fires through. */
  private drawTethers(): void {
    const ship = this.scene.ship;
    const g = this.tg;
    g.clear();
    const done = new Set<string>();
    const scroll = (this.scene.timeMs * TETHER.speed) % (TETHER.dash + TETHER.gap);
    for (const st of this.states) {
      for (const shot of st.mount.shots) {
        for (const p of shot.payloads) {
          const k = `${p.uid}:${p.hookUid}`;
          const from = ship.grid.byUid(p.uid), to = ship.grid.byUid(p.hookUid);
          if (done.has(k) || !from || !to) continue;
          done.add(k);
          const a = ship.cellWorld(from), b = ship.cellWorld(to);
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
          g.lineStyle(2.5, partColour(p.partId), TETHER.alpha);
          for (let d = scroll - TETHER.dash; d < len; d += TETHER.dash + TETHER.gap) {
            const d0 = Math.max(0, d), d1 = Math.min(len, d + TETHER.dash);
            if (d1 > d0) g.lineBetween(a.x + ux * d0, a.y + uy * d0, a.x + ux * d1, a.y + uy * d1);
          }
        }
      }
    }
  }

  /** Sides of a part with no neighbour (Overclock's grinder teeth). */
  private exposedSides(m: MountSpec): (typeof DIRS)[number][] {
    const grid = this.scene.ship.grid;
    if (isNode(m.partId)) {
      // A node's side is exposed when both octagons on that side of its corner are empty.
      return DIRS.filter(d => {
        const v = DIR_VEC[d];
        return CORNERS.filter(o => (v.x !== 0 ? Math.sign(o.x) === v.x : Math.sign(o.y) === v.y))
          .every(o => !grid.get(m.cell.x + o.x, m.cell.y + o.y));
      });
    }
    return DIRS.filter(d => {
      const c = addCell(m.cell, d);
      return !grid.get(c.x, c.y);
    });
  }

  /** The mount's spec for route i, recompiled without any overheated Echo Coil. */
  private effectiveSpec(m: MountSpec, i: number): ShotSpec {
    const { route, spec } = m.shots[i];
    if (!route || !this.overheat.size || !route.steps.some(s => this.overheat.has(s.uid))) return spec;
    const steps = route.steps.filter(s => !this.overheat.has(s.uid));
    return compileShot(m.partId, m.traits, { ...route, steps }, m.signatures.length ? SIGNATURE_POWER : 1) ?? spec;
  }

  private heatUp(route: Route | null): void {
    if (!route) return;
    for (const s of route.steps) {
      if (s.partId !== 'echo' || this.overheat.has(s.uid)) continue;
      const h = (this.heat.get(s.uid) ?? 0) + 1;
      if (h >= HEAT_MAX) {
        this.heat.set(s.uid, 0);
        this.overheat.set(s.uid, OVERHEAT_MS);
      } else {
        this.heat.set(s.uid, h);
      }
    }
  }

  /** The line signature this route belongs to: one of the mount's matches that contains the route's first modifier. */
  private routeSig(m: MountSpec, route: Route | null): SignatureId | undefined {
    if (!m.signatures.length || !route?.steps.length) return undefined;
    const first = route.steps[0].uid;
    return this.scene.ship.loadout.signatures.find(s =>
      LINE_SIGS.includes(s.id) && m.signatures.includes(s.id) && s.uids.includes(m.uid) && s.uids.includes(first))?.id;
  }

  private sfx(name: SfxName, pitch: number, vol: number): void {
    Audio.sfx(name, { pitch, vol });
  }

  /** Slug Round: a heavy ring on every slug hit. */
  private shockwave(x: number, y: number, colour: number): void {
    const ring = this.scene.add.circle(x, y, 10).setStrokeStyle(4, colour, 0.9).setDepth(16);
    this.scene.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 300, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  private src(m: MountSpec, spec: ShotSpec, payloads?: Payload[]): DamageSrc {
    const src: DamageSrc = { mountUid: m.uid, partId: m.partId, signatures: m.signatures, effects: spec.effects };
    if (payloads?.length) src.payloads = payloads;
    return src;
  }

  /** World point a shot leaves from: half a cell past the exit cell along the exit direction. */
  private origin(m: MountSpec, route: Route | null): { x: number; y: number } {
    const ship = this.scene.ship;
    if (!route) return ship.cellWorld(m.cell);
    const v = DIR_VEC[route.exit.dir];
    return ship.cellWorld({ x: route.exit.cell.x + v.x * 0.5, y: route.exit.cell.y + v.y * 0.5 });
  }

  private healMote(x: number, y: number): void {
    const dot = this.scene.add.image(x, y, 'spark').setTint(0x7dffb2).setDepth(18).setScale(1.4);
    const ship = this.scene.ship;
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: 450, ease: 'Quad.easeIn',
      onUpdate: tw => {
        const k = tw.getValue() ?? 0;
        dot.setPosition(Phaser.Math.Linear(x, ship.x, k), Phaser.Math.Linear(y, ship.y, k));
      },
      onComplete: () => {
        dot.destroy();
        this.scene.heal(MEND_HEAL);
      },
    });
  }

  private draw(dtMs: number): void {
    const g = this.g;
    g.clear();
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.ttl -= dtMs;
      if (f.ttl <= 0) {
        this.flashes.splice(i, 1);
        continue;
      }
      g.lineStyle(f.width, f.colour, Math.min(0.7, f.ttl / 150));
      g.beginPath();
      f.pts.forEach((q, j) => (j ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
      g.strokePath();
    }
    // Echo Coil heat rings: fill with heat; solid red while overheated.
    const ship = this.scene.ship;
    for (const st of this.states) {
      const p = st.mount;
      if (p.partId !== 'echo') continue;
      const c = ship.cellWorld(p.cell);
      const over = this.overheat.get(p.uid);
      if (over) {
        g.lineStyle(2, COLOURS.hurt, 0.5 + 0.4 * Math.sin(this.scene.timeMs / 60)).strokeCircle(c.x, c.y, CELL * 0.55);
      } else {
        const h = (this.heat.get(p.uid) ?? 0) / HEAT_MAX;
        if (h <= 0) continue;
        g.lineStyle(2, COLOURS.violet, 0.85);
        g.beginPath();
        g.arc(c.x, c.y, CELL * 0.55, -Math.PI / 2, -Math.PI / 2 + h * Math.PI * 2);
        g.strokePath();
      }
    }
    this.drawTethers();
    // Overclock grinder: three teeth on each exposed side, crawling along the edge.
    const crawl = (this.scene.timeMs / 120) % 1;
    for (const st of this.states) {
      if (st.mount.partId !== 'overclock') continue;
      const c = ship.cellWorld(st.mount.cell);
      for (const d of this.exposedSides(st.mount)) {
        const out = ship.dirAngle(d);
        const ox = Math.cos(out), oy = Math.sin(out);
        const tx = -oy, ty = ox; // along the edge
        g.fillStyle(0xff5252, 0.85);
        for (let k = 0; k < 3; k++) {
          const u = ((k + crawl) / 3 - 0.5) * CELL * 0.7;
          const bx = c.x + ox * CELL * 0.45 + tx * u, by = c.y + oy * CELL * 0.45 + ty * u;
          g.fillTriangle(bx - tx * 3, by - ty * 3, bx + tx * 3, by + ty * 3, bx + ox * 5, by + oy * 5);
        }
      }
    }
  }
}
