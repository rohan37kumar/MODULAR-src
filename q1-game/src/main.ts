import Phaser from 'phaser';
import { Audio } from './game/Audio';
import { Input } from './game/Input';
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

new Phaser.Game({
  // ?renderer=canvas forces the Canvas renderer (checks the no-WebGL path: no bloom/glow).
  type: params.get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
  // ?timer=1 drives the loop with setTimeout: for automated testing in a window the browser throttles rAF in.
  fps: params.get('timer') === '1' ? { forceSetTimeOut: true, target: 60 } : undefined,
  backgroundColor: '#000',
  scale: { mode: Phaser.Scale.RESIZE, parent: 'game', width: '100%', height: '100%' },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, ArchiveScene, GameScene, HudScene, ForgeScene, EndScene],
});

// Browsers only allow audio after a user gesture: unlock on the first one.
const unlock = () => Audio.unlock();
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });
