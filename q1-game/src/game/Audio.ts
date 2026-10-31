export type SfxName =
  | 'shoot' | 'beam' | 'hit' | 'kill' | 'explode' | 'pickup' | 'attach' | 'forge' | 'stinger' | 'hurt' | 'death' | 'ui'
  | 'tink' | 'shatter' | 'phase' | 'clank' | 'click';

/**
 * Procedural WebAudio sound (jsfxr-style): every sound is built from oscillators, one shared
 * noise buffer, gain envelopes and filters. No audio files.
 *
 * Graph: voices → sfxBus ─┐
 *        music → filter → fade → musicBus ─┴→ compressor → master (0.5) → speakers
 *
 * Never throws. With no AudioContext (Node, blocked) or before `unlock()`, every call is a no-op.
 */

const MASTER = 0.5;
const MUSIC_LEVEL = 0.35;
const THROTTLE_S = 0.06;
const MAX_VOICES = 24;
const PITCH_JITTER = 0.05;
/** Discovery sounds always play, even when the voice cap is full. */
const PRIORITY: ReadonlySet<SfxName> = new Set<SfxName>(['stinger', 'death']);
/** The stinger is a chord: keep it close to the music's key. */
const JITTER: Partial<Record<SfxName, number>> = { stinger: 0.01 };

// Music: 4 bars of 8ths at 100 BPM = 32 steps of 0.3 s, a 9.6 s loop.
const BPM = 100;
const STEP_S = 60 / BPM / 2;
const LOOP_STEPS = 32;
const LOOKAHEAD_S = 0.1;
const TICK_MS = 25;
const CUTOFF_LO = 600;
const CUTOFF_HI = 3500;

/** Am | F | Dm | E: bass root and a voice-led pad triad (MIDI notes). */
const BARS: { root: number; pad: number[] }[] = [
  { root: 45, pad: [57, 60, 64] },
  { root: 41, pad: [57, 60, 65] },
  { root: 38, pad: [57, 62, 65] },
  { root: 40, pad: [56, 59, 64] },
];
/** Bass ostinato, semitones above the bar root per 8th. */
const BASS_STEPS = [0, 12, 0, 0, 12, 0, 7, 10];

const midiHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** One playing sound: its nodes are disconnected when its last source ends. */
interface Voice {
  out: GainNode;
  nodes: AudioNode[];
  live: number;
}

type Builder = (v: Voice, t: number, p: number) => number;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicFilter: BiquadFilterNode | null = null;
let musicFade: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let crunch: Float32Array<ArrayBuffer> | null = null;

let muted = false;
let intensity = 0;
let musicWanted = false;
let userSuspended = false;

const lastAt: Partial<Record<SfxName, number>> = {};
const voiceEnds: number[] = [];

let timer: ReturnType<typeof setInterval> | null = null;
let anchor = 0;
let stepCount = 0;

/** Runs `fn`, swallowing anything WebAudio throws (closed context, bad params). */
function safe(fn: () => void): void {
  try {
    fn();
  } catch {
    /* audio must never break the game */
  }
}

