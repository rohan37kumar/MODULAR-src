import Phaser from 'phaser';
import { SIGNATURES } from '../data/signatures';
import { STICK_RADIUS, type Stick } from './Input';
import { COLOURS, FONT } from './runtime';

export interface HudState {
  hull: number;
  maxHull: number;
  timeMs: number;
  kills: number;
  archive: number;
  /** The player has steered at least once (fades the control hint). */
  steered: boolean;
  stick: Stick;
}

export const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
const BANNER_HOLD_MS = 2600;
const HINT_MS = 5000;
/** How long a one-off notice (the first node weld) holds before fading. */
const NOTICE_MS = 4500;

/** Screen-space HUD, drawn in its own unzoomed scene (HudScene). */
export class Hud {
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly time: Phaser.GameObjects.Text;
  private readonly kills: Phaser.GameObjects.Text;
  private readonly archive: Phaser.GameObjects.Text;
  private lastHull = -1;
  private lastArchive = -1;
  private bannerBox: Phaser.GameObjects.Container | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private readonly stickG: Phaser.GameObjects.Graphics;
  private stickAlpha = 0;
  private lastStick = { x: 0, y: 0 };

  constructor(private readonly scene: Phaser.Scene) {
    const style = { fontFamily: FONT, fontSize: '16px', color: '#00e5ff' };
    this.bar = scene.add.graphics();
    this.time = scene.add.text(0, 12, '0:00', { ...style, fontSize: '20px' }).setOrigin(0.5, 0);
    this.kills = scene.add.text(16, 36, '', style);
    this.archive = scene.add.text(16, 58, '', { ...style, color: '#b388ff' });
    this.stickG = scene.add.graphics().setDepth(40);
    this.layout();
  }

  layout(): void {
    this.time.setX(this.scene.scale.width / 2);
    this.lastHull = -1;
    this.bannerBox?.setX(this.scene.scale.width / 2);
    this.hintText?.setPosition(this.scene.scale.width / 2, this.scene.scale.height * 0.72);
  }

  update(s: HudState): void {
    if (s.hull !== this.lastHull) {
      this.lastHull = s.hull;
      const w = Math.min(220, this.scene.scale.width * 0.34);
      const f = Math.max(0, s.hull / s.maxHull);
      this.bar.clear();
      this.bar.lineStyle(2, COLOURS.player, 0.9).strokeRect(16, 14, w, 14);
      this.bar.fillStyle(f > 0.3 ? COLOURS.player : COLOURS.hurt, 0.85).fillRect(18, 16, (w - 4) * f, 10);
    }
    if (this.hintText && (s.steered || s.timeMs > HINT_MS)) {
      const t = this.hintText;
      this.hintText = null;
      this.scene.tweens.add({ targets: t, alpha: 0, duration: 600, onComplete: () => t.destroy() });
    }
    this.drawStick(s.stick);
    this.time.setText(fmtTime(s.timeMs));
    this.kills.setText(`KILLS ${s.kills}`);
    if (s.archive !== this.lastArchive) {
      // Pulse the counter when an entry is logged (not on the first draw).
      if (this.lastArchive >= 0) {
        this.archive.setColor('#ffffff');
        this.scene.tweens.add({
          targets: this.archive, scale: { from: 1.35, to: 1 }, duration: 600, ease: 'Back.easeOut',
          onComplete: () => this.archive.setColor('#b388ff'),
        });
      }
      this.lastArchive = s.archive;
      this.archive.setText(`XENO ARCHIVE ${s.archive}/${SIGNATURES.length}`);
    }
  }

  /** The floating joystick: fades in where the thumb lands, fades out on release. */
  private drawStick(st: Stick): void {
    this.stickAlpha = Phaser.Math.Clamp(this.stickAlpha + (st.active ? 0.2 : -0.1), 0, 1);
    if (st.active) this.lastStick = { x: st.baseX, y: st.baseY };
    const g = this.stickG;
    g.clear();
    if (this.stickAlpha <= 0) return;
    const { x, y } = this.lastStick, a = this.stickAlpha;
    g.lineStyle(2, COLOURS.player, 0.5 * a).strokeCircle(x, y, STICK_RADIUS);
    g.fillStyle(COLOURS.player, 0.08 * a).fillCircle(x, y, STICK_RADIUS);
    g.fillStyle(COLOURS.player, 0.55 * a).fillCircle(x + st.dx, y + st.dy, 22);
  }

