import Phaser from 'phaser';
import { RateLimiter } from '../core/combat';
import { HOOK_PAYLOAD_MUL, SIGNATURE_POWER } from '../core/loadout';
import type { Payload, ShotSpec, SignatureId } from '../core/types';
import { SIG_BY_ID } from '../data/signatures';
import type { GameScene } from '../scenes/GameScene';
import { applyHitEffects, blast } from './Effects';
import { segCircle } from './Projectiles';
import type { DamageSrc, Enemy } from './runtime';

/** Every payload release in the game shares this budget (A§2.2, "payload storms"). */
const PAYLOADS_PER_SEC = 30;
/** A beam carrier releases on the same enemy at most this often. */
const BEAM_GATE_MS = 500;
/** Bolt payloads: this many bolts at the nearest enemies around the impact. */
const BOLT_PAYLOAD = { n: 3, range: 160 };
/** Beam payload: an instant stab at half the beam's per-second damage. */
const STAB = { len: 78, mul: 0.5, ms: 110 };
/** Sticky bomb: rides the target, then blasts. */
const STICKY = { fuseMs: 300, r: 42 };

interface Sticky {
  targetId: number;
  x: number;
  y: number;
  t: number;
  damage: number;
  src: DamageSrc;
}

/** The signature a payload of this part completes on its carrier (for crediting). */
const PAYLOAD_SIG: Partial<Record<string, SignatureId>> = { bomb: 'stickyBomb', arc: 'lightningRod' };

/**
 * Hook payloads (design addendum A§2.2): a carrier shot that went through a Hook releases each
 * weapon touching that Hook at the impact point, at 60% strength (more inside Sticky Bomb / Lightning Rod).
 */