function newContext(): AudioContext | null {
  const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

function buildGraph(c: AudioContext): void {
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 12;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;

  master = c.createGain();
  master.gain.value = muted ? 0 : MASTER;
  comp.connect(master);
  master.connect(c.destination);

  sfxBus = c.createGain();
  sfxBus.connect(comp);

  const musicBus = c.createGain();
  musicBus.gain.value = MUSIC_LEVEL;
  musicBus.connect(comp);
  musicFade = c.createGain();
  musicFade.gain.value = 0;
  musicFade.connect(musicBus);
  musicFilter = c.createBiquadFilter();
  musicFilter.type = 'lowpass';
  musicFilter.Q.value = 0.9;
  musicFilter.frequency.value = cutoff(intensity);
  musicFilter.connect(musicFade);

  noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  crunch = new Float32Array(256);
  for (let i = 0; i < crunch.length; i++) crunch[i] = Math.tanh((i / 128 - 1) * 5);
}

/** Exponential map so equal intensity steps sound like equal brightness steps. */
const cutoff = (x: number): number => CUTOFF_LO * Math.pow(CUTOFF_HI / CUTOFF_LO, x);

// ---- voice building blocks ----------------------------------------------------------------

function newVoice(c: AudioContext, dest: AudioNode, vol: number): Voice {
  const out = c.createGain();
  out.gain.value = vol;
  out.connect(dest);
  return { out, nodes: [out], live: 0 };
}

function release(v: Voice): void {
  for (const n of v.nodes) safe(() => n.disconnect());
  v.nodes.length = 0;
}

/** Registers a scheduled source so the voice is released once every source has ended. */
function own(v: Voice, src: AudioScheduledSourceNode): void {
  v.nodes.push(src);
  v.live++;
  src.onended = () => {
    if (--v.live === 0) release(v);
  };
}

/** Gain node with a click-free envelope: 0 → peak in `a` seconds, then exponential decay over `d`. */
function env(v: Voice, t: number, a: number, peak: number, d: number, dest: AudioNode): GainNode {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.connect(dest);
  v.nodes.push(g);
  return g;
}

function filt(v: Voice, type: BiquadFilterType, freq: number, q: number, dest: AudioNode): BiquadFilterNode {
  const f = ctx!.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.connect(dest);
  v.nodes.push(f);
  return f;
}

/** Oscillator sweeping f0 → f1 (exponential) over `dur`. */
function tone(v: Voice, type: OscillatorType, f0: number, f1: number, t: number, dur: number, dest: AudioNode, detune = 0): OscillatorNode {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  if (detune) o.detune.value = detune;
  o.connect(dest);
  own(v, o);
  o.start(t);
  o.stop(t + dur + 0.01);
  return o;
}

/** A slice of the shared noise buffer from a random offset. */
function noise(v: Voice, t: number, dur: number, dest: AudioNode): AudioBufferSourceNode {
  const s = ctx!.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = dur > 0.9;
  s.connect(dest);
  own(v, s);
  s.start(t, Math.random() * (s.loop ? 0.9 : 1 - dur));
  s.stop(t + dur);
  return s;
}

function gainOf(v: Voice, value: number, dest: AudioNode): GainNode {
  const g = ctx!.createGain();
  g.gain.value = value;
  g.connect(dest);
  v.nodes.push(g);
  return g;
}

// ---- the sounds (t = start time, p = pitch multiplier; each returns its length in seconds) ----

const SFX: Record<SfxName, Builder> = {
  /** Tiny square blip with a fast downward sweep. Fires constantly, so it sits low. */
  shoot(v, t, p) {
    const g = env(v, t, 0.002, 0.08, 0.05, v.out);
    tone(v, 'square', 1100 * p, 260 * p, t, 0.055, filt(v, 'lowpass', 3200, 0.7, g));
    return 0.06;
  },

  /** Sizzling buzz: band-passed saw wobbled by a 32 Hz square, plus hissing noise. */
  beam(v, t, p) {
    const g = env(v, t, 0.012, 0.075, 0.11, v.out);
    const o = tone(v, 'sawtooth', 180 * p, 150 * p, t, 0.13, filt(v, 'bandpass', 1400 * p, 1.2, g));
    const depth = ctx!.createGain();
    depth.gain.value = 18 * p;
    depth.connect(o.frequency);
    v.nodes.push(depth);
    tone(v, 'square', 32, 32, t, 0.13, depth);
    const ng = env(v, t, 0.005, 0.04, 0.1, v.out);
    noise(v, t, 0.13, filt(v, 'highpass', 5000, 0.7, ng));
    return 0.14;
  },

  /** Very short high noise tick. */
  hit(v, t, p) {
    const g = env(v, t, 0.001, 0.11, 0.028, v.out);
    noise(v, t, 0.032, filt(v, 'highpass', 2200 * p, 1, g));
    return 0.035;
  },

  /** Bright pop: square pitch-drop plus a band of noise. */
  kill(v, t, p) {
    const g = env(v, t, 0.002, 0.18, 0.11, v.out);
    tone(v, 'square', 720 * p, 110 * p, t, 0.12, filt(v, 'lowpass', 2600, 0.8, g));
    const ng = env(v, t, 0.001, 0.15, 0.07, v.out);
    noise(v, t, 0.09, filt(v, 'bandpass', 1800 * p, 0.9, ng));
    return 0.13;
  },

  /** Low boom: noise with a closing low-pass, under a sine sub-drop. */
  explode(v, t, p) {
    const g = env(v, t, 0.004, 0.55, 0.42, v.out);
    const lp = filt(v, 'lowpass', 2600 * p, 0.8, g);
    lp.frequency.setValueAtTime(2600 * p, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 0.4);
    noise(v, t, 0.45, lp);
    const sub = env(v, t, 0.003, 0.45, 0.32, v.out);
    tone(v, 'sine', 110 * p, 38 * p, t, 0.36, sub);
    return 0.46;
  },

  /** Rising two-note chime (A5 → E6), triangle with a sine octave on top. */
  pickup(v, t, p) {
    const notes: [number, number, number][] = [[0, 880, 0.07], [0.06, 1318.5, 0.09]];
    for (const [dt, f, d] of notes) {
      tone(v, 'triangle', f * p, f * p, t + dt, d, env(v, t + dt, 0.003, 0.16, d, v.out));
      tone(v, 'sine', 2 * f * p, 2 * f * p, t + dt, d, env(v, t + dt, 0.003, 0.04, d * 0.7, v.out));
    }
    return 0.16;
  },

  /** Weld clank: ringing band-passed noise, two inharmonic partials, and a low thunk. */
  attach(v, t, p) {
    const g = env(v, t, 0.001, 0.22, 0.12, v.out);
    noise(v, t, 0.13, filt(v, 'bandpass', 3100 * p, 7, g));
    const m = env(v, t, 0.001, 0.05, 0.1, v.out);
    tone(v, 'square', 1230 * p, 1190 * p, t, 0.11, m);
    tone(v, 'square', 1733 * p, 1690 * p, t, 0.11, m);
    const th = env(v, t, 0.002, 0.4, 0.15, v.out);
    tone(v, 'sine', 150 * p, 55 * p, t, 0.16, th);
    return 0.18;
  },

  /** Power-up: A-minor arpeggio up two octaves through an opening filter, over a rising saw. */
  forge(v, t, p) {
    const lp = filt(v, 'lowpass', 900, 3, v.out);
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(5200, t + 0.35);
    const notes = [440, 523.25, 659.25, 880, 1318.5];
    notes.forEach((f, i) => {
      const dt = i * 0.055;
      const d = i === notes.length - 1 ? 0.16 : 0.1;
      tone(v, 'square', f * p, f * p, t + dt, d + 0.01, env(v, t + dt, 0.003, 0.1, d, lp));
    });
    tone(v, 'sawtooth', 220 * p, 880 * p, t, 0.38, env(v, t, 0.2, 0.04, 0.18, lp));
    return 0.42;
  },

  /**
   * "New combo discovered". A wide A-add9 chord of detuned saws swells through an opening
   * filter while a triangle arpeggio climbs three octaves into an echo, over a soft low boom
   * and high shimmer. Bright (major) against the minor score, so it reads as a discovery.
   */
  stinger(v, t, p) {
    const end = 1.3;
    const sw = gainOf(v, 0, v.out);
    sw.gain.setValueAtTime(0, t);
    sw.gain.linearRampToValueAtTime(0.075, t + 0.14);
    sw.gain.setValueAtTime(0.075, t + 0.45);
    sw.gain.exponentialRampToValueAtTime(0.0001, t + end);
    const lp = filt(v, 'lowpass', 700, 2, sw);
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.exponentialRampToValueAtTime(6500, t + 0.35);
    lp.frequency.exponentialRampToValueAtTime(1800, t + end);
    for (const f of [220, 329.63, 440, 554.37, 659.25, 987.77]) {
      tone(v, 'sawtooth', f * p, f * p, t, end, lp, -9);
      tone(v, 'sawtooth', f * p, f * p, t, end, lp, 9);
    }

    tone(v, 'sine', 110 * p, 55 * p, t, 0.45, env(v, t, 0.004, 0.3, 0.4, v.out));

    // Echoing arpeggio: dry + a 180 ms feedback delay (cut when the voice is released).
    const arp = gainOf(v, 1, v.out);
    const delay = ctx!.createDelay(1);
    delay.delayTime.value = 0.18;
    v.nodes.push(delay);
    arp.connect(delay);
    delay.connect(gainOf(v, 0.35, delay));
    delay.connect(gainOf(v, 0.5, v.out));
    [880, 1108.73, 1318.51, 1760, 2217.46, 2637.02].forEach((f, i) => {
      const at = t + 0.08 + i * 0.075;
      tone(v, 'triangle', f * p, f * p, at, 0.24, env(v, at, 0.003, 0.11, 0.22, arp));
    });

    const sh = env(v, t + 0.05, 0.25, 0.05, 0.8, v.out);
    noise(v, t + 0.05, 1.1, filt(v, 'highpass', 7000, 0.7, sh));
    return end + 0.05;
  },

  /** Harsh low crunch: saw + square + noise through a tanh waveshaper. */
  hurt(v, t, p) {
    const g = env(v, t, 0.002, 0.3, 0.2, v.out);
    const lp = filt(v, 'lowpass', 1400, 1, g);
    const sh = ctx!.createWaveShaper();
    sh.curve = crunch;
    sh.connect(lp);
    v.nodes.push(sh);
    tone(v, 'sawtooth', 95 * p, 55 * p, t, 0.2, sh);
    tone(v, 'square', 63 * p, 40 * p, t, 0.2, sh);
    noise(v, t, 0.2, gainOf(v, 0.4, sh));
    return 0.22;
  },

  /** Hull failure: two detuned saws and noise collapse together under a closing low-pass. */
  death(v, t, p) {
    const dur = 1.45;
    const g = env(v, t, 0.01, 0.45, dur, v.out);
    const lp = filt(v, 'lowpass', 3000, 1.5, g);
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(70, t + dur);
    tone(v, 'sawtooth', 260 * p, 32 * p, t, dur, lp);
    tone(v, 'sawtooth', 255 * p, 31 * p, t, dur, lp);
    noise(v, t, dur + 0.05, gainOf(v, 0.5, lp));
    return dur + 0.06;
  },

  /** Soft click. */
  ui(v, t, p) {
    tone(v, 'sine', 1500 * p, 1100 * p, t, 0.04, env(v, t, 0.001, 0.08, 0.035, v.out));
    return 0.045;
  },

  /** Shield deflect: thin high square ping with an inharmonic sine above. Frequent, so very quiet. */
  tink(v, t, p) {
    const g = env(v, t, 0.001, 0.045, 0.035, v.out);
    tone(v, 'square', 2400 * p, 2250 * p, t, 0.04, filt(v, 'highpass', 1800, 0.7, g));
    tone(v, 'sine', 3710 * p, 3650 * p, t, 0.03, env(v, t, 0.001, 0.025, 0.025, v.out));
    return 0.045;
  },

  /** Shield break: a high band-passed noise crack, a tighter sparkle band, and three scattered glass pings. */
  shatter(v, t, p) {
    const g = env(v, t, 0.001, 0.24, 0.16, v.out);
    const bp = filt(v, 'bandpass', 5200 * p, 2.5, g);
    bp.frequency.setValueAtTime(5200 * p, t);
    bp.frequency.exponentialRampToValueAtTime(3400 * p, t + 0.17);
    noise(v, t, 0.17, bp);
    const sg = env(v, t + 0.01, 0.002, 0.09, 0.15, v.out);
    noise(v, t + 0.01, 0.16, filt(v, 'bandpass', 8200 * p, 6, sg));
    const pings: [number, number][] = [[0.02, 2930], [0.05, 4370], [0.085, 6110]];
    for (const [dt, f] of pings) {
      tone(v, 'sine', f * p, f * p, t + dt, 0.08, env(v, t + dt, 0.001, 0.03, 0.07, v.out));
    }
    return 0.19;
  },

  /**
   * Carrier phase change: a saw/square growl (wobbled by a 24 Hz square) dives through a tanh
   * waveshaper and a closing low-pass, over a sine sub-drop, with a ringing metal band sweeping
   * down on top. Peaks below the stinger so a discovery still wins.
   */
  phase(v, t, p) {
    const dur = 0.46;
    const g = env(v, t, 0.006, 0.26, dur, v.out);
    const lp = filt(v, 'lowpass', 2600, 2, g);
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + dur);
    const sh = ctx!.createWaveShaper();
    sh.curve = crunch;
    sh.connect(lp);
    v.nodes.push(sh);
    const o = tone(v, 'sawtooth', 330 * p, 52 * p, t, dur, gainOf(v, 0.7, sh));
    tone(v, 'square', 165 * p, 39 * p, t, dur, gainOf(v, 0.5, sh));
    const depth = ctx!.createGain();
    depth.gain.value = 22 * p;
    depth.connect(o.frequency);
    v.nodes.push(depth);
    tone(v, 'square', 24, 24, t, dur, depth);

    tone(v, 'sine', 96 * p, 30 * p, t, dur, env(v, t, 0.004, 0.32, 0.42, v.out));

    const mg = env(v, t, 0.002, 0.08, 0.38, v.out);
    const ring = filt(v, 'bandpass', 2600 * p, 9, mg);
    ring.frequency.setValueAtTime(2600 * p, t);
    ring.frequency.exponentialRampToValueAtTime(800 * p, t + 0.4);
    noise(v, t, 0.4, ring);
    return dur + 0.02;
  },

  /** Editor weld: short ringing band-passed noise, two inharmonic partials and a small knock. Lighter than attach. */
  clank(v, t, p) {
    const g = env(v, t, 0.001, 0.2, 0.08, v.out);
    noise(v, t, 0.09, filt(v, 'bandpass', 2400 * p, 9, g));
    const m = env(v, t, 0.001, 0.04, 0.07, v.out);
    tone(v, 'square', 940 * p, 910 * p, t, 0.08, m);
    tone(v, 'square', 1490 * p, 1450 * p, t, 0.08, m);
    tone(v, 'sine', 210 * p, 90 * p, t, 0.06, env(v, t, 0.001, 0.18, 0.055, v.out));
    return 0.095;
  },

  /** Rotate tick: a high-passed square chirp, drier and sharper than the ui click. */
  click(v, t, p) {
    const g = env(v, t, 0.001, 0.06, 0.024, v.out);
    tone(v, 'square', 3000 * p, 1800 * p, t, 0.028, filt(v, 'highpass', 1500, 0.7, g));
    return 0.032;
  },
};