  /** The first-run control hint, under the ship. */
  hint(text: string): void {
    const { width: w, height: h } = this.scene.scale;
    this.hintText = this.scene.add.text(w / 2, h * 0.72, text, {
      fontFamily: FONT, fontSize: '18px', color: '#d8f6ff', align: 'center', wordWrap: { width: Math.min(560, w - 32) },
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 8, true, true);
  }

  /** A one-off teaching line (the first node weld), below the control hint's spot: holds for `ms`, then fades. Steering doesn't dismiss it. */
  notice(text: string, ms = NOTICE_MS): void {
    const { width: w, height: h } = this.scene.scale;
    const t = this.scene.add.text(w / 2, h * 0.8, text, {
      fontFamily: FONT, fontSize: '17px', color: '#d8f6ff', align: 'center', wordWrap: { width: Math.min(520, w - 32) },
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 8, true, true);
    this.scene.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 600, onComplete: () => t.destroy() });
  }

  /** The discovery banner: header, signature name and the analysis AI's quip. Replaces any banner showing. */
  banner(title: string, sub: string, colour: number): void {
    this.bannerBox?.destroy();
    const { width: w, height: h } = this.scene.scale;
    const wrap = Math.min(560, w - 32);
    const head = this.scene.add.text(0, 0, 'XENO ARCHIVE · NEW ENTRY', { fontFamily: FONT, fontSize: '13px', color: '#b388ff' })
      .setOrigin(0.5, 0).setLetterSpacing(3);
    const name = this.scene.add.text(0, 20, title.toUpperCase(), {
      fontFamily: FONT, fontSize: w < 480 ? '26px' : '34px', color: hex(colour), fontStyle: 'bold',
    }).setOrigin(0.5, 0).setLetterSpacing(4).setShadow(0, 0, hex(colour), 14, true, true);
    const quip = this.scene.add.text(0, name.y + name.height + 8, sub, {
      fontFamily: FONT, fontSize: '15px', color: '#d8f6ff', align: 'center', wordWrap: { width: wrap },
    }).setOrigin(0.5, 0);
    const bottom = quip.y + quip.height;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.55).fillRect(-wrap / 2 - 16, -12, wrap + 32, bottom + 24);
    bg.lineStyle(1, colour, 0.8).lineBetween(-wrap / 2 - 16, -12, wrap / 2 + 16, -12).lineBetween(-wrap / 2 - 16, bottom + 12, wrap / 2 + 16, bottom + 12);
    const box = this.scene.add.container(w / 2, Math.round(h * 0.16), [bg, head, name, quip]).setDepth(50).setAlpha(0).setScale(0.92);
    this.bannerBox = box;
    // One tween (in, hold, back out): two tweens on the same container's alpha left it unrendered in Phaser 3.90.
    this.scene.tweens.add({
      targets: box, alpha: 1, scale: 1, duration: 260, ease: 'Quad.easeOut', hold: BANNER_HOLD_MS, yoyo: true,
      onComplete: () => {
        box.destroy();
        if (this.bannerBox === box) this.bannerBox = null;
      },
    });
  }

  /** A one-line notice under the banner area (e.g. "Blueprint unlocked: Mirror"). */
  toast(text: string, colour: number): void {
    const { width: w, height: h } = this.scene.scale;
    const t = this.scene.add.text(w / 2, Math.round(h * 0.16) - 34, text, {
      fontFamily: FONT, fontSize: '15px', color: hex(colour),
    }).setOrigin(0.5, 0.5).setDepth(51).setAlpha(0).setShadow(0, 0, hex(colour), 8, true, true);
    this.scene.tweens.add({ targets: t, alpha: 1, duration: 200, delay: 500 });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 3400, duration: 500, onComplete: () => t.destroy() });
  }
}
