import Phaser from 'phaser';

/**
 * Hi-DPI rendering. The canvas is sized in device pixels (CSS size × DPR) and every camera zooms by DPR,
 * so game and UI code keeps working in CSS pixels while phones get native sharpness.
 * Phones (a coarse pointer, or ?touch=1) are capped at 2× and get the lighter bloom: native 3× plus full bloom
 * stuttered in phone playtests (2026-10-31). ?dpr=N overrides the ratio for testing; capped at 3.
 */
const params = new URLSearchParams(location.search);
export const PHONE = params.get('touch') === '1' || window.matchMedia?.('(pointer: coarse)').matches === true;
const param = Number(params.get('dpr'));
export const DPR = Math.min(3, Math.max(1, param > 0 ? param : Math.min(PHONE ? 2 : 3, window.devicePixelRatio || 1)));

/** Pixel density of the generated textures (whole numbers; 1 under the Canvas renderer). Set by BootScene. */
export let TEX = 1;
export function setTextureScale(webgl: boolean): void {
  TEX = webgl ? Math.ceil(DPR) : 1;
}

/** The view size in CSS pixels (the game size is in device pixels). */
export function viewSize(scene: Phaser.Scene): { w: number; h: number } {
  return { w: scene.scale.width / DPR, h: scene.scale.height / DPR };
}

/** A screen-space UI camera: 1 world unit = 1 CSS px, with (0, 0) at the top-left. */
export function uiCamera(scene: Phaser.Scene): Phaser.Cameras.Scene2D.Camera {
  return scene.cameras.main.setOrigin(0, 0).setZoom(DPR);
}

/** A pointer's screen position in CSS pixels. */
export function pointerXY(p: Phaser.Input.Pointer): { x: number; y: number } {
  return { x: p.x / DPR, y: p.y / DPR };
}

/** A tiling starfield of w × h CSS px, its texture drawn 1:1 in device pixels (tile offsets are × TEX). */
export function starTile(scene: Phaser.Scene, x: number, y: number, w: number, h: number, key: string): Phaser.GameObjects.TileSprite {
  return scene.add.tileSprite(x, y, w * TEX, h * TEX, key).setScale(1 / TEX);
}

/** Text renders at DPR unless a style sets its own resolution; canvas shadows ignore the context scale, so scale them too. */
export function installHiDpiText(): void {
  const proto = Phaser.GameObjects.TextStyle.prototype as any;
  const setStyle = proto.setStyle;
  proto.setStyle = function (this: any, ...args: unknown[]) {
    const out = setStyle.apply(this, args);
    if (!this.resolution) this.resolution = DPR;
    return out;
  };
  const syncShadow = proto.syncShadow;
  proto.syncShadow = function (this: any, context: CanvasRenderingContext2D, enabled: boolean) {
    syncShadow.call(this, context, enabled);
    if (enabled) {
      const r = this.resolution || 1;
      context.shadowBlur = this.shadowBlur * r;
      context.shadowOffsetX = this.shadowOffsetX * r;
      context.shadowOffsetY = this.shadowOffsetY * r;
    }
  };
}
