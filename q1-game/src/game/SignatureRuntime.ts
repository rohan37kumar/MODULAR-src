import Phaser from 'phaser';
import { recordDiscovery, writeSave } from '../core/save';
import type { PartId, SignatureId } from '../core/types';
import { PARTS } from '../data/parts';
import { SIG_BY_ID } from '../data/signatures';
import { storage, type GameScene } from '../scenes/GameScene';
import { Audio } from './Audio';

/** Rule-based signatures whose firing is a continuous output (design §9.4; plan Task 15). */
export const BEAM_SIGS: SignatureId[] = ['splitBeam', 'hallOfMirrors', 'halo', 'trident', 'afterburnerLance'];
/** A beam counts as fired after this long on with an enemy touched. */
const BEAM_ON_MS = 300;
/** Gap between queued first-discovery announcements (real ms). */
const ANNOUNCE_GAP_MS = 2400;
/** Repeat name tags: at most one per signature per this long (real ms). */
const TAG_COOLDOWN_MS = 4000;
/** Impostor flourish: RGB-split jitter length, sideways split (ship-local px), and per-Mimic gap (real ms). */
const GLITCH_MS = 250;
const GLITCH_PX = 2;
const GLITCH_GAP_MS = 1000;
/** The split copies: red and cyan. */
const GLITCH_TINTS = [0xff2d55, 0x00e5ff];

/** Order-free key for a match's participants. */
const uidKey = (uids: number[]) => [...uids].sort((a, b) => a - b).join(',');

/**
 * Signature firing → Xeno Archive. Every signature path ends in fired(). The first fire in a
 * save is announced (slow-mo, link line, banner, Archive count) and recorded; later fires
 * show a small name tag. Also keeps the run's signature stats for the end screen.
 */
export class SignatureRuntime {
  readonly newThisRun: SignatureId[] = [];
  readonly firedThisRun: SignatureId[] = [];
  /** Key parts unlocked as Blueprint starts this run. */
  readonly blueprintsThisRun: PartId[] = [];
  private queue: { id: SignatureId; uids: number[]; blueprint: PartId | null }[] = [];
  private gap = 0;
  private realNow = 0;
  private lastTag = new Map<SignatureId, number>();
  /** Last Impostor glitch per Mimic uid (real ms). */
  private lastGlitch = new Map<number, number>();
  /** Continuous emitters (by Beams key): damage ticks seen and whether any touched an enemy. */
  private beamOn = new Map<string, { ms: number; hit: boolean; done: boolean }>();

  constructor(private readonly scene: GameScene) {
    scene.listen('payload-burst', (uid: number) => this.byMount(uid, 'clusterShell'));
    scene.listen('scrap-slug', (uid: number) => this.byMount(uid, 'coinSlinger'));
    scene.listen('orbit-release', (uid: number) => this.byMount(uid, 'gravitySling'));
    scene.listen('loadout-changed', () => this.beamOn.clear());
  }

  /** Credits `id` to the recognised match that includes mount `uid`, if there is one. */
  byMount(uid: number, id: SignatureId): void {
    const m = this.scene.ship.loadout.signatures.find(s => s.id === id && s.uids.includes(uid));
    if (m) this.fired(id, m.uids);
  }

  /** One damage tick of a continuous emitter carrying a rule-based beam signature. */
  beamTick(key: string, mountUid: number, id: SignatureId, hitAny: boolean, tickMs: number): void {
    const s = this.beamOn.get(key) ?? { ms: 0, hit: false, done: false };
    this.beamOn.set(key, s);
    if (s.done) return;
    s.ms += tickMs;
    s.hit ||= hitAny;
    if (s.ms >= BEAM_ON_MS && s.hit) {
      s.done = true;
      this.byMount(mountUid, id);
    }
  }

  /**
   * Credits a signature fire. When a Mimic completed the combo (an `impostor` match with the same
   * participants), Impostor is credited right after it, so both announce (queued) and both save.
   */
  fired(id: SignatureId, uids: number[]): void {
    this.credit(id, uids);
    if (id === 'impostor') return;
    const key = uidKey(uids);
    const imp = this.scene.ship.loadout.signatures.find(s => s.id === 'impostor' && uidKey(s.uids) === key);
    if (imp) this.fired('impostor', imp.uids);
  }

