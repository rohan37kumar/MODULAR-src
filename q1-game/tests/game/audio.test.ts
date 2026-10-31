import { afterEach, expect, test, vi } from 'vitest';
import type { SfxName } from '../../src/game/Audio';

/** A Record, so adding a name to SfxName without listing it here is a type error. */
const ALL: Record<SfxName, true> = {
  shoot: true, beam: true, hit: true, kill: true, explode: true, pickup: true, attach: true, forge: true,
  stinger: true, hurt: true, death: true, ui: true, tink: true, shatter: true, phase: true, clank: true, click: true,
};
const NAMES = Object.keys(ALL) as SfxName[];

/** Fresh module per test: Audio is a singleton with module-level state. */
const load = async () => {
  vi.resetModules();
  return (await import('../../src/game/Audio')).Audio;
};

const noop = () => {};

/** AudioParam stand-in: any scheduling method is a no-op. */
const param = () => new Proxy({ value: 0 } as Record<string | symbol, unknown>, { get: (o, k) => (k in o ? o[k] : noop) });

/** AudioNode stand-in: methods are no-ops, any other property is a fresh AudioParam. */
const node = () =>
  new Proxy({} as Record<string | symbol, unknown>, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === 'then') return undefined;
      if (typeof k === 'string' && ['connect', 'disconnect', 'start', 'stop'].includes(k)) return noop;
      return (o[k] = param());
    },
    set(o, k, v) {
      o[k] = v;
      return true;
    },
  });

/** Minimal AudioContext: a settable clock, and a count of sound sources created. */
class FakeContext {
  static sources = 0;
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  destination = node();
  createGain = node;
  createBiquadFilter = node;
  createDynamicsCompressor = node;
  createWaveShaper = node;
  createDelay = node;
  createOscillator = () => (FakeContext.sources++, node());
  createBufferSource = () => (FakeContext.sources++, node());
  createBuffer = (_ch: number, len: number) => ({ getChannelData: () => new Float32Array(len) });
  resume = () => Promise.resolve();
  suspend = () => Promise.resolve();
}

const g = globalThis as unknown as { AudioContext?: unknown };

afterEach(() => {
  delete g.AudioContext;
  FakeContext.sources = 0;
});

test('every call is a silent no-op without an AudioContext', async () => {
  const Audio = await load();
  expect(() => {
    for (const n of NAMES) Audio.sfx(n);
    Audio.music(true);
    Audio.unlock();
    Audio.unlock();
    for (const n of NAMES) Audio.sfx(n, { pitch: 1.5, vol: 0.2 });
    Audio.music(true);
    Audio.setIntensity(0.7);
    Audio.setIntensity(Number.NaN);
    Audio.suspend();
    Audio.resume();
    Audio.music(false);
  }).not.toThrow();
  expect(Audio.isMuted()).toBe(false);
  Audio.setMuted(true);
  expect(Audio.isMuted()).toBe(true);
  Audio.setMuted(false);
  expect(Audio.isMuted()).toBe(false);
});

test('every sound builds against a context without throwing', async () => {
  g.AudioContext = FakeContext;
  const Audio = await load();
  Audio.unlock();
  expect(() => {
    for (const n of NAMES) Audio.sfx(n);
    Audio.setIntensity(1);
    Audio.music(true);
    Audio.music(false);
    Audio.setMuted(true);
    Audio.setMuted(false);
    Audio.suspend();
    Audio.resume();
  }).not.toThrow();
  expect(FakeContext.sources).toBeGreaterThan(NAMES.length);
});

test('every name has a builder that makes sound', async () => {
  g.AudioContext = FakeContext;
  const Audio = await load();
  Audio.unlock();
  const silent: SfxName[] = [];
  for (const n of NAMES) {
    const before = FakeContext.sources;
    Audio.sfx(n);
    if (FakeContext.sources === before) silent.push(n);
  }
  expect(silent).toEqual([]);
});

test('sfx before unlock is dropped, not queued', async () => {
  g.AudioContext = FakeContext;
  const Audio = await load();
  Audio.sfx('shoot');
  Audio.unlock();
  expect(FakeContext.sources).toBe(0);
});

test('each sound plays at most once per 60 ms', async () => {
  let fake: FakeContext | null = null;
  g.AudioContext = class extends FakeContext {
    constructor() {
      super();
      fake = this;
    }
  };
  const Audio = await load();
  Audio.unlock();
  const clock = fake as unknown as FakeContext;

  Audio.sfx('shoot');
  const one = FakeContext.sources;
  expect(one).toBeGreaterThan(0);

  Audio.sfx('shoot');
  clock.currentTime = 0.05;
  Audio.sfx('shoot');
  expect(FakeContext.sources).toBe(one);

  clock.currentTime = 0.07;
  Audio.sfx('shoot');
  expect(FakeContext.sources).toBe(2 * one);

  // Throttling is per name: a different sound still plays.
  Audio.sfx('hit');
  expect(FakeContext.sources).toBeGreaterThan(2 * one);
});

test('muted and suspended drop sfx', async () => {
  g.AudioContext = FakeContext;
  const Audio = await load();
  Audio.unlock();
  Audio.setMuted(true);
  Audio.sfx('kill');
  Audio.setMuted(false);
  Audio.suspend();
  Audio.sfx('kill');
  expect(FakeContext.sources).toBe(0);
  Audio.resume();
  Audio.sfx('kill');
  expect(FakeContext.sources).toBeGreaterThan(0);
});
