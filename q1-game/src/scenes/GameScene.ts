import Phaser from 'phaser';
import { shipZoomMul } from '../core/combat';
import { blueprintSpot } from '../core/grid';
import { DropPacer, SpawnDirector } from '../core/director';
import { clampDt } from '../core/math';
import { mulberry32 } from '../core/rng';
import { loadSave, recordModule, writeSave } from '../core/save';
import type { PartId, PlacedPart, SaveData, ShipJSON, SignatureId } from '../core/types';
import { COPY } from '../data/copy';
import { isNode } from '../data/parts';
import { Audio } from '../game/Audio';
import { installDebug } from '../game/debug';
import { BASE_TINT, EnemySystem } from '../game/EnemySystem';
import { Fx } from '../game/Fx';
import type { HudState } from '../game/Hud';
import { Input } from '../game/Input';
import { Payloads } from '../game/Payloads';
import { Pickups } from '../game/Pickups';
import { Projectiles } from '../game/Projectiles';
import { MAX_ENEMY_RADIUS, type DamageSrc, type Enemy, type EnemyBullet } from '../game/runtime';
import { MAX_HULL, Ship } from '../game/Ship';
import { SignatureEffects } from '../game/SignatureEffects';
import { SignatureRuntime } from '../game/SignatureRuntime';
import { Utility } from '../game/Utility';
import { WeaponSystem } from '../game/WeaponSystem';
import { DPR, PHONE, TEX, viewSize } from '../game/view';
import type { ForgeData } from './ForgeScene';
import type { HudScene } from './HudScene';

export interface GameInit {
  blueprint?: PartId | null;
}

export interface RunResult {
  timeMs: number;
  kills: number;
  /** Modules on the final ship (cockpit excluded). */
  parts: number;
  ship: ShipJSON;
  newThisRun: SignatureId[];
  firedThisRun: SignatureId[];
  blueprints: PartId[];
  /** Set by the End screen once the run is in the save (returning from the Archive must not count it twice). */
  recorded?: boolean;
}

const STEP_MS = 50;
const IFRAMES_MS = 350;
const CONTACT_CD_MS = 500;
/** A Carrier ram hurts once, not every 0.5 s while it sits on the hull (Task 16: P3 charges ground ships down at 40 hull/s). */
const CARRIER_CONTACT_CD_MS = 1500;
const CARRIER_KNOCKBACK = 60;
const MIRROR_REFLECT = 1.5;
const REFLECT_DAMAGE_MUL = 1.5;

/** Reads localStorage defensively (it may be missing or throw). */
export const storage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * One run: owns the ship and every system, steps them in fixed ≤ 50 ms substeps,
 * resolves ship collisions and ends the run when the hull fails.
 * Events (this.events): 'part-attached', 'loadout-changed', 'signature-fired', 'signature-discovered', 'hull-changed',
 * 'enemy-killed', 'forge-picked', 'repair-picked', 'run-ended'.
 */
export class GameScene extends Phaser.Scene {
  ship!: Ship;
  controls!: Input;
  enemies!: EnemySystem;
  projectiles!: Projectiles;
  weapons!: WeaponSystem;
  payloads!: Payloads;
  director!: SpawnDirector;
  pacer!: DropPacer;
  pickups!: Pickups;
  utility!: Utility;
  fx!: Fx;
  sigs!: SignatureRuntime;
  sigFx!: SignatureEffects;
  save!: SaveData;

  timeMs = 0;
  kills = 0;
  /** Debug/slow-mo multiplier on simulated time. */
  timeScale = 1;
  god = false;
  /** Debug: stop the spawn director. */
  directorPaused = false;
  /** Smoothed simulation cost per frame (ms), for the debug overlay. */
  updateMs = 0;
  private iframes = 0;
  private ended = false;
  /** Paused by the player or by losing focus (not by the Forge). */
  paused = false;
  private pendingForge = false;
  private forgesThisRun = 0;
  private stars: Phaser.GameObjects.TileSprite[] = [];
  /** Screen-fit zoom from layout(); the live zoom eases toward baseZoom × shipZoomMul (A§6.5, Katamari zoom-out). */
  private baseZoom = 1;
  private zoomMul = 1;
  /** Zoom the star layers were last sized for. */
  private starZoom = 0;

  constructor() {
    super('Game');
  }

  init(): void {
    this.timeMs = 0;
    this.kills = 0;
    this.timeScale = 1;
    this.god = false;
    this.directorPaused = false;
    this.iframes = 0;
    this.ended = false;
    this.paused = false;
    this.pendingForge = false;
    this.forgesThisRun = 0;
    this.zoomMul = 1;
  }

