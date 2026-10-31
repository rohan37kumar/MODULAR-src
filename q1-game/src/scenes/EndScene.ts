import Phaser from 'phaser';
import { loadSave, recordRun, writeSave } from '../core/save';
import type { SaveData } from '../core/types';
import { Audio } from '../game/Audio';
import { COLOURS, FONT } from '../game/runtime';
import { downloadSnapshot, renderSnapshot, SNAPSHOT_H, SNAPSHOT_W } from '../game/snapshot';
import { button } from '../game/ui';
import { storage, type RunResult } from './GameScene';

const SNAP_KEY = 'run-snapshot';
/** Height kept under the snapshot for the buttons. */
const BUTTONS_H = 150;

/**
 * Run over (design §13): the Ship snapshot (the shareable neon image of the final ship with the
 * run's stats and combos), Run again as the big obvious action, then Save image and the Archive.
 */
export class EndScene extends Phaser.Scene {
  private result!: RunResult;
  private save!: SaveData;
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    super('End');
  }

  create(r: RunResult): void {
    this.save = loadSave(storage());
    if (!r.recorded) {
      this.save = recordRun(this.save, { timeMs: r.timeMs, kills: r.kills });
      writeSave(this.save, storage());
    }
    this.result = { ...r, recorded: true };
    this.canvas = renderSnapshot(r.ship, {
      timeMs: r.timeMs, kills: r.kills, salvage: r.salvage, newThisRun: r.newThisRun, firedThisRun: r.firedThisRun,
      archiveCount: this.save.discovered.length, blueprints: r.blueprints,
    });
    if (this.textures.exists(SNAP_KEY)) this.textures.remove(SNAP_KEY);
    this.textures.addCanvas(SNAP_KEY, this.canvas);

    this.build();
    const onResize = () => this.build();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    const kb = this.input.keyboard;
    const again = () => this.again();
    kb?.on('keydown-ENTER', again);
    this.events.once('shutdown', () => kb?.off('keydown-ENTER', again));
  }

  private build(): void {
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    this.add.tileSprite(w / 2, h / 2, w, h, 'stars-far').setAlpha(0.5);
    const scale = Math.min((w - 24) / SNAPSHOT_W, (h - BUTTONS_H - 16) / SNAPSHOT_H);
    const imgH = SNAPSHOT_H * scale;
    this.add.image(w / 2, 12 + imgH / 2, SNAP_KEY).setScale(scale);

    const y = 12 + imgH + 46;
    button(this, w / 2, y, 'RUN AGAIN', () => this.again(), { size: 30, primary: true });
    const row = y + 62, gap = Math.min(170, w / 3);
    button(this, w / 2 - gap, row, 'Save image', () => this.saveImage(), { size: 16 });
    button(this, w / 2, row, 'Xeno Archive', () => this.scene.start('Archive', { back: 'End', backData: this.result }), { size: 16, colour: COLOURS.violet });
    button(this, w / 2 + gap, row, 'Title', () => this.scene.start('Title'), { size: 16, colour: 0x5f8f99 });
    this.add.text(w / 2, h - 6, 'Enter: run again', { fontFamily: FONT, fontSize: '11px', color: '#3d5157' }).setOrigin(0.5, 1);
  }

  /** Straight from the click handler: phones only allow the share sheet inside a user gesture. */
  private saveImage(): void {
    Audio.sfx('ui');
    if (this.canvas) void downloadSnapshot(this.canvas);
  }

  private again(): void {
    this.scene.start('Game', { blueprint: this.save.lastBlueprint });
  }
}