// ---- music --------------------------------------------------------------------------------

function bass(c: AudioContext, t: number, midi: number, accent: boolean): void {
  const v = newVoice(c, musicFilter!, 1);
  const lp = filt(v, 'lowpass', 300, 4, env(v, t, 0.005, accent ? 0.38 : 0.28, 0.27, v.out));
  lp.frequency.setValueAtTime(260 + 1100 * intensity, t);
  lp.frequency.exponentialRampToValueAtTime(160, t + 0.25);
  const f = midiHz(midi);
  tone(v, 'sawtooth', f, f, t, 0.29, lp);
  tone(v, 'sine', f / 2, f / 2, t, 0.29, lp);
}

/** Slow pad: two detuned saws per chord tone, long attack, overlapping into the next bar. */
function pad(c: AudioContext, t: number, notes: number[], dur: number): void {
  const v = newVoice(c, musicFilter!, 1);
  const g = gainOf(v, 0, v.out);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05, t + 1.0);
  g.gain.setValueAtTime(0.05, t + dur - 0.2);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.8);
  const lp = filt(v, 'lowpass', 1200, 0.5, g);
  for (const m of notes) {
    const f = midiHz(m);
    tone(v, 'sawtooth', f, f, t, dur + 0.8, lp, -8);
    tone(v, 'sawtooth', f, f, t, dur + 0.8, lp, 8);
  }
}

