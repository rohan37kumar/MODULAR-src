import Phaser from 'phaser';
import { loadSave, MODULE_COUNT } from '../core/save';
import type { PartId, SaveData } from '../core/types';
import { cardLines, moduleKind } from '../data/modules';
import { partColour } from '../data/partShapes';
import { PART_IDS, PARTS } from '../data/parts';
import { SIGNATURES } from '../data/signatures';
import { COLOURS, FONT } from '../game/runtime';
import { partTexture } from '../game/Ship';
import { button, drawShip, hex, shipExtent } from '../game/ui';
import { DPR, starTile, uiCamera, viewSize } from '../game/view';
import { storage } from './GameScene';

export interface ArchiveData {
  /** Scene to return to, and the data to restart it with. */
  back: string;
  backData?: object;
}

const CARD_H = 236;
const MODULE_H = 226;
const GAP = 14;
const HEADER_H = 112;

type Tab = 'combos' | 'modules';
/** The last tab viewed, remembered for the session (not saved). */
let lastTab: Tab = 'combos';

/**
 * The Xeno Archive (design §13, addendum A§6.3), in two tabs.
 * COMBOS: one card per signature. Discovered ones show the name, a recipe diagram drawn with the part
 * icons, the analysis AI's quip and the key part; the rest are "??" (no hints).
 * MODULES: one card per part (cockpit first). Seen parts show the icon, the name, its kind and shape, and the plain card lines (`cardLines`).
 * Scrolls by wheel or drag when the cards don't fit.
 */
export class ArchiveScene extends Phaser.Scene {
  private data0: ArchiveData = { back: 'Title' };
  private maxScroll = 0;

  constructor() {
    super('Archive');
  }

  init(d: ArchiveData): void {
    this.data0 = d?.back ? d : { back: 'Title' };
  }

