import Phaser from 'phaser';
import { loadSave, writeSave } from '../core/save';
import type { PartId, SaveData, ShipJSON } from '../core/types';
import { storage } from '../scenes/GameScene';
import { Audio } from './Audio';
import { FONT } from './runtime';
import { partTexture } from './Ship';

export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export interface ButtonOpts {
  size?: number;
  colour?: number;
  /** The primary action: brighter, with a glow. */
  primary?: boolean;
}

/** A neon text button (pointer + hover). Returns the text object; keyboard shortcuts are wired by the caller. */
export function button(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, o: ButtonOpts = {}): Phaser.GameObjects.Text {
  const colour = hex(o.colour ?? 0x00e5ff);
  const t = scene.add.text(x, y, o.primary ? `[ ${label} ]` : label, {
    fontFamily: FONT, fontSize: `${o.size ?? 20}px`, color: colour, fontStyle: o.primary ? 'bold' : 'normal',
  }).setOrigin(0.5).setPadding(14, 10).setInteractive({ useHandCursor: true });
  if (o.primary) t.setShadow(0, 0, colour, 12, true, true);
  t.on('pointerover', () => t.setColor('#ffffff'));
  t.on('pointerout', () => t.setColor(colour));
  t.on('pointerup', () => {
    Audio.sfx('ui');
    onClick();
  });
  return t;
}

/** "Sound: on/off" toggle; the choice is saved (Title and pause screens). */
export function muteToggle(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Text {
  const label = () => `Sound: ${Audio.isMuted() ? 'off' : 'on'}`;
  const t = button(scene, x, y, label(), () => {
    const save = loadSave(storage());
    const muted = !Audio.isMuted();
    Audio.setMuted(muted);
    writeSave({ ...save, muted }, storage());
    // A run holds its own copy of the save and writes it back on discoveries and new modules: keep it in step.
    const game = scene.scene.get('Game') as { save?: SaveData } | null;
    if (game?.save) game.save = { ...game.save, muted };
    t.setText(label());
  }, { size: 14, colour: 0x5f8f99 });
  return t;
}

/**
 * Draws a ship (or a recipe diagram) from part textures, centred on (x, y) with `cell` px per cell.
 * The cockpit is implicit at (0, 0) unless the JSON lists it.
 */
export function drawShip(scene: Phaser.Scene, json: ShipJSON, x: number, y: number, cell: number, container?: Phaser.GameObjects.Container): Phaser.GameObjects.Image[] {
  const parts = json.parts.some(p => p.id === 'cockpit') ? json.parts : [{ id: 'cockpit' as PartId, x: 0, y: 0, facing: 0 as const }, ...json.parts];
  const xs = parts.map(p => p.x), ys = parts.map(p => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return parts.map(p => {
    const img = scene.add.image(x + (p.x - cx) * cell, y + (p.y - cy) * cell, partTexture(p.id)).setDisplaySize(cell, cell);
    // Same convention as Ship.redraw: mirrors never rotate; '\' is the '/' icon flipped.
    if (p.id === 'mirror') img.setFlipX('orient' in p && p.orient === '\\');
    else img.setRotation((p.facing * Math.PI) / 2);
    container?.add(img);
    return img;
  });
}

/** Grid extent of a ship JSON in cells (cockpit included). */
export function shipExtent(json: ShipJSON): { w: number; h: number } {
  const xs = [0, ...json.parts.map(p => p.x)], ys = [0, ...json.parts.map(p => p.y)];
  return { w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
}
