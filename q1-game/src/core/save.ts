import { LOOSE_PART_IDS, PART_IDS } from '../data/parts';
import { SIG_BY_ID } from '../data/signatures';
import type { PartId, SaveData, SignatureId } from './types';

/** Every read and write of persistent state goes through this module. Nothing here throws. */
export const SAVE_KEY = 'modular.save.v1';

export function defaultSave(): SaveData {
  return { version: 1, discovered: [], blueprints: [], bestRun: null, runs: 0, lastBlueprint: null, muted: false, modules: [] };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Keeps only known, unique ids, in their saved order. */
function cleanIds<T extends string>(v: unknown, known: (x: string) => boolean): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const x of v) if (typeof x === 'string' && known(x) && !out.includes(x as T)) out.push(x as T);
  return out;
}

const isSignatureId = (x: string) => Object.prototype.hasOwnProperty.call(SIG_BY_ID, x);
const isLoosePart = (x: string) => (LOOSE_PART_IDS as string[]).includes(x);

/** Archive MODULES tab size: every part, the cockpit included (its card is always unlocked). */
export const MODULE_COUNT = PART_IDS.length;

/** Defaults on missing storage, a throwing getItem, bad JSON or a version other than 1; otherwise sanitises field by field. */
export function loadSave(storage: Pick<Storage, 'getItem'> | null): SaveData {
  if (!storage) return defaultSave();
  let parsed: unknown;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw == null) return defaultSave();
    parsed = JSON.parse(raw);
  } catch {
    return defaultSave();
  }
  if (!isRecord(parsed) || parsed.version !== 1) return defaultSave();
  const best = parsed.bestRun;
  return {
    version: 1,
    discovered: cleanIds<SignatureId>(parsed.discovered, isSignatureId),
    blueprints: cleanIds<PartId>(parsed.blueprints, isLoosePart),
    bestRun: isRecord(best) && isCount(best.timeMs) && isCount(best.kills) ? { timeMs: best.timeMs, kills: best.kills } : null,
    runs: isCount(parsed.runs) ? Math.floor(parsed.runs) : 0,
    lastBlueprint: typeof parsed.lastBlueprint === 'string' && isLoosePart(parsed.lastBlueprint) ? (parsed.lastBlueprint as PartId) : null,
    muted: parsed.muted === true,
    modules: cleanIds<PartId>(parsed.modules, isLoosePart),
  };
}

/** True when the save was written; false (never a throw) when storage is missing, full or denied. */
export function writeSave(s: SaveData, storage: Pick<Storage, 'setItem'> | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

/** Logs a signature to the Xeno Archive. `blueprint` is its key part when that part was not already unlocked. */
export function recordDiscovery(s: SaveData, id: SignatureId): { save: SaveData; isNew: boolean; blueprint: PartId | null } {
  if (s.discovered.includes(id)) return { save: s, isNew: false, blueprint: null };
  const key = SIG_BY_ID[id].keyPart;
  const unlocks = !s.blueprints.includes(key);
  return {
    save: { ...s, discovered: [...s.discovered, id], blueprints: unlocks ? [...s.blueprints, key] : [...s.blueprints] },
    isNew: true,
    blueprint: unlocks ? key : null,
  };
}

/** Counts the run and keeps the best one: longest time, then more kills on a tie. */
export function recordRun(s: SaveData, run: { timeMs: number; kills: number }): SaveData {
  const b = s.bestRun;
  const better = !b || run.timeMs > b.timeMs || (run.timeMs === b.timeMs && run.kills > b.kills);
  return { ...s, runs: s.runs + 1, bestRun: better ? { timeMs: run.timeMs, kills: run.kills } : b };
}

/** Marks a part as seen for the Archive MODULES tab. Returns `s` itself when already known, or for the always-known cockpit. */
export function recordModule(s: SaveData, id: PartId): SaveData {
  if (id === 'cockpit' || s.modules.includes(id)) return s;
  return { ...s, modules: [...s.modules, id] };
}
