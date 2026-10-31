import Phaser from 'phaser';
import { COPY } from '../data/copy';
import { Hud } from '../game/Hud';
import { FONT } from '../game/runtime';
import { button, muteToggle } from '../game/ui';
import { uiCamera, viewSize } from '../game/view';
import type { GameScene } from './GameScene';

/** Touch target of the pause button (px). */
const PAUSE_SIZE = 44;

/**
 * Runs above GameScene so HUD elements are unaffected by the world camera's zoom.
 * Also owns the pause button, the pause overlay and the pause keys (GameScene is paused then).
 */
export class HudScene extends Phaser.Scene {
  hud!: Hud;
  private pauseBtn!: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Hud');
  }

  private get game_(): GameScene {
    return this.scene.get('Game') as GameScene;
  }

  create(): void {
    uiCamera(this);
    this.overlay = null;
    this.hud = new Hud(this);
    // First run of a save: one control hint, faded after 5 s or on the first steer (design §6).
    const game = this.game_;
    if (game?.save?.runs === 0) this.hud.hint(game.controls.isTouch ? COPY.hint.touch : COPY.hint.desktop);

    const g = this.add.graphics();
    g.lineStyle(2, 0x00e5ff, 0.8).strokeRoundedRect(-PAUSE_SIZE / 2, -PAUSE_SIZE / 2, PAUSE_SIZE, PAUSE_SIZE, 6);
    g.fillStyle(0x00e5ff, 0.9).fillRect(-8, -10, 5, 20).fillRect(3, -10, 5, 20);
    this.pauseBtn = this.add.container(0, 0, [g]).setSize(PAUSE_SIZE, PAUSE_SIZE)
      .setInteractive({ useHandCursor: true }).on('pointerup', () => this.game_.pause());
    this.layout();

    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    const kb = this.input.keyboard;
    const toggle = () => (this.overlay ? this.resumeGame() : this.game_.pause());
    kb?.on('keydown-ESC', toggle);
    kb?.on('keydown-P', toggle);
    this.events.once('shutdown', () => {
      kb?.off('keydown-ESC', toggle);
      kb?.off('keydown-P', toggle);
    });
  }

  private layout(): void {
    this.hud.layout();
    this.pauseBtn.setPosition(viewSize(this).w - PAUSE_SIZE / 2 - 10, PAUSE_SIZE / 2 + 10);
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
      this.showPause();
    }
  }

  /** Called by GameScene.pause(). */
  showPause(): void {
    if (this.overlay) return;
    const { w, h } = viewSize(this);
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setInteractive();
    const title = this.add.text(w / 2, h * 0.36, 'PAUSED', { fontFamily: FONT, fontSize: '36px', color: '#00e5ff', fontStyle: 'bold' })
      .setOrigin(0.5).setLetterSpacing(6).setShadow(0, 0, '#00e5ff', 14, true, true);
    const resume = button(this, w / 2, h * 0.5, 'RESUME', () => this.resumeGame(), { size: 26, primary: true });
    const quit = button(this, w / 2, h * 0.5 + 70, 'Quit to title', () => this.game_.quit(), { size: 16, colour: 0x5f8f99 });
    const mute = muteToggle(this, w / 2, h * 0.5 + 120);
    this.overlay = this.add.container(0, 0, [dim, title, resume, quit, mute]).setDepth(100);
    this.pauseBtn.setVisible(false);
  }

  private resumeGame(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.pauseBtn.setVisible(true);
    this.game_.resume();
  }

  update(): void {
    const game = this.game_;
    if (game?.ship) this.hud.update(game.hudState());
  }
}