  create(): void {
    uiCamera(this);
    this.build();
    const onResize = () => this.build();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    const cam = this.cameras.main;
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scrollTo(cam.scrollY + dy));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.scrollTo(cam.scrollY - (p.y - p.prevPosition.y) / DPR);
    });
    const back = () => this.scene.start(this.data0.back, this.data0.backData);
    this.input.keyboard?.once('keydown-ESC', back);
    this.input.keyboard?.once('keydown-BACKSPACE', back);
  }

  private scrollTo(y: number): void {
    this.cameras.main.setScroll(0, Phaser.Math.Clamp(y, 0, this.maxScroll));
  }

  private build(): void {
    this.children.removeAll(true);
    const { w, h } = viewSize(this);
    const save = loadSave(storage());
    starTile(this, w / 2, h / 2, w, h, 'stars-far').setAlpha(0.5).setScrollFactor(0);

    const cols = Phaser.Math.Clamp(Math.floor((w - 32 + GAP) / (260 + GAP)), 1, 5);
    const cardW = Math.min(340, (w - 32 - GAP * (cols - 1)) / cols);
    const left = (w - (cols * cardW + (cols - 1) * GAP)) / 2;
    const tab = lastTab;
    const cardH = tab === 'combos' ? CARD_H : MODULE_H;
    const at = (i: number) => ({ x: left + (i % cols) * (cardW + GAP), y: HEADER_H + 8 + Math.floor(i / cols) * (cardH + GAP) });
    if (tab === 'combos') {
      SIGNATURES.forEach((sig, i) => {
        const { x, y } = at(i);
        this.card(sig.id, x, y, cardW, save.discovered.includes(sig.id));
      });
    } else {
      PART_IDS.forEach((id, i) => {
        const { x, y } = at(i);
        this.moduleCard(id, i + 1, x, y, cardW, moduleSeen(save, id));
      });
    }
    const rows = Math.ceil((tab === 'combos' ? SIGNATURES.length : PART_IDS.length) / cols);
    this.maxScroll = Math.max(0, HEADER_H + 8 + rows * (cardH + GAP) + 16 - h);
    this.scrollTo(this.cameras.main.scrollY);

    // Fixed header over the scrolling cards.
    this.add.rectangle(w / 2, HEADER_H / 2, w, HEADER_H, 0x000000, 0.92).setScrollFactor(0);
    const narrow = w < 480;
    this.add.text(narrow ? w / 2 + 24 : w / 2, 24, 'XENO ARCHIVE', { fontFamily: FONT, fontSize: narrow ? '18px' : '24px', color: '#b388ff', fontStyle: 'bold' })
      .setOrigin(0.5).setLetterSpacing(narrow ? 2 : 4).setScrollFactor(0).setShadow(0, 0, '#b388ff', 10, true, true);
    const seen = PART_IDS.filter(id => moduleSeen(save, id)).length;
    const count = tab === 'combos' ? `${save.discovered.length}/${SIGNATURES.length} combos logged` : `${seen}/${MODULE_COUNT} modules logged`;
    this.add.text(narrow ? w / 2 + 24 : w / 2, 50, count, { fontFamily: FONT, fontSize: '13px', color: '#9ef0ff' })
      .setOrigin(0.5).setScrollFactor(0);
    button(this, 52, 28, '‹ Back', () => this.scene.start(this.data0.back, this.data0.backData), { size: 16 }).setScrollFactor(0);
    this.tabs(w, tab);
  }

  /** COMBOS | MODULES under the title; the active tab is bright and underlined. */
  private tabs(w: number, active: Tab): void {
    const y = 88;
    const g = this.add.graphics().setScrollFactor(0);
    g.lineStyle(1, 0x00e5ff, 0.25).lineBetween(16, HEADER_H - 1, w - 16, HEADER_H - 1);
    (['combos', 'modules'] as Tab[]).forEach((t, i) => {
      const on = t === active;
      const x = w / 2 + (i === 0 ? -72 : 72);
      const label = button(this, x, y, t.toUpperCase(), () => {
        if (lastTab === t) return;
        lastTab = t;
        this.cameras.main.setScroll(0, 0);
        this.build();
      }, { size: 15, colour: on ? 0x00e5ff : 0x4f6f78 }).setScrollFactor(0);
      if (on) {
        label.setFontStyle('bold');
        g.lineStyle(2, 0x00e5ff, 1).lineBetween(x - 52, y + 14, x + 52, y + 14);
      }
    });
  }

  private moduleCard(id: PartId, n: number, x: number, y: number, cw: number, seen: boolean): void {
    const colour = partColour(id);
    const g = this.add.graphics();
    g.fillStyle(0x05080c, 0.9).fillRoundedRect(x, y, cw, MODULE_H, 8);
    g.lineStyle(seen ? 2 : 1, seen ? colour : 0x2a3a40, seen ? 0.75 : 1).strokeRoundedRect(x, y, cw, MODULE_H, 8);
    this.add.text(x + 12, y + 10, `#${String(n).padStart(2, '0')}`, { fontFamily: FONT, fontSize: '12px', color: seen ? hex(colour) : '#3d5157' });
    if (!seen) {
      this.add.text(x + cw / 2, y + MODULE_H / 2, '??', { fontFamily: FONT, fontSize: '48px', color: '#2f4a52' }).setOrigin(0.5);
      return;
    }
    this.add.image(x + 34, y + 52, partTexture(id)).setDisplaySize(44, 44);
    this.add.text(x + 66, y + 46, PARTS[id].name.toUpperCase(), {
      fontFamily: FONT, fontSize: '16px', color: hex(colour), fontStyle: 'bold', wordWrap: { width: cw - 78 },
    }).setOrigin(0, 0.5).setShadow(0, 0, hex(colour), 8, true, true);
    this.add.text(x + 66, y + 64, moduleKind(id), { fontFamily: FONT, fontSize: '10px', color: '#8fb8c2' }).setOrigin(0, 0.5);
    const labelW = 62;
    let ty = y + 86;
    for (const { label, text } of cardLines(id)) {
      const tip = label === 'TIP';
      this.add.text(x + 12, ty + 1, label, { fontFamily: FONT, fontSize: '10px', color: tip ? hex(colour) : '#5f8f99' });
      const t = this.add.text(x + 12 + labelW, ty, text, {
        fontFamily: FONT, fontSize: '12px', color: tip ? '#9ef0ff' : '#d8f6ff', wordWrap: { width: cw - 24 - labelW }, lineSpacing: 1,
      });
      ty += Math.max(16, t.height) + 5;
    }
  }

  private card(id: (typeof SIGNATURES)[number]['id'], x: number, y: number, cw: number, found: boolean): void {
    const sig = SIGNATURES.find(s => s.id === id)!;
    const g = this.add.graphics();
    const colour = found ? sig.colour : 0x2a3a40;
    g.fillStyle(0x05080c, 0.9).fillRoundedRect(x, y, cw, CARD_H, 8);
    g.lineStyle(found ? 2 : 1, colour, found ? 0.9 : 1).strokeRoundedRect(x, y, cw, CARD_H, 8);
    this.add.text(x + 12, y + 10, `#${String(sig.index).padStart(2, '0')}`, { fontFamily: FONT, fontSize: '12px', color: found ? hex(sig.colour) : '#3d5157' });
    if (!found) {
      this.add.text(x + cw / 2, y + CARD_H / 2, '??', { fontFamily: FONT, fontSize: '48px', color: '#2f4a52' }).setOrigin(0.5);
      return;
    }
    this.add.text(x + cw / 2, y + 30, sig.name.toUpperCase(), {
      fontFamily: FONT, fontSize: '17px', color: hex(sig.colour), fontStyle: 'bold',
    }).setOrigin(0.5, 0).setShadow(0, 0, hex(sig.colour), 8, true, true);
    // Recipe diagram, fitted into a box under the name.
    const box = { w: cw - 32, h: 76 };
    const ext = shipExtent(sig.diagram);
    const cell = Math.min(30, box.w / ext.w, box.h / ext.h);
    drawShip(this, sig.diagram, x + cw / 2, y + 56 + box.h / 2, cell);
    this.add.text(x + cw / 2, y + 140, sig.quip, {
      fontFamily: FONT, fontSize: '12px', color: '#d8f6ff', align: 'center', wordWrap: { width: cw - 24 }, lineSpacing: 2,
    }).setOrigin(0.5, 0);
    this.add.text(x + cw / 2, y + CARD_H - 12, `Key part: ${PARTS[sig.keyPart].name}`, {
      fontFamily: FONT, fontSize: '12px', color: hex(COLOURS.utility),
    }).setOrigin(0.5, 1);
  }
}

/** The cockpit's card is always unlocked; every other part once it has been bolted on. */
function moduleSeen(save: SaveData, id: PartId): boolean {
  return id === 'cockpit' || save.modules.includes(id);
}