function hat(c: AudioContext, t: number, vol: number): void {
  const v = newVoice(c, musicFilter!, 1);
  noise(v, t, 0.04, filt(v, 'highpass', 7000, 0.8, env(v, t, 0.001, vol, 0.035, v.out)));
}

function kick(c: AudioContext, t: number, vol: number): void {
  const v = newVoice(c, musicFilter!, 1);
  tone(v, 'sine', 120, 40, t, 0.16, env(v, t, 0.002, vol, 0.15, v.out));
}

function scheduleStep(c: AudioContext, step: number, t: number): void {
  const bar = BARS[Math.floor(step / 8)];
  const eighth = step % 8;
  if (eighth === 0) pad(c, t, bar.pad, STEP_S * 8);
  bass(c, t, bar.root + BASS_STEPS[eighth], eighth === 0);
  // Energy layers fade in with intensity: hats on 8ths above 0.4, a four-on-the-floor kick above 0.6.
  if (intensity > 0.4) hat(c, t, 0.05 * Math.min(1, (intensity - 0.4) / 0.4) * (eighth % 2 ? 1 : 0.6));
  if (intensity > 0.6 && eighth % 2 === 0) kick(c, t, 0.35 * Math.min(1, (intensity - 0.6) / 0.4));
}

/** Look-ahead scheduler: note times come from `anchor + n * STEP_S`, so the loop never drifts. */
function tick(): void {
  safe(() => {
    const c = ctx;
    if (!c) return;
    const now = c.currentTime;
    // Fell behind (throttled timer, stalled thread): skip ahead instead of bursting notes.
    if (anchor + stepCount * STEP_S < now - 0.2) {
      anchor = now + 0.05 - stepCount * STEP_S;
    }
    for (let at = anchor + stepCount * STEP_S; at < now + LOOKAHEAD_S; at = anchor + stepCount * STEP_S) {
      scheduleStep(c, stepCount % LOOP_STEPS, at);
      stepCount++;
    }
  });
}