  create(data: GameInit): void {
    this.save = loadSave(storage());
    const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    this.director = new SpawnDirector(mulberry32(seed));
    // The first run of an empty Archive is seeded so an early combo is likely (design §12).
    this.pacer = new DropPacer(mulberry32(seed ^ 0x9e3779b9), this.save.discovered.length === 0);

    this.stars = [
      this.add.tileSprite(0, 0, 10, 10, 'stars-far').setScrollFactor(0).setDepth(-20).setAlpha(0.6).setScale(1 / TEX),
      this.add.tileSprite(0, 0, 10, 10, 'stars-near').setScrollFactor(0).setDepth(-19).setAlpha(0.9).setScale(1 / TEX),
    ];

    this.fx = new Fx(this);
    this.sigs = new SignatureRuntime(this);
    this.ship = new Ship(this);
    this.controls = new Input(this);
    this.enemies = new EnemySystem(this);
    this.projectiles = new Projectiles(this);
    this.weapons = new WeaponSystem(this);
    this.payloads = new Payloads(this);
    this.pickups = new Pickups(this);
    this.utility = new Utility(this);
    this.sigFx = new SignatureEffects(this);
    this.weapons.rebuild(this.ship.loadout);
    // Blueprint start (design §13): the chosen unlocked part sits in front of the cockpit (a node in the front-right gap).
    const bp = data?.blueprint;
    if (bp && this.save.blueprints.includes(bp)) {
      const g = this.ship.grid.clone();
      if (g.place(bp, blueprintSpot(bp), 0)) {
        this.ship.setGrid(g);
        this.logModule(bp);
      }
    }

    this.listen('loadout-changed', () => this.weapons.rebuild(this.ship.loadout));
    this.listen('enemy-killed', (e: Enemy, src: DamageSrc) => this.onKill(e, src));
    this.listen('forge-picked', () => { this.pendingForge = true; });
    this.listen('repair-picked', () => Audio.sfx('pickup'));
    this.listen('part-attached', (p: PlacedPart) => {
      Audio.sfx('attach');
      this.logModule(p.id);
    });
    this.listen('carrier-killed', (e: Enemy) => {
      this.fx.shake(12, 400);
      this.fx.hitstop(40);
      this.fx.burst(e.x, e.y, BASE_TINT.carrier, 40);
      Audio.sfx('explode', { pitch: 0.7 });
    });
    // Each Carrier phase change drops one bonus part at the Carrier (design addendum §5).
    this.listen('carrier-phase', (e: Enemy) => {
      for (const d of this.pacer.onCarrierPhase(this.timeMs)) this.pickups.spawn(d, e.x, e.y);
    });

    const cam = this.cameras.main;
    cam.setBackgroundColor('#000');
    // Bloom under WebGL only (the Canvas renderer has no FX pipeline). Its offsets are device pixels.
    // Phones get 2 blur steps instead of 4 (about half the full-screen passes), a touch stronger to keep the glow.
    if (this.renderer.type === Phaser.WEBGL) cam.postFX.addBloom(0xffffff, DPR, DPR, 1, PHONE ? 1.05 : 0.9, PHONE ? 2 : 4);
    cam.startFollow(this.ship.container, false, 0.2, 0.2);
    this.layout();
    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    // Auto-pause when the tab is hidden or the window loses focus (Task 20).
    const onHidden = () => {
      if (document.visibilityState === 'hidden') this.pause();
    };
    const onBlur = () => this.pause();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('blur', onBlur);
    this.events.once('shutdown', () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('blur', onBlur);
    });
    installDebug(this);
  }

  /** Registers a scene-event listener that is removed when the scene shuts down (restarts reuse the emitter). */
  listen(event: string, fn: (...args: any[]) => void): void {
    this.events.on(event, fn);
    this.events.once('shutdown', () => this.events.off(event, fn));
  }

  private layout(): void {
    const { w, h } = viewSize(this);
    this.baseZoom = Phaser.Math.Clamp(Math.min(w, h) / 720, 0.6, 1.2);
    this.applyZoom(this.baseZoom * this.zoomMul, true);
  }

  /** Sets the camera zoom (in CSS px; the camera carries DPR on top); the star layers are re-sized only when it has moved enough to matter. */
  private applyZoom(zoom: number, force = false): void {
    this.cameras.main.setZoom(zoom * DPR);
    if (!force && Math.abs(zoom - this.starZoom) <= 0.002) return;
    this.starZoom = zoom;
    const { w, h } = viewSize(this);
    // Unscrolled layers sit on the camera's zoom origin, its centre in device pixels; sized at TEX× and scaled back.
    for (const s of this.stars) s.setSize((w / zoom + 4) * TEX, (h / zoom + 4) * TEX).setPosition(this.scale.width / 2, this.scale.height / 2);
  }

  /** The view pulls back as the ship grows and while a Carrier is on the field (eased over ~1.5 s, real time). */
  private easeZoom(realMs: number): void {
    let extent = 0;
    for (const p of this.ship.grid.parts()) extent = Math.max(extent, Math.abs(p.x), Math.abs(p.y));
    const carrier = this.enemies.list.some(e => e.alive && e.kind === 'carrier');
    const target = shipZoomMul(extent, carrier);
    if (Math.abs(target - this.zoomMul) < 1e-4) return;
    this.zoomMul += (target - this.zoomMul) * (1 - Math.exp((-realMs / 1000) * 3));
    this.applyZoom(this.baseZoom * this.zoomMul);
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    const t0 = performance.now();
    const real = clampDt(delta);
    this.fx.update(real);
    this.sigs.update(real);
    const total = real * this.timeScale * this.fx.timeMul;
    const n = total > 0 ? Math.max(1, Math.ceil(total / STEP_MS)) : 0;
    for (let i = 0; i < n && !this.ended && !this.pendingForge; i++) this.step(total / n);
    if (this.pendingForge && !this.ended) this.openForge();
    this.easeZoom(real);
    const cam = this.cameras.main;
    this.stars[0].setTilePosition(cam.scrollX * 0.15 * TEX, cam.scrollY * 0.15 * TEX);
    this.stars[1].setTilePosition(cam.scrollX * 0.4 * TEX, cam.scrollY * 0.4 * TEX);
    // The score opens up after 3:00 (Task 21).
    Audio.setIntensity((this.timeMs - 180000) / 240000);
    this.updateMs = this.updateMs * 0.9 + (performance.now() - t0) * 0.1;
  }

  private step(dt: number): void {
    this.timeMs += dt;
    this.iframes = Math.max(0, this.iframes - dt);

    this.ship.update(dt, this.controls.steer());
    const events = this.director.update(dt);
    if (!this.directorPaused) for (const ev of events) this.enemies.spawnEvent(ev, this.director.hpMul());
    this.enemies.update(dt);
    // Signature effects first: they clear their overlay, which the weapon pass (Resonator) then draws into.
    this.sigFx.update(dt);
    this.weapons.update(dt);
    this.payloads.update(dt);
    this.projectiles.update(dt);
    this.pickups.update(dt);
    this.utility.update(dt);
    this.collideShip();
  }

  private collideShip(): void {
    const ship = this.ship;
    const cells = ship.hitCells();
    const reach = ship.boundRadius + MAX_ENEMY_RADIUS;
    for (const e of this.enemies.hash.query(ship.x, ship.y, reach)) {
      if (!e.alive || e.contactCd > 0) continue;
      for (const c of cells) {
        const r = c.r + e.radius;
        if ((e.x - c.x) ** 2 + (e.y - c.y) ** 2 > r * r) continue;
        const carrier = e.kind === 'carrier';
        e.contactCd = carrier ? CARRIER_CONTACT_CD_MS : CONTACT_CD_MS;
        this.hurt(e.contactDamage, c.partId, c.uid);
        this.utility.onContact(c.partId, c.uid, e);
        // Knock the attacker back so it doesn't sit inside the hull; a Carrier's charge ends on impact.
        const a = Math.atan2(e.y - c.y, e.x - c.x);
        const push = carrier ? CARRIER_KNOCKBACK : 18;
        e.x += Math.cos(a) * push;
        e.y += Math.sin(a) * push;
        if (carrier) this.enemies.endCharge(e);
        break;
      }
    }
    for (let i = this.enemies.bullets.length - 1; i >= 0; i--) {
      const b = this.enemies.bullets[i];
      if (b.reflected) {
        this.reflectedHits(b);
        continue;
      }
      if ((b.x - ship.x) ** 2 + (b.y - ship.y) ** 2 > reach * reach) continue;
      for (const c of cells) {
        if ((b.x - c.x) ** 2 + (b.y - c.y) ** 2 > (c.r + 4) ** 2) continue;
        if (c.partId === 'mirror') {
          // Mirror alone (design §10): enemy bullets bounce back at 1.5× speed and now hurt the swarm.
          b.vx *= -MIRROR_REFLECT;
          b.vy *= -MIRROR_REFLECT;
          b.reflected = true;
          b.img.setTint(0xffffff);
        } else if (this.utility.guardOf(c.partId, c.uid) !== null && this.sigFx.spike(this.utility.guardOf(c.partId, c.uid)!)) {
          // Porcupine: the bullet sticks in the plate as a spike instead of hurting.
          this.enemies.removeBullet(b);
        } else {
          this.hurt(b.damage, c.partId, c.uid);
          this.enemies.removeBullet(b);
        }
        break;
      }
    }
  }

  private reflectedHits(b: EnemyBullet): void {
    for (const e of this.enemies.hash.query(b.x, b.y, 6 + MAX_ENEMY_RADIUS)) {
      if (!e.alive || (e.x - b.x) ** 2 + (e.y - b.y) ** 2 > (e.radius + 5) ** 2) continue;
      this.enemies.damage(e, b.damage * REFLECT_DAMAGE_MUL, { mountUid: -1, partId: 'mirror', signatures: [] });
      this.enemies.removeBullet(b);
      return;
    }
  }

  /** Hull damage, with i-frames; a hit on a Bulwark Plate cell takes ×0.6 (less with a passive trait). */
  hurt(amount: number, partId: PartId, uid = -1): void {
    if (this.god || this.iframes > 0 || this.ended) return;
    const mul = this.utility.damageTaken(partId, uid);
    this.ship.hull = Math.max(0, this.ship.hull - amount * mul);
    this.iframes = IFRAMES_MS;
    this.fx.shake(6, 150);
    Audio.sfx('hurt');
    this.events.emit('hull-changed', this.ship.hull);
    if (this.ship.hull <= 0) this.endRun();
  }

  heal(amount: number): void {
    this.ship.hull = Math.min(MAX_HULL, this.ship.hull + amount);
    this.events.emit('hull-changed', this.ship.hull);
  }

  /** Archive MODULES tab: a part bolted on (or a Blueprint start) unlocks its card. Records the placed id, so a Mimic logs as Mimic. */
  private logModule(id: PartId): void {
    const next = recordModule(this.save, id);
    if (next === this.save) return;
    // The first square node this save ever welds: one line on what the square shape means.
    if (isNode(id) && !this.save.modules.some(isNode)) (this.scene.get('Hud') as HudScene | null)?.hud?.notice(COPY.nodeHint);
    this.save = next;
    writeSave(next, storage());
  }

  private onKill(e: Enemy, _src: DamageSrc): void {
    this.kills++;
    this.fx.burst(e.x, e.y, BASE_TINT[e.kind], 6 + Math.floor(Math.random() * 5));
    Audio.sfx('kill', { vol: 0.6 });
    this.utility.onKill(e);
    for (const d of this.pacer.onKill(e.kind, this.timeMs)) this.pickups.spawn(d, e.x, e.y);
  }

  /** Pauses the run behind the HUD's pause overlay. Ignored while the Forge is open or after the run ended. */
  pause(): void {
    if (this.ended || this.paused || !this.scene.isActive()) return;
    this.paused = true;
    this.controls.release();
    this.scene.pause();
    Audio.suspend();
    (this.scene.get('Hud') as HudScene | null)?.showPause();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.scene.resume();
    Audio.resume();
  }

  /** Leaves the run without recording it. */
  quit(): void {
    this.paused = false;
    Audio.resume();
    this.scene.stop('Hud');
    this.scene.start('Title');
  }

  /** Pauses the run and opens the Forge Uplink editor; the run resumes on Accept. */
  private openForge(): void {
    this.pendingForge = false;
    Audio.sfx('forge');
    const data: ForgeData = {
      grid: this.ship.grid,
      onAccept: g => {
        this.ship.setGrid(g);
        this.scene.setVisible(true, 'Hud');
        this.scene.resume();
      },
      touch: this.controls.isTouch,
      // The tutorial line shows on the first Forge of a fresh save (design §13).
      showTutorial: this.save.runs === 0 && this.forgesThisRun === 0,
      // Known-combo glow: only combos already in the Archive light up.
      discovered: [...this.save.discovered],
    };
    this.forgesThisRun++;
    this.scene.setVisible(false, 'Hud');
    this.scene.pause();
    this.scene.launch('Forge', data);
  }

  hudState(): HudState {
    return {
      hull: this.ship.hull, maxHull: MAX_HULL, timeMs: this.timeMs, kills: this.kills, archive: this.save.discovered.length,
      steered: this.controls.touched, stick: this.controls.stick,
    };
  }

  private endRun(): void {
    if (this.ended) return;
    this.ended = true;
    Audio.sfx('death');
    Audio.setIntensity(0);
    const result: RunResult = {
      timeMs: this.timeMs, kills: this.kills, parts: this.ship.grid.parts().filter(p => p.uid !== 0).length, ship: this.ship.grid.toJSON(),
      newThisRun: [...this.sigs.newThisRun], firedThisRun: [...this.sigs.firedThisRun], blueprints: [...this.sigs.blueprintsThisRun],
    };
    this.events.emit('run-ended', result);
    this.scene.stop('Hud');
    this.scene.start('End', result);
  }
}