export class Payloads {
  private readonly limiter = new RateLimiter(PAYLOADS_PER_SEC);
  private readonly beamGate = new Map<string, number>();
  /** Releases per payload gun, for the Lens fuse (a slug fires on every `fuse`-th release, as on its own trigger). */
  private readonly fuseCount = new Map<number, number>();
  private readonly sticky: Sticky[] = [];
  private stabs: { x0: number; y0: number; x1: number; y1: number; ttl: number; colour: number }[] = [];
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: GameScene) {
    this.g = scene.add.graphics().setDepth(16);
  }

  /** Releases one payload at (x, y), where the carrier hit enemy `targetId`. */
  release(p: Payload, x: number, y: number, carrier: DamageSrc, targetId: number): void {
    const scene = this.scene;
    const mount = scene.ship.loadout.mounts.find(m => m.uid === p.uid);
    const base = mount?.shots[0]?.spec;
    if (!mount || !base) return;
    if (base.fuse > 1) {
      const n = (this.fuseCount.get(p.uid) ?? 0) + 1;
      this.fuseCount.set(p.uid, n);
      if (n % base.fuse !== 0) return;
    }
    if (!this.limiter.take(scene.timeMs)) return;
    const sig = PAYLOAD_SIG[p.partId];
    const named = !!sig && carrier.signatures.includes(sig);
    // The payload gun may already carry signature power (it is part of the same signature); never stack it twice.
    const mul = HOOK_PAYLOAD_MUL * (named && base.power < SIGNATURE_POWER ? SIGNATURE_POWER : 1);
    const spec: ShotSpec = { ...base, damage: base.damage * mul };
    const src: DamageSrc = { mountUid: p.uid, partId: p.partId, signatures: mount.signatures, effects: spec.effects };

    if (spec.shape === 'bolt') this.bolts(p, spec, x, y, src, targetId);
    else if (spec.shape === 'burst') this.sticky.push({ targetId, x, y, t: STICKY.fuseMs, damage: spec.damage, src });
    else if (spec.shape === 'chain') scene.weapons.emitters.arc(spec, x, y, src);
    else this.stab(spec, x, y, src, targetId);

    if (named) scene.sigs.byMount(carrier.mountUid, sig!);
  }

  /** A beam carrier touching enemy `e`: releases its payloads there, at most once per 500 ms per enemy. */
  onBeamTouch(key: string, e: Enemy, carrier: DamageSrc): void {
    if (!carrier.payloads?.length) return;
    const k = `${key}:${e.id}`;
    const now = this.scene.timeMs;
    if (now - (this.beamGate.get(k) ?? -1e9) < BEAM_GATE_MS) return;
    this.beamGate.set(k, now);
    for (const p of carrier.payloads) this.release(p, e.x, e.y, carrier, e.id);
  }

  update(dtMs: number): void {
    const now = this.scene.timeMs;
    if (this.beamGate.size > 256) for (const [k, t] of this.beamGate) if (now - t > BEAM_GATE_MS) this.beamGate.delete(k);
    const g = this.g;
    g.clear();
    const colour = SIG_BY_ID.stickyBomb.colour;
    for (let i = this.sticky.length - 1; i >= 0; i--) {
      const s = this.sticky[i];
      const t = this.scene.enemies.list.find(e => e.alive && e.id === s.targetId);
      if (t) {
        s.x = t.x;
        s.y = t.y;
      }
      s.t -= dtMs;
      if (s.t <= 0) {
        this.sticky.splice(i, 1);
        blast(this.scene, s.x, s.y, STICKY.r, s.damage, s.src, colour);
        continue;
      }
      const on = Math.floor(s.t / 60) % 2 === 0;
      g.fillStyle(on ? 0xffffff : colour, 1).fillCircle(s.x, s.y, on ? 4 : 3);
    }
    for (let i = this.stabs.length - 1; i >= 0; i--) {
      const s = this.stabs[i];
      s.ttl -= dtMs;
      if (s.ttl <= 0) {
        this.stabs.splice(i, 1);
        continue;
      }
      g.lineStyle(3, s.colour, Math.min(0.9, s.ttl / STAB.ms)).lineBetween(s.x0, s.y0, s.x1, s.y1);
    }
  }

  /** Bolt guns: 3 bolts at the nearest other enemies (a Saw throws one blade). */
  private bolts(p: Payload, spec: ShotSpec, x: number, y: number, src: DamageSrc, targetId: number): void {
    const enemies = this.scene.enemies;
    const near = enemies.hash.query(x, y, BOLT_PAYLOAD.range)
      .filter(e => e.alive && e.id !== targetId && (e.x - x) ** 2 + (e.y - y) ** 2 <= BOLT_PAYLOAD.range ** 2)
      .sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - ((b.x - x) ** 2 + (b.y - y) ** 2));
    if (!near.length) return;
    const n = p.partId === 'saw' ? 1 : BOLT_PAYLOAD.n;
    // A released blade flies one way (no hull spot to come home to), and a released bolt never detours to orbit the ship.
    const one: ShotSpec = { ...spec, count: 1, echoes: [], twin: false, extraShards: 0, orbit: false, effects: spec.effects.filter(t => t !== 'boomerang' && t !== 'orbit') };
    for (let i = 0; i < n; i++) {
      const t = near[i % near.length];
      const b = this.scene.weapons.fireBolt(one, x, y, Math.atan2(t.y - y, t.x - x), src, { range: Math.max(one.range, BOLT_PAYLOAD.range) });
      b?.hit.add(targetId);
    }
  }

  /** Beam guns: an instant 78 px stab at the nearest other enemy. */
  private stab(spec: ShotSpec, x: number, y: number, src: DamageSrc, targetId: number): void {
    const enemies = this.scene.enemies;
    let best: Enemy | null = null;
    let bestD = (STAB.len + 40) ** 2;
    for (const e of enemies.hash.query(x, y, STAB.len + 40)) {
      if (!e.alive || e.id === targetId) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    const a = best ? Math.atan2(best.y - y, best.x - x) : Math.random() * Math.PI * 2;
    const x1 = x + Math.cos(a) * STAB.len, y1 = y + Math.sin(a) * STAB.len;
    for (const e of enemies.hash.query((x + x1) / 2, (y + y1) / 2, STAB.len)) {
      if (!e.alive || !segCircle(x, y, x1, y1, e.x, e.y, e.radius + spec.width / 2)) continue;
      if (enemies.damage(e, spec.damage * STAB.mul, src, true, { x, y })) applyHitEffects(e, spec.effects);
    }
    this.stabs.push({ x0: x, y0: y, x1, y1, ttl: STAB.ms, colour: 0xffffff });
  }
}
