import { expect, test } from 'vitest';
import { defaultSave, loadSave, MODULE_COUNT, recordDiscovery, recordModule, recordRun, SAVE_KEY, writeSave } from '../../src/core/save';

const mem = (init?: string) => { let v = init ?? null; return { getItem: () => v, setItem: (_: string, x: string) => { v = x; } }; };
test('defaults when storage is null, throws, or holds garbage', () => {
  expect(loadSave(null)).toEqual(defaultSave());
  expect(loadSave({ getItem: () => { throw new Error('denied'); } })).toEqual(defaultSave());
  expect(loadSave(mem('{not json'))).toEqual(defaultSave());
  expect(loadSave(mem(JSON.stringify({ version: 99 })))).toEqual(defaultSave());
});
test('writeSave returns false instead of throwing', () => {
  expect(writeSave(defaultSave(), { setItem: () => { throw new Error('quota'); } })).toBe(false);
});
test('round trip and discovery unlocks the key part once', () => {
  const s = mem(); const r = recordDiscovery(defaultSave(), 'splitBeam');
  expect([r.isNew, r.blueprint]).toEqual([true, 'mirror']);
  const again = recordDiscovery(r.save, 'hallOfMirrors'); expect([again.isNew, again.blueprint]).toEqual([true, null]);
  writeSave(again.save, s); expect(loadSave(s).discovered).toEqual(['splitBeam', 'hallOfMirrors']);
});

// Extra coverage beyond the plan.
test('uses the v1 key and writeSave(null) is false', () => {
  expect(SAVE_KEY).toBe('modular.save.v1');
  expect(writeSave(defaultSave(), null)).toBe(false);
  let key = ''; expect(writeSave(defaultSave(), { setItem: (k: string) => { key = k; } })).toBe(true); expect(key).toBe(SAVE_KEY);
});
test('sanitises a parsed save field by field', () => {
  const raw = { version: 1, discovered: ['splitBeam', 'bogus', 'splitBeam', 3], blueprints: ['mirror', 'cockpit', 'laser'], bestRun: { timeMs: 'x' }, runs: -2 };
  expect(loadSave(mem(JSON.stringify(raw)))).toEqual({ ...defaultSave(), discovered: ['splitBeam'], blueprints: ['mirror'] });
  expect(loadSave(mem('null'))).toEqual(defaultSave());
  expect(loadSave(mem('[1,2]'))).toEqual(defaultSave());
  const ok = { version: 1, discovered: [], blueprints: [], bestRun: { timeMs: 5000, kills: 12 }, runs: 4 };
  expect(loadSave(mem(JSON.stringify(ok)))).toEqual({ ...ok, lastBlueprint: null, muted: false, modules: [] });
});
test('rediscovery is a no-op and inputs are not mutated', () => {
  const base = defaultSave(); const r = recordDiscovery(base, 'splitBeam');
  expect(base).toEqual(defaultSave());
  const again = recordDiscovery(r.save, 'splitBeam');
  expect([again.isNew, again.blueprint]).toEqual([false, null]); expect(again.save).toEqual(r.save);
});
test('recordRun counts runs and keeps the best (time, then kills)', () => {
  const base = defaultSave();
  let s = recordRun(base, { timeMs: 60_000, kills: 50 }); expect(base.runs).toBe(0);
  expect([s.runs, s.bestRun]).toEqual([1, { timeMs: 60_000, kills: 50 }]);
  s = recordRun(s, { timeMs: 30_000, kills: 500 }); expect(s.bestRun).toEqual({ timeMs: 60_000, kills: 50 });
  s = recordRun(s, { timeMs: 60_000, kills: 70 }); expect(s.bestRun).toEqual({ timeMs: 60_000, kills: 70 });
  s = recordRun(s, { timeMs: 90_000, kills: 1 }); expect([s.runs, s.bestRun]).toEqual([4, { timeMs: 90_000, kills: 1 }]);
});
test('lastBlueprint defaults to null, survives a round trip, and old or bad values load as null', () => {
  expect(defaultSave().lastBlueprint).toBeNull();
  const old = { version: 1, discovered: ['splitBeam'], blueprints: ['mirror'], bestRun: null, runs: 2 };
  expect(loadSave(mem(JSON.stringify(old))).lastBlueprint).toBeNull();
  expect(loadSave(mem(JSON.stringify({ ...old, lastBlueprint: 'mirror' }))).lastBlueprint).toBe('mirror');
  expect(loadSave(mem(JSON.stringify({ ...old, lastBlueprint: 'cockpit' }))).lastBlueprint).toBeNull();
  expect(loadSave(mem(JSON.stringify({ ...old, lastBlueprint: 42 }))).lastBlueprint).toBeNull();
});
test('muted defaults to false and only a real boolean true loads as muted', () => {
  expect(defaultSave().muted).toBe(false);
  const old = { version: 1, discovered: [], blueprints: [], bestRun: null, runs: 0 };
  expect(loadSave(mem(JSON.stringify(old))).muted).toBe(false);
  expect(loadSave(mem(JSON.stringify({ ...old, muted: true }))).muted).toBe(true);
  expect(loadSave(mem(JSON.stringify({ ...old, muted: 'yes' }))).muted).toBe(false);
});

// Addendum Task 5: modules seen (Archive MODULES tab).
test('a pre-addendum save (no modules field) loads with modules [] and keeps its discoveries', () => {
  const raw = '{"version":1,"discovered":["splitBeam"],"blueprints":["mirror"],"runs":3}';
  expect(() => loadSave(mem(raw))).not.toThrow();
  const s = loadSave(mem(raw));
  expect(s.modules).toEqual([]);
  expect(s.discovered).toEqual(['splitBeam']);
  expect(s.blueprints).toEqual(['mirror']);
  expect(s.runs).toBe(3);
  expect(defaultSave().modules).toEqual([]);
});
test('unknown, duplicate, non-string and cockpit module ids are dropped', () => {
  const raw = { version: 1, discovered: [], blueprints: [], runs: 0, modules: ['saw', 'bogus', 'saw', 7, 'cockpit', 'mimic'] };
  expect(loadSave(mem(JSON.stringify(raw))).modules).toEqual(['saw', 'mimic']);
  expect(loadSave(mem(JSON.stringify({ ...raw, modules: 'saw' }))).modules).toEqual([]);
});
test('recordModule appends once and is idempotent; inputs are not mutated', () => {
  const base = defaultSave();
  const a = recordModule(base, 'saw');
  expect(a.modules).toEqual(['saw']); expect(base.modules).toEqual([]);
  const b = recordModule(a, 'hook'); expect(b.modules).toEqual(['saw', 'hook']);
  expect(recordModule(b, 'saw')).toBe(b);
  const st = mem(); writeSave(b, st); expect(loadSave(st).modules).toEqual(['saw', 'hook']);
});
test('recordModule ignores the cockpit; MODULE_COUNT counts every part, cockpit included', () => {
  const s = defaultSave();
  expect(recordModule(s, 'cockpit')).toBe(s);
  expect(MODULE_COUNT).toBe(21);
});