function startScheduler(): void {
  if (timer !== null || !ctx) return;
  timer = setInterval(tick, TICK_MS);
  tick();
}

function stopScheduler(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

function startMusic(c: AudioContext): void {
  const g = musicFade!.gain;
  g.cancelScheduledValues(c.currentTime);
  g.setValueAtTime(g.value, c.currentTime);
  g.setTargetAtTime(1, c.currentTime, 0.1);
  if (timer === null) {
    anchor = c.currentTime + 0.1;
    stepCount = 0;
    if (!userSuspended) startScheduler();
  }
}

// ---- public API ---------------------------------------------------------------------------

export const Audio = {
  /** Call on the first pointer/key gesture. Creates or resumes the context. Idempotent. */
  unlock(): void {
    safe(() => {
      if (!ctx) {
        const c = newContext();
        if (!c) return;
        ctx = c;
        buildGraph(c);
        if (userSuspended) void c.suspend().catch(() => {});
        if (musicWanted) startMusic(c);
      }
      if (ctx.state === 'suspended' && !userSuspended) void ctx.resume().catch(() => {});
    });
  },

  /** `pitch` and `vol` are multipliers (default 1). Each name plays at most once per 60 ms. */
  sfx(name: SfxName, opts?: { pitch?: number; vol?: number }): void {
    safe(() => {
      const c = ctx;
      if (!c || muted || userSuspended || c.state !== 'running') return;
      const now = c.currentTime;
      const last = lastAt[name];
      if (last !== undefined && now - last < THROTTLE_S) return;

      let n = 0;
      for (const e of voiceEnds) if (e > now) voiceEnds[n++] = e;
      voiceEnds.length = n;
      if (n >= MAX_VOICES && !PRIORITY.has(name)) return;

      lastAt[name] = now;
      const jitter = JITTER[name] ?? PITCH_JITTER;
      const p = (opts?.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * jitter);
      const v = newVoice(c, sfxBus!, opts?.vol ?? 1);
      const t = now + 0.005;
      voiceEnds.push(t + SFX[name](v, t, p));
    });
  },

  /** Starts the synth loop, or fades it out over ~0.5 s and stops the scheduler. */
  music(on: boolean): void {
    musicWanted = on;
    safe(() => {
      const c = ctx;
      if (!c || !musicFade) return;
      if (on) {
        startMusic(c);
      } else {
        stopScheduler();
        const g = musicFade.gain;
        g.cancelScheduledValues(c.currentTime);
        g.setValueAtTime(g.value, c.currentTime);
        g.setTargetAtTime(0, c.currentTime, 0.12);
      }
    });
  },

  /** 0..1: opens the music low-pass (600 → 3500 Hz) and layers in hats and kick. */
  setIntensity(x: number): void {
    intensity = Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
    safe(() => {
      if (ctx && musicFilter) musicFilter.frequency.setTargetAtTime(cutoff(intensity), ctx.currentTime, 0.4);
    });
  },

  setMuted(m: boolean): void {
    muted = m;
    safe(() => {
      if (!ctx || !master) return;
      const g = master.gain;
      g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(g.value, ctx.currentTime);
      g.setTargetAtTime(m ? 0 : MASTER, ctx.currentTime, 0.015);
    });
  },

  isMuted(): boolean {
    return muted;
  },

  /** Pause screen / hidden tab: freezes the context clock and the music scheduler. */
  suspend(): void {
    userSuspended = true;
    stopScheduler();
    safe(() => {
      if (ctx) void ctx.suspend().catch(() => {});
    });
  },

  resume(): void {
    userSuspended = false;
    safe(() => {
      if (!ctx) return;
      void ctx.resume().catch(() => {});
      if (musicWanted) startScheduler();
    });
  },
};