  private credit(id: SignatureId, uids: number[]): void {
    if (id === 'impostor') this.glitch(uids);
    if (!this.firedThisRun.includes(id)) this.firedThisRun.push(id);
    this.scene.events.emit('signature-fired', id);
    if (this.queue.some(q => q.id === id)) return;
    if (!this.scene.save.discovered.includes(id)) {
      // Saved now, announced later: a run that ends inside the queue gap (Impostor always waits 2.4 s) keeps the discovery.
      const r = recordDiscovery(this.scene.save, id);
      this.scene.save = r.save;
      writeSave(r.save, storage());
      this.newThisRun.push(id);
      if (r.blueprint) this.blueprintsThisRun.push(r.blueprint);
      this.queue.push({ id, uids, blueprint: r.blueprint });
      return;
    }
    const last = this.lastTag.get(id);
    if (last !== undefined && this.realNow - last < TAG_COOLDOWN_MS) return;
    this.lastTag.set(id, this.realNow);
    this.scene.fx.tag(SIG_BY_ID[id].name, SIG_BY_ID[id].colour);
  }

  /**
   * Impostor flourish: a short RGB-split jitter on each Mimic in the match: a red and a cyan copy
   * of its sprite shake around it, fade, and are destroyed. At most one per Mimic per GLITCH_GAP_MS.
   */
  private glitch(uids: number[]): void {
    const ship = this.scene.ship;
    for (const uid of uids) {
      const src = ship.mimicSprite(uid);
      if (!src) continue;
      const last = this.lastGlitch.get(uid);
      if (last !== undefined && this.realNow - last < GLITCH_GAP_MS) continue;
      this.lastGlitch.set(uid, this.realNow);
      const copies = GLITCH_TINTS.map(tint => {
        const c = this.scene.add.image(src.x, src.y, src.texture.key)
          .setDisplaySize(src.displayWidth, src.displayHeight).setRotation(src.rotation).setFlipX(src.flipX)
          .setTint(tint).setBlendMode(Phaser.BlendModes.ADD);
        ship.container.add(c);
        return c;
      });
      const x0 = src.x, y0 = src.y;
      this.scene.tweens.addCounter({
        from: 0, to: 1, duration: GLITCH_MS,
        onUpdate: tw => {
          const k = tw.getValue() ?? 1;
          copies.forEach((c, i) => {
            if (!c.scene) return; // destroyed by a ship redraw mid-glitch
            const side = i === 0 ? -1 : 1;
            c.setPosition(x0 + side * GLITCH_PX + Phaser.Math.Between(-2, 2), y0 + Phaser.Math.Between(-2, 2))
              .setAlpha(0.85 * (1 - k * k));
          });
        },
        onComplete: () => copies.forEach(c => c.destroy()),
      });
    }
  }

  /** Real (unscaled) time, so slow-mo doesn't stretch the announcement queue. */
  update(realMs: number): void {
    this.realNow += realMs;
    this.gap = Math.max(0, this.gap - realMs);
    if (this.gap > 0 || !this.queue.length) return;
    this.announce(this.queue.shift()!);
  }

  private announce({ id, uids, blueprint }: { id: SignatureId; uids: number[]; blueprint: PartId | null }): void {
    const scene = this.scene;
    this.lastTag.set(id, this.realNow);
    this.gap = ANNOUNCE_GAP_MS;

    const def = SIG_BY_ID[id];
    const fx = scene.fx;
    fx.hitstop(40);
    fx.slowmo(500, 0.25);
    Audio.sfx('stinger');
    fx.link(() => uids.map(u => scene.ship.grid.byUid(u)).filter(p => !!p).map(p => scene.ship.cellWorld(p!)), def.colour);
    fx.banner(def.name, def.quip, def.colour);
    if (blueprint) fx.toast(`Blueprint unlocked: ${PARTS[blueprint].name}`, 0x00e5ff);
    scene.events.emit('signature-discovered', id);
  }
}
