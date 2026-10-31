import Phaser from 'phaser';
import { Audio } from './game/Audio';
import { Input } from './game/Input';
import { DPR, installHiDpiText } from './game/view';
import { ArchiveScene } from './scenes/ArchiveScene';
import { BootScene } from './scenes/BootScene';
import { EndScene } from './scenes/EndScene';
import { ForgeScene } from './scenes/ForgeScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { TitleScene } from './scenes/TitleScene';

const params = new URLSearchParams(location.search);
// ?touch=1 forces the phone UI (joystick wording, touch Forge) on desktop, for testing.
if (params.get('touch') === '1') Input.forceTouch = true;
// ?nostorage=1 makes localStorage throw (Safari private mode, blocked site data): the game must still play.
if (params.get('nostorage') === '1') {
  const deny = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  Storage.prototype.getItem = deny;
  Storage.prototype.setItem = deny;
}

installHiDpiText();
// The canvas is sized in device pixels and shown at CSS size (zoom 1/DPR), so phones render sharp (see view.ts).
const parent = document.getElementById('game')!;
const deviceSize = () => ({
  w: Math.max(1, Math.round(parent.clientWidth * DPR)),
  h: Math.max(1, Math.round(parent.clientHeight * DPR)),
});
const size0 = deviceSize();

const game = new Phaser.Game({
  // ?renderer=canvas forces the Canvas renderer (checks the no-WebGL path: no bloom/glow).
  type: params.get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
  // ?timer=1 drives the loop with setTimeout: for automated testing in a window the browser throttles rAF in.
  fps: params.get('timer') === '1' ? { forceSetTimeOut: true, target: 60 } : undefined,
  backgroundColor: '#000',
  scale: { mode: Phaser.Scale.NONE, parent: 'game', width: size0.w, height: size0.h, zoom: 1 / DPR },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, ArchiveScene, GameScene, HudScene, ForgeScene, EndScene],
});

// Follow the window (rotation, browser bars); scenes re-lay out on the Scale Manager's 'resize' event.
window.addEventListener('resize', () => {
  const s = deviceSize();
  if (s.w !== game.scale.width || s.h !== game.scale.height) game.scale.resize(s.w, s.h);
});

// Browsers only allow audio after a user gesture: unlock on the first one.
const unlock = () => Audio.unlock();
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });
