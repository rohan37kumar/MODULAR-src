import Phaser from 'phaser';
import { loadSave, writeSave } from '../core/save';
import type { PartId, SaveData } from '../core/types';
import { COPY } from '../data/copy';
import { PARTS } from '../data/parts';
import { SIGNATURES } from '../data/signatures';
import { Audio } from '../game/Audio';
import { fmtTime } from '../game/Hud';
import { COLOURS, FONT } from '../game/runtime';
import { partTexture } from '../game/Ship';
import { button, muteToggle } from '../game/ui';
import { starTile, uiCamera, viewSize } from '../game/view';
import { storage } from './GameScene';

/** Title: Launch, the Xeno Archive, Blueprint starts and the best run. First launch of a save shows the intro card. */
export class TitleScene extends Phaser.Scene {
  private save!: SaveData;
  private choice: PartId | null = null;
  private introOpen = false;

  constructor() {
    super('Title');
  }

  create(): void {
    uiCamera(this);
    this.save = loadSave(storage());
    // The score starts here (it begins on the first click or key: browsers block audio until then).
    Audio.setMuted(this.save.muted);
    Audio.setIntensity(0);
    Audio.music(true);
    const last = this.save.lastBlueprint ?? null;
    this.choice = last && this.save.blueprints.includes(last) ? last : null;
    this.introOpen = false;
    this.build();
    const onResize = () => this.build();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    const kb = this.input.keyboard;
    const go = () => (this.introOpen ? this.startRun() : this.launch());
    kb?.on('keydown-ENTER', go);
    kb?.on('keydown-SPACE', go);
    this.events.once('shutdown', () => {
      kb?.off('keydown-ENTER', go);
      kb?.off('keydown-SPACE', go);
    });
  }

  private build(): void {
    this.children.removeAll(true);
    const { w, h } = viewSize(this);
    starTile(this, w / 2, h / 2, w, h, 'stars-far').setAlpha(0.6);
    starTile(this, w / 2, h / 2, w, h, 'stars-near').setAlpha(0.8);
    const cx = w / 2;
    let y = h * 0.2;

    const titleSize = Math.round(Phaser.Math.Clamp(w / 8, 44, 104));
    this.add.text(cx, y, 'MODULAR', { fontFamily: FONT, fontSize: `${titleSize}px`, color: '#00e5ff', fontStyle: 'bold' })
      .setOrigin(0.5).setLetterSpacing(Math.round(titleSize / 6)).setShadow(0, 0, '#00e5ff', 24, true, true);
    y += titleSize * 0.85;
    this.add.text(cx, y, COPY.tagline, {
      fontFamily: FONT, fontSize: '15px', color: '#9ef0ff', align: 'center', wordWrap: { width: Math.min(560, w - 32) },
    }).setOrigin(0.5, 0);
    y += 64;

    const s = this.save;
    this.add.text(cx, y, `XENO ARCHIVE ${s.discovered.length}/${SIGNATURES.length}`, { fontFamily: FONT, fontSize: '18px', color: '#b388ff' }).setOrigin(0.5);
    y += 26;
    if (s.bestRun) {
      this.add.text(cx, y, `BEST RUN ${fmtTime(s.bestRun.timeMs)} · ${s.bestRun.kills} KILLS`, { fontFamily: FONT, fontSize: '14px', color: '#5f8f99' }).setOrigin(0.5);
    }
    y += 40;

    if (s.blueprints.length) y = this.blueprintRow(cx, y, w);

    button(this, cx, Math.max(y + 30, h * 0.62), 'LAUNCH', () => this.launch(), { size: 30, primary: true });
    button(this, cx, Math.max(y + 100, h * 0.62 + 70), 'Xeno Archive', () => this.scene.start('Archive', { back: 'Title' }), { size: 18, colour: COLOURS.violet });    muteToggle(this, w - 70, h - 28);
    // A resize rebuilds the screen; put the intro card back if it was open.
    if (this.introOpen) {
      this.introOpen = false;
      this.showIntro();
    }
  }

  /** "Blueprint start": unlocked key parts plus None; the choice is remembered in the save. */
  private blueprintRow(cx: number, y: number, w: number): number {
    this.add.text(cx, y, 'BLUEPRINT START', { fontFamily: FONT, fontSize: '13px', color: '#5f8f99' }).setOrigin(0.5).setLetterSpacing(2);
    const size = 40, gap = 12;
    y += 16 + size / 2;
    const opts: (PartId | null)[] = [null, ...this.save.blueprints];
    const perRow = Math.max(1, Math.floor((w - 32 + gap) / (size + gap)));
    const ring = this.add.graphics();
    const label = this.add.text(cx, 0, '', { fontFamily: FONT, fontSize: '13px', color: '#d8f6ff' }).setOrigin(0.5, 0);
    const spots: { id: PartId | null; x: number; y: number }[] = [];
    opts.forEach((id, i) => {
      const row = Math.floor(i / perRow), col = i % perRow;
      const inRow = Math.min(perRow, opts.length - row * perRow);
      const x = cx + (col - (inRow - 1) / 2) * (size + gap), yy = y + row * (size + gap);
      spots.push({ id, x, y: yy });
      const hit = id
        ? this.add.image(x, yy, partTexture(id)).setDisplaySize(size, size)
        : this.add.text(x, yy, 'None', { fontFamily: FONT, fontSize: '13px', color: '#9ef0ff' }).setOrigin(0.5);
      hit.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.choice = id;
        draw();
      });
    });
    const rows = Math.ceil(opts.length / perRow);
    label.setY(y + size / 2 + 10 + (rows - 1) * (size + gap));
    const draw = () => {
      ring.clear();
      const s = spots.find(p => p.id === this.choice) ?? spots[0];
      ring.lineStyle(2, 0x00e5ff, 1).strokeRoundedRect(s.x - size / 2 - 4, s.y - size / 2 - 4, size + 8, size + 8, 6);
      label.setText(this.choice ? `Start with: ${PARTS[this.choice].name}` : 'Start with the bare cockpit');
    };
    draw();
    return label.y + 30;
  }

  private launch(): void {
    if (this.save.lastBlueprint !== this.choice) {
      this.save = { ...this.save, lastBlueprint: this.choice };
      writeSave(this.save, storage());
    }
    if (this.save.runs === 0) this.showIntro();
    else this.startRun();
  }

  /** The one-time intro card before the first flight. */
  private showIntro(): void {
    if (this.introOpen) return;
    this.introOpen = true;
    const { w, h } = viewSize(this);
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.93).setInteractive();
    const text = this.add.text(w / 2, h * 0.42, COPY.intro, {
      fontFamily: FONT, fontSize: '22px', color: '#d8f6ff', align: 'center', wordWrap: { width: Math.min(560, w - 48) }, lineSpacing: 8,
    }).setOrigin(0.5);
    const note = this.add.text(w / 2, h * 0.42 + text.height / 2 + 24, COPY.introNote, {
      fontFamily: FONT, fontSize: '15px', color: '#b388ff', align: 'center', wordWrap: { width: Math.min(480, w - 56) }, lineSpacing: 5,
    }).setOrigin(0.5, 0);
    const go = button(this, w / 2, note.y + note.height + 48, 'FLY', () => this.startRun(), { size: 26, primary: true });
    for (const o of [dim, text, note, go]) o.setAlpha(0);
    this.tweens.add({ targets: [dim, text, note, go], alpha: 1, duration: 300 });
  }

  private startRun(): void {
    this.scene.start('Game', { blueprint: this.choice });
  }
}
