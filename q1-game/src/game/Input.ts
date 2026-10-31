import Phaser from 'phaser';

type Keys = Record<'w' | 'a' | 's' | 'd' | 'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

/** Thumb travel of the virtual joystick, in screen px. */
export const STICK_RADIUS = 60;

/** Screen-space joystick state, drawn by the HUD. */
export interface Stick {
  active: boolean;
  baseX: number;
  baseY: number;
  dx: number;
  dy: number;
}

/**
 * Keyboard and a floating virtual joystick → a steer vector of length ≤ 1.
 * The joystick appears where a touch starts (left 60% of the screen, or anywhere in portrait)
 * and follows only that pointer, so a second finger can tap the HUD.
 */
export class Input {
  /** Set by main.ts for ?touch=1 (tests the phone UI on desktop). */
  static forceTouch = false;
  readonly isTouch: boolean;
  /** Set when any steering input has happened (used to fade the control hint). */
  touched = false;
  readonly stick: Stick = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0 };
  private readonly keys: Keys | null;
  private pointerId = -1;

  constructor(scene: Phaser.Scene) {
    this.isTouch = Input.forceTouch || (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true);
    const kb = scene.input.keyboard;
    this.keys = kb
      ? (kb.addKeys({
        w: 'W', a: 'A', s: 'S', d: 'D', up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      }) as Keys)
      : null;
    scene.input.addPointer(2);
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(scene, p));
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    scene.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
  }

  private down(scene: Phaser.Scene, p: Phaser.Input.Pointer): void {
    if (this.stick.active) return;
    const { width: w, height: h } = scene.scale;
    if (h <= w && p.x > w * 0.6) return;
    this.pointerId = p.id;
    Object.assign(this.stick, { active: true, baseX: p.x, baseY: p.y, dx: 0, dy: 0 });
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.stick.active || p.id !== this.pointerId) return;
    let dx = p.x - this.stick.baseX, dy = p.y - this.stick.baseY;
    const d = Math.hypot(dx, dy);
    if (d > STICK_RADIUS) {
      dx *= STICK_RADIUS / d;
      dy *= STICK_RADIUS / d;
    }
    this.stick.dx = dx;
    this.stick.dy = dy;
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    this.pointerId = -1;
    Object.assign(this.stick, { active: false, dx: 0, dy: 0 });
  }

  /** Drops any held stick (pause, scene change). */
  release(): void {
    this.pointerId = -1;
    Object.assign(this.stick, { active: false, dx: 0, dy: 0 });
  }

  steer(): { x: number; y: number } {
    if (this.stick.active) {
      const x = this.stick.dx / STICK_RADIUS, y = this.stick.dy / STICK_RADIUS;
      // A small dead zone so resting a thumb doesn't drift the ship.
      if (Math.hypot(x, y) < 0.12) return { x: 0, y: 0 };
      this.touched = true;
      return { x, y };
    }
    let x = 0, y = 0;
    const k = this.keys;
    if (k) {
      if (k.a.isDown || k.left.isDown) x -= 1;
      if (k.d.isDown || k.right.isDown) x += 1;
      if (k.w.isDown || k.up.isDown) y -= 1;
      if (k.s.isDown || k.down.isDown) y += 1;
    }
    const m = Math.hypot(x, y);
    if (m === 0) return { x: 0, y: 0 };
    this.touched = true;
    return { x: x / m, y: y / m };
  }
}
