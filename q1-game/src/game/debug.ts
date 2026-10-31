import type Phaser from 'phaser';
import { CORNERS, ShipGrid } from '../core/grid';
import { isNode } from '../data/parts';
import { addCell, DIRS } from '../core/math';
import type { Cell, Dir, EnemyKind, PartId, ShipJSON, SignatureId } from '../core/types';
import { SIG_BY_ID } from '../data/signatures';
import { Audio } from './Audio';
import type { GameScene } from '../scenes/GameScene';

export const isDebug = () => new URLSearchParams(location.search).get('debug') === '1';

export interface DebugApi {
  state(): { scene: string; hull: number; timeMs: number; kills: number; parts: number; enemies: number; projectiles: number; fps: number; discovered: SignatureId[]; ship: { x: number; y: number; heading: number }; updateMs: number; renderMs: number; salvage: number; kinds: Record<string, number>; bullets: number; counts: Record<string, number>; status: Record<string, number>; floating: { type: string; part: PartId | null; x: number; y: number }[] };
  givePart(id: PartId, cell?: Cell, facing?: Dir): boolean;
  loadShip(j: ShipJSON): void;
  loadCombo(id: SignatureId): void;
  spawn(kind: EnemyKind, n: number): void;
  grantForge(): void;
  god(on: boolean): void;
  timeScale(x: number): void;
  teleport(x: number, y: number): void;
  /** Removes every enemy and enemy bullet; with `paused`, the director stops spawning. */
  clear(paused?: boolean): void;
  /** Enemies within r of the ship: count and their centroid (for scripted playtests). */
  threat(r: number): { n: number; x: number; y: number };
  nearestEnemy(r: number): { x: number; y: number; d: number } | null;
  drop(type: 'part' | 'forge' | 'repair', part?: PartId, dx?: number, dy?: number): void;
}

declare global {
  interface Window { __modular?: DebugApi; __game?: Phaser.Game; __audio?: typeof Audio }
}

/** Sandbox hooks on window.__modular — installed only with ?debug=1. */
export function installDebug(scene: GameScene): void {
  if (!isDebug()) return;
  let renderMs = 0, r0 = 0;
  const counts: Record<string, number> = {};
  for (const ev of ['payload-burst', 'scrap-slug', 'orbit-release', 'part-attached', 'forge-picked', 'repair-picked', 'carrier-killed', 'carrier-phase', 'signature-fired', 'signature-discovered']) {
    scene.listen(ev, () => { counts[ev] = (counts[ev] ?? 0) + 1; });
  }
  scene.game.events.on('prerender', () => { r0 = performance.now(); });
  scene.game.events.on('postrender', () => { renderMs = renderMs * 0.9 + (performance.now() - r0) * 0.1; });
  const active = () => scene.game.scene.getScenes(true).map(s => s.scene.key).filter(k => k !== 'Hud').join(',');
  window.__game = scene.game;
  window.__audio = Audio;
  window.__modular = {
    state: () => ({
      scene: active(),
      hull: Math.round(scene.ship.hull * 10) / 10,
      timeMs: Math.round(scene.timeMs),
      kills: scene.kills,
      parts: scene.ship.grid.count(),
      enemies: scene.enemies.count,
      projectiles: scene.projectiles.count,
      fps: Math.round(scene.game.loop.actualFps),
      discovered: [...scene.save.discovered],
      salvage: scene.salvage,
      kinds: scene.enemies.list.reduce((o, e) => ({ ...o, [e.kind]: (o[e.kind] ?? 0) + 1 }), {} as Record<string, number>),
      bullets: scene.enemies.bullets.length,
      counts: { ...counts },
      status: (['charged', 'slow', 'frozen', 'burn'] as const).reduce((o, k) => ({ ...o, [k]: scene.enemies.list.filter(e => e.status[k] > 0).length }), {} as Record<string, number>),
      floating: scene.pickups.floating,
      updateMs: Math.round(scene.updateMs * 100) / 100,
      renderMs: Math.round(renderMs * 100) / 100,
      ship: { x: Math.round(scene.ship.x), y: Math.round(scene.ship.y), heading: Math.round((scene.ship.heading * 180) / Math.PI) },
    }),
    givePart: (id, cell, facing = 0) => {
      const g = scene.ship.grid.clone();
      if (cell) {
        if (!g.place(id, cell, facing)) return false;
      } else {
        // First free cell next to the ship, scanning parts in uid order.
        const spot = g.parts().flatMap(p => isNode(id)
          ? CORNERS.map(o => ({ c: { x: p.x + o.x, y: p.y + o.y }, d: 0 as Dir }))
          : DIRS.map(d => ({ c: addCell(p, d), d })))
          .find(({ c }) => ShipGrid.fits(id, c) && !g.get(c.x, c.y));
        if (!spot || !g.place(id, spot.c, spot.d)) return false;
      }
      scene.ship.setGrid(g);
      return true;
    },
    loadShip: j => scene.ship.setGrid(ShipGrid.fromJSON(j)),
    loadCombo: id => scene.ship.setGrid(ShipGrid.fromJSON(SIG_BY_ID[id].diagram)),
    spawn: (kind, n) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = 280 + Math.random() * 160;
        scene.enemies.spawn(kind, scene.ship.x + Math.cos(a) * r, scene.ship.y + Math.sin(a) * r, scene.director.hpMul());
      }
    },
    grantForge: () => scene.events.emit('forge-picked'),
    god: on => { scene.god = on; },
    drop: (type, part = 'pulse', dx = 0, dy = -120) => {
      const d = type === 'part' ? { type, part } as const : { type } as const;
      scene.pickups.spawn(d, scene.ship.x + dx, scene.ship.y + dy);
    },
    threat: r => {
      const near = scene.enemies.inRadius(scene.ship.x, scene.ship.y, r);
      const n = near.length || 1;
      return { n: near.length, x: near.reduce((s, e) => s + e.x, 0) / n, y: near.reduce((s, e) => s + e.y, 0) / n };
    },
    nearestEnemy: r => {
      const e = scene.enemies.nearest(scene.ship.x, scene.ship.y, r);
      return e ? { x: e.x, y: e.y, d: Math.hypot(e.x - scene.ship.x, e.y - scene.ship.y) } : null;
    },
    clear: paused => {
      for (const e of [...scene.enemies.list]) scene.enemies.remove(e);
      for (const b of [...scene.enemies.bullets]) scene.enemies.removeBullet(b);
      if (paused !== undefined) scene.directorPaused = paused;
    },
    teleport: (x, y) => { scene.ship.x = x; scene.ship.y = y; },
    timeScale: x => { scene.timeScale = Math.max(0.05, Math.min(8, x)); },
  };
}
