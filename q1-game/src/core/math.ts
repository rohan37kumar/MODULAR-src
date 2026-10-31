import type { Cell, Dir, MirrorOrient } from './types';

/** Ship-local unit vectors: 0 = up (-y), 1 = right, 2 = down, 3 = left. */
export const DIR_VEC: Record<Dir, Cell> = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
};

export const DIRS: readonly Dir[] = [0, 1, 2, 3];

const REFLECT: Record<MirrorOrient, Record<Dir, Dir>> = {
  '/': { 0: 1, 1: 0, 2: 3, 3: 2 },
  '\\': { 0: 3, 3: 0, 2: 1, 1: 2 },
};

/** Direction of travel after hitting a mirror (screen coordinates, y down). */
export function reflect(dir: Dir, orient: MirrorOrient): Dir {
  return REFLECT[orient][dir];
}

export const MAX_DT_MS = 50;

/** Caps a frame delta so a background tab or phone lock can't produce a huge step. */
export function clampDt(ms: number): number {
  return Math.min(Math.max(ms, 0), MAX_DT_MS);
}

export function cellKey(c: Cell): string {
  return `${c.x},${c.y}`;
}

export function addCell(c: Cell, d: Dir): Cell {
  const v = DIR_VEC[d];
  return { x: c.x + v.x, y: c.y + v.y };
}
