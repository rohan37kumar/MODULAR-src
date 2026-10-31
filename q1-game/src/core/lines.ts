import { PARTS } from '../data/parts';
import type { ShipGrid } from './grid';
import { addCell, cellKey, reflect } from './math';
import type { Cell, Dir, Route, RouteStep } from './types';

export const MIRROR_BRANCH_MUL = 0.7;
export const MAX_BRANCHES = 8;

/**
 * Line of fire (design §9.3): the contiguous run of occupied cells in front of a
 * routed part's muzzle. Line modifiers are recorded in order; other parts are
 * transparent; a mirror sends half the shot straight on and half turned 90°.
 * Returns one Route per branch, or [] for parts that don't route.
 */
export function traceLines(grid: ShipGrid, uid: number): Route[] {
  const src = grid.byUid(uid);
  if (!src || !PARTS[src.id].routes) return [];

  const srcCell: Cell = { x: src.x, y: src.y };
  const srcKey = cellKey(srcCell);
  const routes: Route[] = [];
  // Shared across every branch so mirror loops terminate.
  const visited = new Set<string>();

  const walk = (cell: Cell, dir: Dir, steps: RouteStep[], path: Cell[], mul: number): void => {
    if (routes.length >= MAX_BRANCHES) return;
    const next = addCell(cell, dir);
    const part = grid.get(next.x, next.y);
    const visitKey = `${cellKey(next)}>${dir}`;
    if (!part || cellKey(next) === srcKey || visited.has(visitKey)) {
      routes.push({ sourceUid: uid, steps, path, exit: { cell, dir }, damageMul: mul });
      return;
    }
    visited.add(visitKey);
    const nextPath = [...path, next];
    const step = (turned?: boolean): RouteStep =>
      turned === undefined ? { uid: part.uid, partId: part.id, cell: next } : { uid: part.uid, partId: part.id, cell: next, turned };

    if (part.id === 'mirror') {
      const m = mul * MIRROR_BRANCH_MUL;
      walk(next, dir, [...steps, step(false)], nextPath, m);
      walk(next, reflect(dir, part.orient ?? '/'), [...steps, step(true)], nextPath, m);
    } else {
      walk(next, dir, PARTS[part.id].isModifier ? [...steps, step()] : steps, nextPath, mul);
    }
  };

  walk(srcCell, src.facing, [], [srcCell], 1);
  return routes;
}
