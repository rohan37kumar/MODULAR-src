# MODULAR: Q1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: **superpowers:executing-plans** (the user chose Native execution on 2026-10-29). Implement task by task in the main session, and offload independent pieces to parallel agents as listed in "Order and pace". Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Status:** approved by the user on 2026-10-29. Development starts at Task 1 in the next session.

**Goal:** A browser-playable Phaser 3 prototype of MODULAR (an auto-fire neon survivor-like where salvaged alien parts bolt onto a grid ship and combine into 15 named combos), with the Xeno Archive, Blueprint starts and the Ship snapshot as day-1 hooks. Then the Q1 writeup.

**Architecture:**
- **The combo engine is pure TypeScript in `src/core/`** with no Phaser import. It covers grid, touch traits, line-of-fire routing, the signature recogniser, the shot compiler, the loadout compiler, save, RNG and the spawn and drop directors, and it is unit-tested with Vitest.
- **Phaser** (`src/game/`, `src/scenes/`) only executes what the core compiles: a `Loadout` of `MountSpec`s, each with `ShotSpec`s per route. It also handles rendering, input, juice and audio.
- Parts and signatures are data (`src/data/`). Every signature carries an example layout that the tests and the debug sandbox both load.

**Tech Stack:** Phaser 3.90.0, TypeScript 5.9.3, Vite 7.3.7, Vitest 3.2.7, Node 22 (this machine has v22.13.1). WebAudio for synthesised sound. No other runtime dependencies.

**Spec:** `docs/q1/design.md` (approved 2026-10-29). Decisions are logged in `CLAUDE.md`. Section references below (§n) point into the design doc.

## Global Constraints

- All code lives in `q1-game/`. Docs live in `docs/q1/`.
- **Phaser `3.90.0` exactly**: no Phaser 4. Pin versions exactly in `package.json`, with no `^`.
- `src/core/**` must never import Phaser or touch `window` or `document`. Storage is passed in.
- **Build:**
  - Vite `base: './'`, so `dist/` works from any GitHub Pages sub-path.
  - No network assets at runtime (no CDN, no web fonts). Use a system monospace stack: `"Consolas, 'Courier New', monospace"`.
  - All audio is generated in code.
- **Persistence:**
  - Use the localStorage key `modular.save.v1`.
  - Every read and write goes through `src/core/save.ts`, wrapped in try/catch, and the game must run with storage unavailable.
- **Grid:**
  - Radius 3 (7×7, cells −3..3), with the cockpit fixed at (0,0), always facing 0. The cockpit can't be moved, rotated or jettisoned.
  - Ship-local directions: `0` = forward/up (−y), `1` = right (+x), `2` = down (+y), `3` = left (−x).
  - Cell size is 26 px in the world.
- **Facing:**
  - A routed part's muzzle is its `facing`. That includes the Thruster's exhaust *(my call: the exhaust points the way the part faces, so auto-attached thrusters vent outward)*.
  - Auto-attached parts face the direction from the contacted cell to the new cell.
  - A newly attached Mirror gets orientation `'/'`.
- **Mirror reflection** (screen coordinates, y down):
  - `'/'`: 0→1, 1→0, 2→3, 3→2
  - `'\'`: 0→3, 3→0, 2→1, 1→2
  - Each branch is ×0.7 damage.
- **Hull:** 100 HP. A hull repair core heals 30, capped at 100. Bulwark Plate gives −40% damage on its own cell.
- **Colours:**

  | Use | Colour |
  |---|---|
  | Player | `0x00e5ff` cyan |
  | Swarm | `0xff2d55` red and `0xff00c8` magenta |
  | Weapons | `0xffb000` amber |
  | Line modifiers | `0xffffff` white (Mirror, Lens, Prism) and `0xb388ff` violet (Orbit Ring, Echo Coil) |
  | Utility | `0x39ff88` green |
  | Background | `0x000000` black, with the canvas background `#000` |

- **Copy:**
  - The title is **MODULAR**.
  - Fiction names, verbatim: **Forge Uplink**, **Carrier**, **Hull repair core**, **Xeno Archive**.
  - Undiscovered Archive cards show only `??`, with no hints, silhouettes or adjacency markers anywhere.
- **Touch traits:**
  - Never harmful.
  - The same trait doesn't stack.
  - Up to 4 per part.
  - When a trait has nothing to modify, it falls back to ×1.15 on the part's main number.
- **Signatures:**
  - The first time one actually *fires* in a save file, it gets the full announcement: 0.5 s of real time at timeScale 0.25, a stinger, a linking line, a banner with the name and quip, and "Xeno Archive n/15".
  - On later firings it gets a name tag, at most once every 4 s per signature.
  - A source weapon in a signature gets power ×1.5.
- **Performance:**
  - Target 60 fps with about 300 enemies and about 500 projectiles.
  - Caps: enemies 300, player projectiles 600, enemy bullets 200, allies 10, Orbit Ring parked shots 16, Grand Finale 150 bolts per volley.
  - Pool all of them.
- **Debug:** `window.__modular` and the sandbox exist **only** when the URL has `?debug=1`.
- **Platforms:**
  - Desktop first: WASD or arrows, the mouse, R or right-click to rotate, X to jettison, Enter to accept, Esc or P to pause.
  - Phone: a floating virtual joystick, touch drag in the Forge, on-screen Rotate, Jettison bin, Accept and Pause.
  - Portrait-friendly via `Phaser.Scale.RESIZE`.
- **Slip rule:**
  - **Only audio polish may slip.** That means the music loop and SFX variety. Basic SFX stay.
  - Phone controls, PNG export and all 15 signatures are committed.
- **Not built:** runtime AI or LLM calls, Daily Signal, bounties, meta-currency spending, stat upgrades, hull unlocks, the star map, Ascension, accounts, backend, leaderboards, analytics, shape combos. Stutter Step is stretch only (Task 22, optional step).

## Review Focus

1. **Storage blocked, full or holding garbage** (Safari private mode, an old or edited save). Expected: defaults load, the game plays, and nothing throws. Pinned in Task 7 (`loadSave` with a throwing storage, garbage JSON and a wrong version).
2. **Huge frame delta after a background tab or a phone lock.** Expected: no tunnelling, no burst of 50 enemies spawning at once, and no instant death. Pinned in Task 7 (`SpawnDirector.update(60000)` emits at most `maxEventsPerUpdate`) and Task 8 (`clampDt`).
3. **A crowded grid or simultaneous pickups.** A part touches a fully surrounded cell, or two parts touch the same spot in one frame. Expected: the part bounces off or lands in a different free cell, and never overlaps or exceeds 7×7. Pinned in Task 2.
4. **Mirror loops** (four Mirrors in a square, or a line routed back through its source). Expected: tracing terminates with at most 8 branches. Pinned in Task 4.
5. **Combo output explosions** (Prism, Echo and twin stacking, or Grand Finale with Echo). Expected: volleys stay capped and the pools never exceed their caps. Pinned in Task 6 (`MAX_VOLLEY`) and Task 8 (`Pool` cap).

---

## File Structure

```
q1-game/
  package.json  tsconfig.json  vite.config.ts  index.html  README.md
  src/
    main.ts                 Phaser.Game config + scene list
    core/                   PURE LOGIC — no Phaser, no DOM
      types.ts              all shared types (below)
      math.ts               DIR_VEC, reflect, clampDt, cellKey
      grid.ts               ShipGrid: attach/place/move/rotate/jettison/connectivity/JSON
      traits.ts             computeTraits
      lines.ts              traceLines (routing, mirrors, branch cap)
      recogniser.ts         recognise (15 signatures + overlap suppression)
      shot.ts               baseShot, applyTraits, applyModifier, compileShot
      loadout.ts            compileLoadout (mounts, payloads, feeds, stats)
      save.ts               load/write/recordDiscovery/recordRun
      rng.ts                mulberry32, pick, range
      director.ts           SpawnDirector, DropPacer
      spatialHash.ts        SpatialHash
      pool.ts               Pool
    data/
      parts.ts              PARTS (15 + cockpit)
      partShapes.ts         vector paths per part (shared by Phaser textures, snapshot, Archive diagrams)
      signatures.ts         SIGNATURES (15) with diagram layouts and quips
      enemies.ts            ENEMIES
      tuning.ts             TUNING (all numbers)
      copy.ts               intro, tutorial and end-screen strings
    game/
      Ship.ts               ship transform, steering, cell hitboxes, grid rendering, trait pips
      Projectiles.ts        pooled bolts + enemy bullets
      Beams.ts              continuous shapes: beam, ring, flame, lance
      WeaponSystem.ts       executes Loadout: timers, aiming, routes, conduits, modifiers, traits
      Emitters.ts           Bomb Pod, Arc Coil, modifier-alone behaviours
      Utility.ts            Thruster, Magnet scrap-feed, Bulwark, Repair Node
      Status.ts             enemy statuses: charged, slow, frozen, burn
      EnemySystem.ts        Mote, Drone, Spitter, Lancer, Carrier, enemy bullets
      Pickups.ts            floating parts, scrap, repair cores, Forge Uplinks
      SignatureRuntime.ts   flourishes, signature-fired events, announcement
      SignatureEffects.ts   the 6 dedicated effects
      Fx.ts                 shake, hit-stop, particles, slow-mo, banners
      Audio.ts              WebAudio synth SFX + music loop
      Input.ts              keyboard + virtual joystick → steer vector
      Hud.ts                hull, time, kills, Archive n/15, name tags, pause button
      snapshot.ts           Canvas2D ship snapshot → PNG
      debug.ts              window.__modular (only with ?debug=1)
    scenes/
      BootScene.ts  TitleScene.ts  GameScene.ts  ForgeScene.ts  EndScene.ts  ArchiveScene.ts
  tests/core/*.test.ts
```

### Shared types (`src/core/types.ts`, created in Task 2 and extended in later tasks only where noted)

```ts
export type PartId = 'cockpit'|'pulse'|'beam'|'needle'|'bomb'|'arc'|'cryo'
  |'mirror'|'lens'|'orbit'|'echo'|'prism'|'thruster'|'magnet'|'bulwark'|'repair';
export type Dir = 0|1|2|3;
export type MirrorOrient = '/'|'\\';
export type Family = 'core'|'weapon'|'modifier'|'utility';
export type AimClass = 'fixed'|'turret'|'emitter'|'none';
export type TraitId = 'shrapnel'|'pierce'|'twin'|'warhead'|'charge'|'chill'|'bounce'|'focus'
  |'orbit'|'echo'|'split'|'ignite'|'pull'|'harden'|'mend';
export type SignatureId = 'splitBeam'|'clusterShell'|'hallOfMirrors'|'slugRound'|'halo'|'gravitySling'
  |'afterburnerLance'|'resonator'|'trident'|'shatterstorm'|'jumpstart'|'coinSlinger'|'stormSeed'
  |'porcupine'|'grandFinale';
export type EnemyKind = 'mote'|'drone'|'spitter'|'lancer'|'carrier';
export interface Cell { x: number; y: number }
export interface PlacedPart { uid: number; id: PartId; x: number; y: number; facing: Dir; orient?: MirrorOrient }
export interface ShipJSON { parts: { id: PartId; x: number; y: number; facing: Dir; orient?: MirrorOrient }[] } // cockpit implicit
export interface RouteStep { uid: number; partId: PartId; cell: Cell; turned?: boolean }
export interface Route { sourceUid: number; steps: RouteStep[]; path: Cell[]; exit: { cell: Cell; dir: Dir }; damageMul: number }
export interface SignatureMatch { id: SignatureId; uids: number[] }            // uids sorted ascending
export type ShotShape = 'bolt'|'beam'|'ring'|'flame'|'lance'|'burst'|'chain';
export interface ShotSpec {
  shape: ShotShape; damage: number; count: number; spreadDeg: number; speed: number; range: number;
  width: number; pierce: number; fuse: number; orbit: boolean;
  echoes: { delay: number; mul: number }[]; extraShards: number; twin: boolean;
  effects: TraitId[]; power: number;
}
export interface MountSpec {
  uid: number; partId: PartId; cell: Cell; facing: Dir; aim: AimClass; traits: TraitId[];
  shots: { route: Route | null; spec: ShotSpec }[]; signatures: SignatureId[];
  payload: PartId | null; feeds: number[];
}
export interface Loadout { mounts: MountSpec[]; signatures: SignatureMatch[];
  stats: { speedMul: number; pickupRadius: number; regenPerSec: number } }
export type Drop = { type: 'part'; part: PartId } | { type: 'forge' } | { type: 'repair' } | { type: 'scrap'; n: number };
export interface SpawnEvent { kind: EnemyKind; count: number }
export interface SaveData { version: 1; discovered: SignatureId[]; blueprints: PartId[];
  bestRun: { timeMs: number; kills: number } | null; runs: number }
```

### Order and pace (user decision, 2026-10-29)

**The task order is fixed. The timeline is not.** The user wants this finished much faster than the original Fri/Sat blocks, using every available resource. Go straight from one task to the next with no idle gaps, and treat the hard deadline (Sat 2026-10-31 ~22:00) only as a ceiling.

| Stage | Tasks | Exit check |
|---|---|---|
| 1. Pure core | 1–7 | `npm test` is green; the 15 signature diagrams are all recognised |
| 2. Core loop | 8–14 | **Checkpoint A: the core loop is playable.** Fly, kill, bolt on, every part works, the full swarm runs, and the Forge works. Report to the user |
| 3. Signatures | 15–17 | All 15 signatures fire and announce |
| 4. Hooks and platform | 18–21 | **Checkpoint B: feature complete**, including the hooks, phone controls and juice. Report to the user |
| 5. Ship | 22–23 | Tuned and verified. The `dist/` is handed to the user for the GitHub Pages deploy |
| 6. Writeup | 24 | Writeup draft delivered for the user to edit |

**Execution: Native (user decision).** Claude implements the tasks in the main session using superpowers:executing-plans, with one fresh reviewer over the whole game at the end. To go faster, hand self-contained work that doesn't touch the main thread's files to **parallel background agents**. Each one gets a narrow brief naming the exact interface from this plan:
- **During stage 1 or 2:**
  - draft the 15 AI-analyst quips (Task 5 data)
  - `src/game/Audio.ts` (Task 21: the SFX synth and the music loop, against the `Audio` interface)
  - `src/game/snapshot.ts` (Task 19, against `renderSnapshot` and `PART_SHAPES`)
  - the writeup sections that don't depend on playtest data: Pitch, Money, Shipping, Reference games, and AI-as-build-tool (Task 24)
- **Any time after Task 8:** a reviewer agent can read finished stages while the main thread moves on.

The main thread integrates and verifies everything an agent produces. Never trust an agent's report without running the tests and the browser check.

If the hard deadline comes under threat, cut Task 21 Step 4 (the music loop and SFX variety) and nothing else. Raise any other overrun with the user immediately.

### Browser verification tooling (checked 2026-10-29)

- **Primary: the Claude-in-Chrome extension, running in the user's signed-in Brave browser.** Verified 2026-10-29: Brave 156 / Chromium 156, with WebGL2, WebAudio and localStorage all available. Always open a new tab in the session's own tab group, never reuse the user's tabs, and close test tabs when done. Brave's fingerprint protection may add invisible noise to canvas readback; that's harmless for the PNG export, but don't pixel-compare snapshots. Use it for navigation, screenshots, console reads and `window.__modular` calls via `javascript_tool`.
  - **Phone checks:** `resize_window` to 390×844 (portrait) and 844×390 (landscape), plus the `?touch=1` flag (Task 20 makes `main.ts` force `Input.isTouch` and the touch UI when it's present). Mouse pointer events drive the same Phaser pointer code as touch.
  - **Performance:** `__modular.state().fps`, sampled over 10 s via `javascript_tool`. Every "DevTools performance" or "DevTools emulation" check below means this.
- **Not available:** the Chrome DevTools MCP can't find a Chrome install on this machine.
- **Fallback if the extension is unavailable:**
  - Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`), launched with `--remote-debugging-port=9222`, driven via `playwright-core`'s `chromium.connectOverCDP`. Add `playwright-core` as a devDependency only if this is needed.
  - A Playwright Chromium is also installed under `%LOCALAPPDATA%\ms-playwright\chromium-1248`.

---

## Task 1: Scaffold and sub-path build

**Files:**
- Create: `q1-game/package.json`, `q1-game/tsconfig.json`, `q1-game/vite.config.ts`, `q1-game/index.html`, `q1-game/src/main.ts`, `q1-game/src/scenes/BootScene.ts`, `q1-game/tests/core/smoke.test.ts`

**Interfaces:**
- Produces:
  - npm scripts `dev`, `build`, `preview`, `test`, `typecheck`.
  - `main.ts` exports nothing and boots `Phaser.Game` with `BootScene`.

- [ ] **Step 1:** Create `package.json`:
  - `"type": "module"`.
  - devDependencies exactly `typescript@5.9.3`, `vite@7.3.7`, `vitest@3.2.7`; dependency `phaser@3.90.0`.
  - Scripts:
    - `"dev": "vite"`
    - `"build": "tsc --noEmit && vite build"`
    - `"preview": "vite preview"`
    - `"test": "vitest run"`
    - `"typecheck": "tsc --noEmit"`
- [ ] **Step 2:** Create `tsconfig.json` with `strict: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `noUnusedLocals: true`, and `include: ["src", "tests"]`.
- [ ] **Step 3:** Create `vite.config.ts` with:
  - `base: './'`
  - `build.outDir: 'dist'`
  - `build.chunkSizeWarningLimit: 2000`
  - `test.environment: 'node'`
  - `test.include: ['tests/**/*.test.ts']`
- [ ] **Step 4:** Create `index.html` (title "MODULAR", a black body, no margins, `<div id="game">`, `touch-action: none`, `<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">`) and `main.ts`:
  - `type: Phaser.AUTO`
  - `backgroundColor: '#000'`
  - `scale: { mode: Phaser.Scale.RESIZE, parent: 'game', width: '100%', height: '100%' }`
  - `BootScene` draws "MODULAR" centred in cyan.
- [ ] **Step 5:** Write `tests/core/smoke.test.ts`: `expect(1 + 1).toBe(2)`.
- [ ] **Step 6:** Run `cd q1-game && npm install && npm test && npm run build`. Expected: 1 test passes and `dist/index.html` exists.
- [ ] **Step 7:** Run `npx vite preview --base /modular/ --port 4173` and open `http://localhost:4173/modular/` in the browser (the Claude-in-Chrome extension). Expected: "MODULAR" renders, the console has no errors, and the network requests have no 404s.

## Task 2: Types, part data and ShipGrid

**Files:**
- Create: `src/core/types.ts` (as above), `src/core/math.ts`, `src/data/parts.ts`, `src/core/grid.ts`, `tests/core/grid.test.ts`, `tests/core/purity.test.ts`

**Interfaces:**
- Produces:
  - `DIR_VEC: Record<Dir, Cell>`
  - `reflect(dir: Dir, orient: MirrorOrient): Dir`
  - `clampDt(ms: number): number` (max 50)
  - `cellKey(c: Cell): string`
  - `PARTS: Record<PartId, PartDef>`, where `PartDef = { id; name; family: Family; aim: AimClass; trait: TraitId | null; isModifier: boolean; routes: boolean }`. `routes` is true for cockpit, pulse, beam, needle, cryo and thruster.
  - `class ShipGrid`:
    - `static RADIUS = 3`
    - `constructor()` (cockpit uid 0 at (0,0) facing 0)
    - `static fromJSON(j: ShipJSON): ShipGrid`
    - `toJSON(): ShipJSON`
    - `clone(): ShipGrid`
    - `get(x: number, y: number): PlacedPart | undefined`
    - `byUid(uid: number): PlacedPart | undefined`
    - `parts(): PlacedPart[]`
    - `count(): number`
    - `attach(id: PartId, contact: Cell, point: { x: number; y: number }): PlacedPart | null`
    - `place(id: PartId, cell: Cell, facing: Dir, orient?: MirrorOrient): PlacedPart | null`
    - `move(uid: number, to: Cell): boolean`
    - `rotate(uid: number): boolean`
    - `jettison(uid: number): boolean`
    - `disconnected(): PlacedPart[]`
    - `isValid(): boolean`
- Part data: names, families, aim classes and traits are copied from design §10. Cockpit: family `core`, aim `fixed`, trait `null`.

- [ ] **Step 1: Write failing tests** in `tests/core/grid.test.ts`:

```ts
test('new grid has only the cockpit', () => {
  const g = new ShipGrid();
  expect(g.parts()).toEqual([{ uid: 0, id: 'cockpit', x: 0, y: 0, facing: 0 }]);
});
test('attach on the top side lands above and faces up', () => {
  const p = new ShipGrid().attach('pulse', { x: 0, y: 0 }, { x: 0.1, y: -0.6 })!;
  expect([p.x, p.y, p.facing]).toEqual([0, -1, 0]);
});
test('attach on the right side faces right', () => {
  const p = new ShipGrid().attach('beam', { x: 0, y: 0 }, { x: 0.6, y: 0.1 })!;
  expect([p.x, p.y, p.facing]).toEqual([1, 0, 1]);
});
test('occupied target picks nearest free neighbour of the contacted cell', () => {
  const g = new ShipGrid(); g.place('pulse', { x: 0, y: -1 }, 0);
  const p = g.attach('lens', { x: 0, y: 0 }, { x: 0.2, y: -0.6 })!;
  expect([p.x, p.y, p.facing]).toEqual([1, 0, 1]);
});
test('returns null when every neighbour is occupied or out of bounds', () => {
  const g = new ShipGrid();
  for (const [x, y] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) g.place('bulwark', { x, y }, 0);
  expect(g.attach('pulse', { x: 0, y: 0 }, { x: 0, y: -0.6 })).toBeNull();
  const h = new ShipGrid();
  for (let y = -1; y >= -3; y--) h.place('bulwark', { x: 0, y }, 0);
  const edge = h.attach('pulse', { x: 0, y: -3 }, { x: 0, y: -3.6 })!; // (0,-4) out of bounds
  expect(Math.abs(edge.x)).toBe(1); expect(edge.y).toBe(-3);
});
test('two attaches at the same spot never overlap', () => {
  const g = new ShipGrid();
  const a = g.attach('pulse', { x: 0, y: 0 }, { x: 0, y: -0.6 })!;
  const b = g.attach('lens', { x: 0, y: 0 }, { x: 0, y: -0.6 })!;
  expect(`${a.x},${a.y}`).not.toBe(`${b.x},${b.y}`);
});
test('mirror attaches with "/" and rotate toggles it', () => {
  const g = new ShipGrid(); const m = g.attach('mirror', { x: 0, y: 0 }, { x: 0, y: -0.6 })!;
  expect(m.orient).toBe('/'); g.rotate(m.uid); expect(g.byUid(m.uid)!.orient).toBe('\\');
});
test('rotate cycles facing; cockpit cannot rotate, move or jettison', () => {
  const g = new ShipGrid(); const p = g.place('pulse', { x: 0, y: -1 }, 3)!;
  g.rotate(p.uid); expect(g.byUid(p.uid)!.facing).toBe(0);
  expect(g.rotate(0)).toBe(false); expect(g.move(0, { x: 1, y: 1 })).toBe(false); expect(g.jettison(0)).toBe(false);
});
test('move rejects occupied and out-of-bounds cells, allows disconnection', () => {
  const g = new ShipGrid(); const p = g.place('pulse', { x: 0, y: -1 }, 0)!;
  expect(g.move(p.uid, { x: 0, y: 0 })).toBe(false);
  expect(g.move(p.uid, { x: 4, y: 0 })).toBe(false);
  expect(g.move(p.uid, { x: 2, y: 2 })).toBe(true);
  expect(g.disconnected().map(q => q.uid)).toEqual([p.uid]); expect(g.isValid()).toBe(false);
});
test('JSON round-trip preserves layout', () => {
  const g = new ShipGrid(); g.place('mirror', { x: 0, y: -1 }, 0, '\\'); g.place('beam', { x: 1, y: 0 }, 1);
  expect(ShipGrid.fromJSON(g.toJSON()).toJSON()).toEqual(g.toJSON());
});
test('reflect table', () => {
  expect([0, 1, 2, 3].map(d => reflect(d as Dir, '/'))).toEqual([1, 0, 3, 2]);
  expect([0, 1, 2, 3].map(d => reflect(d as Dir, '\\'))).toEqual([3, 2, 1, 0]);
});
```

`tests/core/purity.test.ts` reads every file in `src/core/` with `fs` and asserts that none matches `/from ['"]phaser['"]|\bwindow\.|\bdocument\./`.

- [ ] **Step 2:** Run `npm test -- grid purity`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement `types.ts`, `math.ts`, `parts.ts` and `grid.ts`. In `attach`:
  - Candidates are the 4 orthogonal neighbours of `contact` that are free and within radius.
  - Pick the one with the smallest squared distance to `point`. Break ties in the order up, right, down, left.
  - `facing` is the direction from `contact` to the chosen cell.
  - uids increment from 1.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.

## Task 3: Touch traits

**Files:**
- Create: `src/core/traits.ts`, `tests/core/traits.test.ts`

**Interfaces:**
- Consumes: `ShipGrid`, `PARTS`.
- Produces: `computeTraits(grid: ShipGrid): Map<number, TraitId[]>` (keyed by uid, deduplicated, in neighbour order up, right, down, left).

- [ ] **Step 1: Write failing tests:**

```ts
test('touching parts exchange traits both ways', () => {
  const g = new ShipGrid(); const p = g.place('pulse', { x: 0, y: -1 }, 0)!; const b = g.place('bomb', { x: 1, y: -1 }, 1)!;
  const t = computeTraits(g); expect(t.get(b.uid)).toEqual(['shrapnel']); expect(t.get(p.uid)).toEqual(['warhead']);
});
test('cockpit receives but gives nothing', () => {
  const g = new ShipGrid(); const p = g.place('pulse', { x: 0, y: -1 }, 0)!;
  const t = computeTraits(g); expect(t.get(0)).toEqual(['shrapnel']); expect(t.get(p.uid)).toEqual([]);
});
test('same trait twice does not stack', () => {
  const g = new ShipGrid(); g.place('pulse', { x: 1, y: -1 }, 0); const m = g.place('mirror', { x: 1, y: 0 }, 0)!; g.place('pulse', { x: 1, y: 1 }, 2);
  expect(computeTraits(g).get(m.uid)).toEqual(['shrapnel']);
});
test('diagonal parts do not touch', () => {
  const g = new ShipGrid(); g.place('pulse', { x: 0, y: -1 }, 0); const b = g.place('bomb', { x: 1, y: 0 }, 1)!;
  expect(computeTraits(g).get(b.uid)).toEqual([]);
});
```

- [ ] **Step 2:** Run `npm test -- traits`. Expected: FAIL.
- [ ] **Step 3:** Implement `computeTraits`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.

## Task 4: Line of fire

**Files:**
- Create: `src/core/lines.ts`, `tests/core/lines.test.ts`

**Interfaces:**
- Consumes: `ShipGrid`, `PARTS`, `DIR_VEC`, `reflect`.
- Produces: `MAX_BRANCHES = 8` and `traceLines(grid: ShipGrid, uid: number): Route[]`.
  - Returns `[]` for parts with `routes === false`.
  - Otherwise returns one `Route` per branch, flattened. Each route's `steps` lists the line modifiers from the source to that branch's exit, in order.
  - `path` contains the source cell plus every cell traversed.
  - `exit.cell` is the last occupied cell on the branch.
  - `damageMul` is 0.7 to the power of the number of mirrors passed.

Algorithm (a branch walk, since the signature and tests leave the loop handling open):

```
walk(cell, dir, steps, path, mul, visited):
  next = cell + DIR_VEC[dir]
  part = grid.get(next)
  if !part or visited.has(key(next,dir)) or next is the source cell: emit Route(exit={cell,dir}); return
  visited.add(key(next,dir)); path += next
  if part.id == 'mirror':
     walk(next, dir,                        steps+[{mirror, turned:false}], path, mul*0.7, visited)   // straight half
     walk(next, reflect(dir, part.orient),  steps+[{mirror, turned:true }], path, mul*0.7, visited)   // turned half
  else: walk(next, dir, PARTS[part.id].isModifier ? steps+[part] : steps, path, mul, visited)
stop emitting once MAX_BRANCHES routes exist.
```

`visited` is shared across the whole trace.

- [ ] **Step 1: Write failing tests:**

```ts
const beamUp = () => { const g = new ShipGrid(); const b = g.place('beam', { x: 0, y: -1 }, 0)!; return { g, b }; };
test('empty line exits at the source', () => {
  const { g, b } = beamUp(); const r = traceLines(g, b.uid);
  expect(r).toHaveLength(1); expect(r[0].steps).toEqual([]); expect(r[0].exit).toEqual({ cell: { x: 0, y: -1 }, dir: 0 }); expect(r[0].damageMul).toBe(1);
});
test('modifiers in order; non-modifiers transparent; gaps stop the line', () => {
  const { g, b } = beamUp(); g.place('bulwark', { x: 0, y: -2 }, 0); g.place('lens', { x: 0, y: -3 }, 0);
  expect(traceLines(g, b.uid)[0].steps.map(s => s.partId)).toEqual(['lens']);
  const h = new ShipGrid(); const c = h.place('beam', { x: 1, y: 0 }, 0)!; h.place('lens', { x: 1, y: -2 }, 0); // (1,-1) empty
  expect(traceLines(h, c.uid)[0].steps).toEqual([]);
});
test('mirror splits into straight and turned branches at 0.7', () => {
  const { g, b } = beamUp(); g.place('mirror', { x: 0, y: -2 }, 0, '/'); g.place('lens', { x: 1, y: -2 }, 0);
  const r = traceLines(g, b.uid);
  expect(r).toHaveLength(2);
  const straight = r.find(x => x.exit.dir === 0)!, turned = r.find(x => x.exit.dir === 1)!;
  expect(straight.damageMul).toBeCloseTo(0.7); expect(turned.steps.map(s => s.partId)).toEqual(['mirror', 'lens']);
  expect(turned.steps[0].turned).toBe(true); expect(turned.exit.cell).toEqual({ x: 1, y: -2 });
});
test('backslash mirror turns up-travel to the left', () => {
  const { g, b } = beamUp(); g.place('mirror', { x: 0, y: -2 }, 0, '\\');
  expect(traceLines(g, b.uid).map(r => r.exit.dir).sort()).toEqual([0, 3]);
});
test('order is preserved: lens then mirror', () => {
  const { g, b } = beamUp(); g.place('lens', { x: 0, y: -2 }, 0); g.place('mirror', { x: 0, y: -3 }, 0);
  expect(traceLines(g, b.uid)[0].steps.map(s => s.partId)).toEqual(['lens', 'mirror']);
});
test('mirror square terminates within the branch cap', () => {
  const g = new ShipGrid(); const b = g.place('beam', { x: 0, y: -1 }, 0)!;
  g.place('mirror', { x: 0, y: -2 }, 0, '/'); g.place('mirror', { x: 1, y: -2 }, 0, '\\');
  g.place('mirror', { x: 1, y: -1 }, 0, '/'); g.place('mirror', { x: 1, y: 0 }, 0, '\\');
  const r = traceLines(g, b.uid); expect(r.length).toBeGreaterThan(0); expect(r.length).toBeLessThanOrEqual(MAX_BRANCHES);
});
test('thruster routes along its facing; emitters and utility do not route', () => {
  const g = new ShipGrid(); const t = g.place('thruster', { x: 0, y: 1 }, 2)!; g.place('lens', { x: 0, y: 2 }, 0);
  expect(traceLines(g, t.uid)[0].steps.map(s => s.partId)).toEqual(['lens']);
  expect(traceLines(g, g.place('bomb', { x: 1, y: 0 }, 1)!.uid)).toEqual([]);
});
```

- [ ] **Step 2:** Run `npm test -- lines`. Expected: FAIL.
- [ ] **Step 3:** Implement `traceLines` as above.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.

## Task 5: Signature data and recogniser

**Files:**
- Create: `src/data/signatures.ts`, `src/core/recogniser.ts`, `tests/core/recogniser.test.ts`

**Interfaces:**
- Consumes: `ShipGrid`, `traceLines`, `PARTS`.
- Produces:
  - `SignatureDef = { id; index: number; name: string; recipe: string; quip: string; keyPart: PartId; colour: number; supersedes: SignatureId[]; dedicated: boolean; diagram: ShipJSON }`
  - `SIGNATURES: SignatureDef[]` (ordered by design §11, indices 1–15) and `SIG_BY_ID: Record<SignatureId, SignatureDef>`
  - `recognise(grid: ShipGrid): SignatureMatch[]` (deduplicated by id + uids, overlaps suppressed)

**Recipes** (from design §11; S = source, M = modifier):

| Kind | Rule |
|---|---|
| Line | `routes(S)` has a route whose `steps[0].partId === M`. Participants: S plus that step's uid |
| Touch | The two parts are orthogonal neighbours. Participants: both |

| Signature | Rule |
|---|---|
| `splitBeam` | Line, beam → mirror |
| `slugRound` | Line, pulse → lens |
| `halo` | Line, beam → orbit |
| `gravitySling` | Line, pulse or needle → orbit |
| `afterburnerLance` | Line, thruster → lens |
| `trident` | Line, beam → prism |
| `resonator` | Beam route where `steps[0]` and `steps[1]` are mirrors, `steps[0].turned === false`, the cells are adjacent and the orients differ. Participants: beam plus both mirrors |
| `hallOfMirrors` | Beam whose step-0 is a mirror, with ≥2 distinct mirror uids across all its routes, and no `resonator` for that beam. Participants: beam plus all mirrors |
| `clusterShell` | Touch, bomb + (pulse or needle) |
| `shatterstorm` | Touch, cryo + (pulse or needle) |
| `jumpstart` | Touch, arc + repair |
| `coinSlinger` | Touch, magnet + (pulse or needle) |
| `stormSeed` | Touch, arc + bomb |
| `porcupine` | Touch, magnet + bulwark |
| `grandFinale` | Bomb A touching bomb B, a pulse touching A or B, and an echo touching A or B. Participants: all four |

- **Supersedes:** `resonator: ['splitBeam']`, `hallOfMirrors: ['splitBeam']`, `grandFinale: ['clusterShell']`.
- **Suppression:** drop match A when some match B exists with `SIG_BY_ID[B.id].supersedes.includes(A.id)` and every uid of A is in B.
- **Dedicated:** `true` for resonator, shatterstorm, jumpstart, stormSeed, porcupine and grandFinale.

**Diagram layouts** (facing in brackets, mirrors with orient):

| # | Signature | Layout |
|---|---|---|
| 1 | Split Beam | beam (0,−1)[0], mirror (0,−2) '/' |
| 2 | Cluster Shell | bomb (0,−1)[0], pulse (1,−1)[1] |
| 3 | Hall of Mirrors | beam (0,−1)[0], mirror (0,−2) '/', mirror (0,−3) '/' |
| 4 | Slug Round | pulse (0,−1)[0], lens (0,−2) |
| 5 | Halo | beam (0,−1)[0], orbit (0,−2) |
| 6 | Gravity Sling | pulse (0,−1)[0], orbit (0,−2) |
| 7 | Afterburner Lance | thruster (0,1)[2], lens (0,2) |
| 8 | Resonator | beam (0,−1)[0], mirror (0,−2) '/', mirror (0,−3) '\' |
| 9 | Trident | beam (0,−1)[0], prism (0,−2) |
| 10 | Shatterstorm | cryo (1,0)[1], pulse (1,−1)[0] |
| 11 | Jumpstart | arc (1,0)[1], repair (2,0)[1] |
| 12 | Coin Slinger | pulse (0,−1)[0], magnet (1,−1)[1] |
| 13 | Storm Seed | arc (−1,0)[3], bomb (−2,0)[3] |
| 14 | Porcupine | bulwark (0,1)[2], magnet (1,1)[1] |
| 15 | Grand Finale | bomb (−1,0)[3], bomb (−2,0)[3], pulse (−1,−1)[0], echo (−2,1)[2] |

- **Quips:** write one line per signature in the onboard-AI voice: clipped, clinical, faintly impressed, at most 90 characters. The example for Split Beam is "Photon path bifurcated by reflective xenoglass. Recommend: do it again." All 15 go to the user for review in the Task 24 handover.
- **Colours:** each signature gets a distinct flourish colour that differs from every part's family colour.

- [ ] **Step 1: Write failing tests:**

```ts
test.each(SIGNATURES.map(s => [s.id, s] as const))('diagram for %s is recognised', (id, s) => {
  expect(recognise(ShipGrid.fromJSON(s.diagram)).map(m => m.id)).toContain(id);
});
test('data sanity: 15 signatures, indices 1..15, unique ids', () => {
  expect(SIGNATURES.map(s => s.index)).toEqual([...Array(15)].map((_, i) => i + 1));
});
test('resonator suppresses split beam and is not hall of mirrors', () => {
  const ids = recognise(ShipGrid.fromJSON(SIG_BY_ID.resonator.diagram)).map(m => m.id);
  expect(ids).toEqual(['resonator']);
});
test('hall of mirrors suppresses split beam', () => {
  expect(recognise(ShipGrid.fromJSON(SIG_BY_ID.hallOfMirrors.diagram)).map(m => m.id)).toEqual(['hallOfMirrors']);
});
test('grand finale suppresses its own cluster shells but not an unrelated one', () => {
  const g = ShipGrid.fromJSON(SIG_BY_ID.grandFinale.diagram);
  expect(recognise(g).map(m => m.id)).toEqual(['grandFinale']);
  g.place('bomb', { x: 1, y: 0 }, 1); g.place('needle', { x: 2, y: 0 }, 1);
  expect(recognise(g).map(m => m.id).sort()).toEqual(['clusterShell', 'grandFinale']);
});
test('unnamed results are not signatures', () => {
  const g = new ShipGrid(); g.place('needle', { x: 0, y: -1 }, 0); g.place('lens', { x: 0, y: -2 }, 0);
  expect(recognise(g)).toEqual([]);
});
test('a line signature needs the modifier first in the line', () => {
  const g = new ShipGrid(); g.place('beam', { x: 0, y: -1 }, 0); g.place('lens', { x: 0, y: -2 }, 0); g.place('mirror', { x: 0, y: -3 }, 0);
  expect(recognise(g)).toEqual([]);
});
test('two beams with mirrors give two split beam matches', () => {
  const g = ShipGrid.fromJSON(SIG_BY_ID.splitBeam.diagram); g.place('beam', { x: 1, y: 0 }, 1); g.place('mirror', { x: 2, y: 0 }, 0, '/');
  expect(recognise(g).filter(m => m.id === 'splitBeam')).toHaveLength(2);
});
```

- [ ] **Step 2:** Run `npm test -- recogniser`. Expected: FAIL.
- [ ] **Step 3:** Implement `signatures.ts` (data and quips) and `recognise`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS, including all 15 diagram cases.

## Task 6: Shot compiler and loadout

**Files:**
- Create: `src/data/tuning.ts` (weapon section), `src/core/shot.ts`, `src/core/loadout.ts`, `tests/core/shot.test.ts`, `tests/core/loadout.test.ts`

**Interfaces:**
- Consumes: `computeTraits`, `traceLines`, `recognise`, `PARTS`, `SIG_BY_ID`.
- Produces:
  - `MAX_VOLLEY = 48`
  - `baseShot(id: PartId): ShotSpec | null`
  - `applyTraits(s: ShotSpec, t: TraitId[]): ShotSpec`
  - `applyModifier(s: ShotSpec, id: PartId): ShotSpec`
  - `compileShot(id: PartId, traits: TraitId[], route: Route | null, power: number): ShotSpec | null` (base → traits → each route step in order → `damage *= route.damageMul * power` → clamp `count` so `count * (1 + echoes.length) * (twin ? 2 : 1) <= MAX_VOLLEY`)
  - `compileLoadout(grid: ShipGrid): Loadout`
  - `TUNING.weapons[id].fireRate` (shots per second; 0 for continuous)

**Base shots** (`TUNING.weapons`; damage is per bolt, or per second for continuous shapes):

| Part | Shape | Damage | Fire rate (/s) | Speed | Range | Width |
|---|---|---|---|---|---|---|
| cockpit | bolt | 6 | 3 | 520 | 520 | 3 |
| pulse | bolt | 10 | 4 | 600 | 600 | 4 |
| beam | beam | 30 | – | – | 220 | 6 |
| needle | bolt | 6 | 5 | 700 | 450 | 2 |
| cryo | bolt | 8 | 2 | 450 | 450 | 4 |
| thruster | flame | 12 | – | – | 60 | 10 |
| bomb | burst (radius 70) | 40 | 1/3 | 260 | 380 | 70 |
| arc | chain (3 hops, 160 px) | 14 | 1/1.2 | – | 160 | 3 |

All other parts return `null`. Every base shot has `count 1`, `spreadDeg 0`, `pierce 0`, `fuse 1`, `orbit false`, `echoes []`, `extraShards 0`, `twin false`, `effects []` and `power 1`.

**Modifiers in a line** (continuous = beam, ring, flame, lance):

| Modifier | On bolts | On continuous shapes |
|---|---|---|
| lens | If `count >= 3`: count→1, damage ×count×1.33, pierce 99, width ×2. Otherwise: fuse ×3, damage ×4, pierce 99, width ×2, speed ×0.7 | beam: width ×0.5, damage ×2, range ×1.5. flame: shape→lance, range ×3, damage ×3. ring and lance: damage ×1.5 |
| orbit | orbit = true | beam and flame: shape→ring, range→90 |
| prism | count ×3, spreadDeg +30, damage ×0.6 | count ×3, spreadDeg +30, damage ×0.6 |
| echo | push `{delay: 0.25, mul: 1}` | damage ×1.6, width ×1.3 |
| mirror | no-op (the router handles it) | no-op |

**Traits** (any shape):

| Trait | Effect |
|---|---|
| focus | damage ×1.2 |
| pierce | bolt: pierce +1. Otherwise range ×1.15 |
| twin | bolt and burst: twin = true. Otherwise ×1.15 damage |
| echo | bolt and burst: push `{delay: 0.4, mul: 0.6}`. Otherwise ×1.15 damage |
| split | bolt and burst: extraShards +2. Otherwise ×1.15 damage |
| shrapnel, warhead, bounce, orbit, pull | bolt and burst: add to `effects`. Otherwise ×1.15 damage |
| charge, chill, ignite, harden, mend | add to `effects` for every shape |

**Loadout:**
- **Mounts:** one per part with `baseShot !== null`. Shots:
  - Routed parts: one `{route, spec}` per `traceLines` route.
  - Emitters: one with `route: null`.
  - Also one mount per modifier or utility part with `shots: []`, so the runtime has an "alone" behaviour.
- **Power:** 1.5 for any mount whose uid appears in a signature match, otherwise 1. `signatures` lists those match ids.
- **Payload:** a bomb mount's `payload` is the first adjacent part in the order pulse, needle, cryo; otherwise `null`.
- **Feeds:** a magnet mount's `feeds` lists adjacent uids whose part is pulse, needle, cryo or cockpit.
- **Stats:**
  - `speedMul = min(1.6, 1 + 0.15 × thrusters)`
  - `pickupRadius = min(220, 40 + 60 × magnets)`
  - `regenPerSec = 0.2 × repairNodes`

- [ ] **Step 1: Write failing tests:**

```ts
const route = (...ids: PartId[]): Route => ({ sourceUid: 1, steps: ids.map((partId, i) => ({ uid: 10 + i, partId, cell: { x: 0, y: -2 - i } })), path: [], exit: { cell: { x: 0, y: 0 }, dir: 0 }, damageMul: 1 });
test('pulse → lens fuses over time', () => { const s = compileShot('pulse', [], route('lens'), 1)!; expect([s.fuse, s.damage, s.pierce]).toEqual([3, 40, 99]); });
test('order matters: prism→lens is one slug, lens→prism is a fan', () => {
  expect(compileShot('pulse', [], route('prism', 'lens'), 1)!.count).toBe(1);
  expect(compileShot('pulse', [], route('lens', 'prism'), 1)!.count).toBe(3);
});
test('beam → lens narrows and doubles', () => { const s = compileShot('beam', [], route('lens'), 1)!; expect([s.width, s.damage]).toEqual([3, 60]); });
test('exhaust → lens becomes a lance', () => { const s = compileShot('thruster', [], route('lens'), 1)!; expect([s.shape, s.range, s.damage]).toEqual(['lance', 180, 36]); });
test('beam → orbit becomes a ring; beam → prism is a trident', () => {
  expect(compileShot('beam', [], route('orbit'), 1)!.shape).toBe('ring');
  expect(compileShot('beam', [], route('prism'), 1)!.count).toBe(3);
});
test('route damageMul and signature power multiply damage', () => {
  const r = { ...route(), damageMul: 0.7 }; expect(compileShot('pulse', [], r, 1.5)!.damage).toBeCloseTo(10.5);
});
test('traits: focus, pierce, flags; never harmful', () => {
  const s = compileShot('pulse', ['focus', 'pierce', 'charge', 'shrapnel'], null, 1)!;
  expect([s.damage, s.pierce]).toEqual([12, 1]); expect(s.effects).toEqual(expect.arrayContaining(['charge', 'shrapnel']));
  for (const t of ['shrapnel', 'pierce', 'twin', 'warhead', 'charge', 'chill', 'bounce', 'focus', 'orbit', 'echo', 'split', 'ignite', 'pull', 'harden', 'mend'] as TraitId[])
    for (const id of ['pulse', 'beam', 'thruster', 'bomb'] as PartId[]) expect(compileShot(id, [t], null, 1)!.damage).toBeGreaterThanOrEqual(baseShot(id)!.damage);
});
test('volley cap holds under prism × prism × echo × twin', () => {
  const s = compileShot('pulse', ['twin', 'echo'], route('prism', 'prism', 'prism', 'echo', 'echo'), 1)!;
  expect(s.count * (1 + s.echoes.length) * (s.twin ? 2 : 1)).toBeLessThanOrEqual(MAX_VOLLEY);
});
```

`tests/core/loadout.test.ts`:

```ts
test('split beam diagram: beam has 2 routes, power 1.5, signature listed', () => {
  const m = compileLoadout(ShipGrid.fromJSON(SIG_BY_ID.splitBeam.diagram)).mounts.find(x => x.partId === 'beam')!;
  expect(m.shots).toHaveLength(2); expect(m.signatures).toEqual(['splitBeam']); expect(m.shots[0].spec.power).toBe(1.5);
});
test('bomb payload and magnet feeds', () => {
  const L = compileLoadout(ShipGrid.fromJSON(SIG_BY_ID.clusterShell.diagram));
  expect(L.mounts.find(x => x.partId === 'bomb')!.payload).toBe('pulse');
  const C = compileLoadout(ShipGrid.fromJSON(SIG_BY_ID.coinSlinger.diagram));
  expect(C.mounts.find(x => x.partId === 'magnet')!.feeds).toHaveLength(1);
});
test('stats from utility parts, capped', () => {
  const g = new ShipGrid(); for (let x = 1; x <= 3; x++) g.place('thruster', { x, y: 0 }, 1); for (let x = -1; x >= -3; x--) g.place('thruster', { x, y: 0 }, 3);
  expect(compileLoadout(g).stats.speedMul).toBe(1.6);
});
test('cockpit-only loadout has the pea-shooter', () => {
  const L = compileLoadout(new ShipGrid()); expect(L.mounts).toHaveLength(1); expect(L.mounts[0].shots[0].spec.damage).toBe(6);
});
```

- [ ] **Step 2:** Run `npm test -- shot loadout`. Expected: FAIL.
- [ ] **Step 3:** Implement `tuning.ts` (weapons), `shot.ts` and `loadout.ts`. Every apply function returns a new object; never mutate.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.

## Task 7: Save, RNG and directors

**Files:**
- Create: `src/core/save.ts`, `src/core/rng.ts`, `src/core/director.ts`, `src/data/enemies.ts`, `tuning.ts` (director and drops sections), `tests/core/save.test.ts`, `tests/core/director.test.ts`

**Interfaces:**
- Produces:
  - Save:
    - `SAVE_KEY = 'modular.save.v1'`
    - `defaultSave(): SaveData`
    - `loadSave(storage: Pick<Storage,'getItem'> | null): SaveData`
    - `writeSave(s: SaveData, storage: Pick<Storage,'setItem'> | null): boolean`
    - `recordDiscovery(s: SaveData, id: SignatureId): { save: SaveData; isNew: boolean; blueprint: PartId | null }` (`blueprint` is the newly unlocked key part, or null if already unlocked)
    - `recordRun(s: SaveData, run: { timeMs: number; kills: number }): SaveData`
  - RNG:
    - `type Rng = () => number`
    - `mulberry32(seed: number): Rng`
    - `pick<T>(rng: Rng, items: T[], weights?: number[]): T`
    - `range(rng: Rng, lo: number, hi: number): number`
  - Directors:
    - `class SpawnDirector { constructor(rng: Rng); update(dtMs: number): SpawnEvent[]; elapsedMs: number; hpMul(): number; static maxEventsPerUpdate = 8 }`
    - `class DropPacer { constructor(rng: Rng, seeded: boolean); onKill(kind: EnemyKind, nowMs: number): Drop[] }`
  - Enemies: `ENEMIES: Record<EnemyKind, { hp; speed; radius; contactDamage; scrap: number }>`

**Tuning values** (starting points from design §12; to be tuned in Task 22):

- **Enemies:**

  | Kind | HP | Speed | Radius | Contact damage | Scrap |
  |---|---|---|---|---|---|
  | mote | 6 | 70 | 5 | 4 | 1 |
  | drone | 18 | 110 | 9 | 8 | 2 |
  | spitter | 30 | 80 | 11 | 6 | 3 |
  | lancer | 40 | 90 | 12 | 15 | 3 |
  | carrier | 600 | 45 | 40 | 20 | 20 |

  - Spitters keep a distance of 260 px and fire one bullet every 2.2 s (speed 160, damage 8).
  - Lancers telegraph for 0.7 s, then dash at 600 px/s for 0.5 s.
- **Spawning:**
  - Spawn budget: `1.0 + 0.6 × (t / 60s)` cost units per second.
  - Costs: mote pack (6–10 motes) 2, drone 1, spitter 2, lancer 2.5.
  - Weights: drone 50, mote pack 30, spitter 12 (from 60 s), lancer 8 (from 150 s).
  - A Carrier spawns at every 90 s mark, outside the budget.
  - `hpMul = 1 + 0.35 × (t / 90s)`.
- **Drops:**
  - Part drops:
    - Only drone, spitter and lancer kills can drop a part, with a 25% chance per kill.
    - If 20 s pass with no part drop, the next qualifying kill is forced to drop one.
    - No part drop within 8 s of the last one.
    - The first part can't drop before 12 s.
    - Part weights: weapons 45, modifiers 35, utility 20. The same part can't drop 3 times in a row.
  - Seeded runs (`seeded = true` when the Archive is empty): the first four part drops are `beam, mirror, pulse, bomb`.
  - Forge Uplink: from the first kill after a timer of 60–90 s (75 s when seeded). The timer resets after each drop.
  - Carrier kills: 3–4 parts, one forge, and a repair core with 50% chance.
  - Every kill: `scrap n = ENEMIES[kind].scrap`.

- [ ] **Step 1: Write failing tests:**

```ts
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
```

`tests/core/director.test.ts`, where a helper `run(d, ms, step = 100)` collects events:

```ts
test('enemy mix unlocks on schedule', () => {
  const ev = run(new SpawnDirector(mulberry32(1)), 300_000);
  expect(ev.filter(e => e.kind === 'spitter' && e.t < 60_000)).toEqual([]);
  expect(ev.some(e => e.kind === 'spitter' && e.t < 120_000)).toBe(true);
  expect(ev.filter(e => e.kind === 'lancer' && e.t < 150_000)).toEqual([]);
  expect(ev.filter(e => e.kind === 'carrier' && e.t < 185_000)).toHaveLength(2);
});
test('pressure escalates and hp scales', () => {
  const ev = run(new SpawnDirector(mulberry32(2)), 300_000), n = (a: number, b: number) => ev.filter(e => e.t >= a && e.t < b).reduce((s, e) => s + e.count, 0);
  expect(n(240_000, 300_000)).toBeGreaterThan(n(0, 60_000) * 1.5);
  const d = new SpawnDirector(mulberry32(3)); expect(d.hpMul()).toBe(1); d.update(90_000); expect(d.hpMul()).toBeCloseTo(1.35);
});
test('a 60 s frame cannot flood the screen', () => {
  expect(new SpawnDirector(mulberry32(4)).update(60_000).length).toBeLessThanOrEqual(SpawnDirector.maxEventsPerUpdate);
});
test('seeded first run drops beam, mirror, pulse, bomb; pacing holds', () => {
  const p = new DropPacer(mulberry32(5), true); const parts: { t: number; id: PartId }[] = []; let forges: number[] = [];
  for (let t = 1000; t <= 600_000; t += 1000) for (const d of p.onKill('drone', t)) { if (d.type === 'part') parts.push({ t, id: d.part }); if (d.type === 'forge') forges.push(t); }
  expect(parts.slice(0, 4).map(x => x.id)).toEqual(['beam', 'mirror', 'pulse', 'bomb']);
  expect(parts[0].t).toBeGreaterThanOrEqual(12_000);
  for (let i = 1; i < parts.length; i++) { const gap = parts[i].t - parts[i - 1].t; expect(gap).toBeGreaterThanOrEqual(8_000); expect(gap).toBeLessThanOrEqual(21_000); }
  expect(forges[0]).toBe(75_000); expect(forges.length).toBeGreaterThanOrEqual(6); expect(forges.length).toBeLessThanOrEqual(10);
});
test('carrier kill drops 3–4 parts and always a forge', () => {
  const d = new DropPacer(mulberry32(6), false).onKill('carrier', 100_000);
  const n = d.filter(x => x.type === 'part').length; expect(n).toBeGreaterThanOrEqual(3); expect(n).toBeLessThanOrEqual(4);
  expect(d.filter(x => x.type === 'forge')).toHaveLength(1);
});
test('unseeded: never the same part three times in a row; deterministic per seed', () => {
  const seq = (seed: number) => { const p = new DropPacer(mulberry32(seed), false); const out: PartId[] = []; for (let t = 1000; t < 900_000; t += 1000) for (const d of p.onKill('drone', t)) if (d.type === 'part') out.push(d.part); return out; };
  const a = seq(7); for (let i = 2; i < a.length; i++) expect(a[i] === a[i - 1] && a[i] === a[i - 2]).toBe(false);
  expect(seq(7)).toEqual(a);
});
```

- [ ] **Step 2:** Run `npm test -- save director`. Expected: FAIL.
- [ ] **Step 3:** Implement. `SpawnDirector.update` caps events per call; it carries the leftover budget forward and doesn't emit it in bulk.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: everything PASSES. **End of stage 1.**

---

## Task 8: Game shell: flight, pea-shooter, Motes and Drones, hull, death

**Files:**
- Create: `src/core/spatialHash.ts`, `src/core/pool.ts`, `src/data/partShapes.ts`, `src/game/{Ship,Input,Projectiles,EnemySystem,Hud,debug}.ts`, `src/scenes/{GameScene,EndScene}.ts`, `tests/core/runtime-utils.test.ts`
- Modify: `src/scenes/BootScene.ts`, `src/main.ts`

**Interfaces:**
- Produces:
  - `class SpatialHash<T extends { x: number; y: number }> { constructor(cell: number); clear(); insert(o: T); query(x: number, y: number, r: number): T[] }`
  - `class Pool<T> { constructor(cap: number, make: () => T); acquire(): T | null; release(o: T); get active(): number }`
  - `PART_SHAPES: Record<PartId, { pts: [number, number][]; closed: boolean }[]>` (unit cell −0.5..0.5, facing up)
  - `Ship`:
    - `grid: ShipGrid`, `loadout: Loadout`
    - `x, y, heading` (radians), `hull: number`
    - `setGrid(g: ShipGrid)` (recompiles the loadout and redraws)
    - `cellWorld(c: Cell): {x, y}`
    - `worldToLocal(x, y): {x, y}` (in cell units)
    - `hitCells(): { cell: Cell; x: number; y: number; r: number; uid: number }[]`
  - `Input.steer(): { x: number; y: number }` (length ≤ 1)
  - `GameScene` events (`this.events`): `'part-attached'`, `'loadout-changed'`, `'signature-fired'`, `'hull-changed'`, `'run-ended'`
  - `debug.ts`: `installDebug(scene: GameScene)`, defining `window.__modular`:

    ```ts
    {
      state(): { scene; hull; timeMs; kills; parts; enemies; projectiles; fps; discovered: SignatureId[] };
      givePart(id, cell?, facing?);
      loadShip(j: ShipJSON);
      loadCombo(id: SignatureId);
      spawn(kind: EnemyKind, n: number);
      grantForge();
      god(on: boolean);
      timeScale(x: number);
    }
    ```

    Methods are stubbed until their task lands.

- **Behaviour:**
  - **Rendering:**
    - `BootScene` generates one texture per part from `PART_SHAPES`: 2 px stroke in its family colour plus a faint fill, size 26.
    - Enemy textures: mote dot, drone triangle, spitter diamond, lancer long hexagon, carrier big hexagon.
    - `BootScene` then starts `GameScene`.
    - A starfield in two parallax layers.
    - Camera follows the ship, with zoom `clamp(min(w, h) / 720, 0.6, 1.2)`.
  - **Movement:**
    - Ship speed is `220 × speedMul` px/s.
    - The heading turns toward the steer vector at 540°/s and is kept when idle.
  - **Pea-shooter:** fires along the heading via the loadout (it's the only mount for now; full execution lands in Task 10).
  - **Spawning:** the `SpawnDirector` spawns motes and drones only (the full mix lands in Task 13) on a ring 1.2× the half-diagonal of the viewport.
  - **Collisions:** a `SpatialHash` with cell 64 handles enemy↔projectile and enemy↔ship-cell collisions (circle vs circle; cell radius 12).
  - **Damage:**
    - Contact damage has a 0.5 s per-enemy cooldown.
    - Player i-frames last 0.25 s.
    - At hull 0, `'run-ended'` fires and `EndScene` shows a stub with time, kills and "Run again".
  - **Frame step:** `dt = clampDt(delta)` everywhere.
  - **HUD:** a hull bar, a mm:ss timer and the kill count.

- [ ] **Step 1: Write failing tests** in `runtime-utils.test.ts`:

```ts
test('clampDt caps big frames', () => { expect(clampDt(1000)).toBe(50); expect(clampDt(16)).toBe(16); });
test('spatial hash finds only nearby objects', () => {
  const h = new SpatialHash<{ x: number; y: number }>(64); const a = { x: 10, y: 10 }, b = { x: 500, y: 500 };
  h.insert(a); h.insert(b); expect(h.query(0, 0, 30)).toEqual([a]);
});
test('pool never exceeds its cap', () => {
  const p = new Pool(3, () => ({})); const got = [p.acquire(), p.acquire(), p.acquire(), p.acquire()];
  expect(got[3]).toBeNull(); expect(p.active).toBe(3); p.release(got[0]!); expect(p.acquire()).not.toBeNull();
});
```

- [ ] **Step 2:** Run `npm test -- runtime-utils`. Expected: FAIL. Then implement `spatialHash.ts` and `pool.ts`, and re-run. Expected: PASS.
- [ ] **Step 3:** Implement the scenes and game files listed above.
- [ ] **Step 4:** Verify in the browser at `npm run dev` → `http://localhost:5173/?debug=1`:
  - WASD and the arrows steer, and the ship faces its direction of travel.
  - Motes and drones arrive and die to the pea-shooter.
  - `__modular.state().timeMs` increases.
  - `__modular.spawn('mote', 300)` keeps `state().fps >= 55`.
  - Standing still dies, which leads to the End stub, and "Run again" restarts.
  - The console is clean.

## Task 9: Pickups, auto-attach and the visible ship

**Files:**
- Create: `src/game/Pickups.ts`
- Modify: `src/game/Ship.ts`, `src/scenes/GameScene.ts`, `src/game/debug.ts`, `src/game/Hud.ts`

**Interfaces:**
- Consumes: `DropPacer`, `ShipGrid.attach`, `Ship.worldToLocal`, `Ship.hitCells`, `computeTraits`.
- Produces:
  - `Pickups.spawn(drop: Drop, x, y)`
  - `Pickups.update(dt, ship)`
  - Events `'forge-picked'` and `'repair-picked'`
  - `debug.givePart` and `debug.loadShip` are now live.

- **Pickup behaviour:**
  - Kills call `DropPacer.onKill`, and drops appear at the kill position with a small random drift.
  - **Floating parts:**
    - Show the part texture with a pulsing glow ring and a name label on approach.
    - Fade after 10 s, blinking for the last 3 s.
  - **Attaching:**
    - When a part's circle (r 11) overlaps a ship cell, the overlapping cell nearest the part centre is the contacted cell, and `point = worldToLocal(part)`.
    - On success: `grid.attach`, a weld flash, `'part-attached'`, and `Ship.setGrid`.
    - On `null`: the part bounces off (reflected velocity, 0.5 s attach cooldown).
- **Ship rendering:**
  - Each part is drawn rotated to its facing (mirrors by orient).
  - Trait pips: up to 4 small coloured dots on the receiving part, one per received trait. Trait colour = the giving part's family colour.
- **Scrap:**
  - Tiny green motes drift toward the ship inside `pickupRadius` and are counted as `salvage`.
  - Magnet radius visibly grows the collection ring (a faint circle while a magnet is attached).
- **Repair core:** heals 30, capped at 100.
- **Forge Uplink pickup:** emits `'forge-picked'` (wired in Task 14). It looks like a spinning cyan wrench glyph made of lines.
- **Bulwark:** hits landing on its cell deal ×0.6.

- [ ] **Step 1:** Implement the above.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Verify in the browser:
  - Killing drones produces a part drop at about 12–20 s.
  - Flying into it bolts it onto the touched side, facing outward.
  - `__modular.state().parts` increments.
  - Pips appear on touching parts.
  - `__modular.loadShip(...)` with a full 7×7 ring makes new parts bounce off.
  - A hit on a Bulwark cell deals less damage (watch the hull with `god(false)`).

## Task 10: Weapons runtime: aiming classes, all six weapons, statuses

**Files:**
- Create: `src/game/WeaponSystem.ts`, `src/game/Beams.ts`, `src/game/Emitters.ts`, `src/game/Status.ts`
- Modify: `src/game/Projectiles.ts`, `src/game/EnemySystem.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `Loadout`, `MountSpec`, `ShotSpec`, `TUNING.weapons`, `SpatialHash`.
- Produces:
  - `WeaponSystem.rebuild(l: Loadout)`
  - `WeaponSystem.update(dt)`
  - `WeaponSystem.fireSpec(spec: ShotSpec, origin: {x, y}, angle: number, src: { mountUid: number; signatures: SignatureId[] })`, the single entry point that Task 11 and the signature code reuse
  - `Status.apply(enemy, kind: 'charged'|'slow'|'frozen'|'burn', durationMs, magnitude?)`
  - `Status.is(enemy, kind)`
  - Enemy fields `hp`, `x`, `y`, `vx`, `vy`, `status`
  - `EnemySystem.damage(enemy, amount, src)`, which emits `'enemy-killed'` with `(enemy, src)`

- **Aiming:**
  - **Fixed:** world angle = `ship.heading + facing·90° + exitDir delta`, i.e. `exit.dir` rotated by the heading. The shot spawns at the exit cell's world position.
  - **Turret:** aims from the exit cell at the nearest enemy within `spec.range`, and holds fire with no target.
  - **Turret conduit:** faint cyan dashes animate along `route.path` cell centres on each shot.
  - **Emitter:**
    - Bomb Pod lobs a bomb (spec.speed) to the densest 70 px cluster within 380 px; it bursts for `damage` in `width` radius.
    - Arc Coil hops between enemies within `range` up to 3 targets (+1 per pierce), applying `charged` for 4 s.
- **Shapes:**
  - `bolt`: a pooled projectile; `count`/`spreadDeg` give a fan; `fuse` counts triggers per mount.
  - `beam`: a line from the exit, `range` long and `width` wide; damage ticks at 10 Hz to enemies within width/2 + radius.
  - `flame`: same as beam, but a flickering orange cone.
  - `lance`: same as beam, but blue.
  - `ring`: a circle of radius `range` around the ship, damaging enemies touching the ring band.
- **Cryo:** hits apply `slow` (−40%, 2 s); the 3rd hit within 2 s applies `frozen` for 1.5 s (speed 0, ice tint).
- **Status visuals:** charged = cyan crackle tint; slow = blue tint; frozen = white-blue fill; burn = orange flicker, 4 dps for 3 s.
- **Fire rates:** from `TUNING.weapons`, with a random initial phase so parts don't fire in lockstep.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Verify in the browser for each of `pulse`, `beam`, `needle`, `bomb`, `arc` and `cryo`: run `__modular.loadShip({parts:[{id, x:0, y:-1, facing:0}]})` and `spawn('drone', 20)`, then confirm:
  - Fixed weapons fire where the ship points.
  - The needle and cryo turrets track targets.
  - The bomb lobs into clusters.
  - The arc chains and leaves a charged tint.
  - Cryo freezes on the third hit.
  - `state().projectiles <= 600` under `spawn('mote', 300)`.

## Task 11: Line modifiers, traits in play, modifier "alone" behaviours, exhaust

**Files:**
- Modify: `src/game/WeaponSystem.ts`, `src/game/Projectiles.ts`, `src/game/Beams.ts`, `src/game/Emitters.ts`

**Interfaces:**
- Consumes: `ShotSpec` flags, `Route.steps`, `Status`.
- Produces: no new public interface.

**Spec flags, executed at runtime:**

| Flag | What happens |
|---|---|
| `orbit` (line) | Bolts enter a parked ring (radius 48) around the ship, up to 16, and release at the nearest enemy within 120 px. Over the cap, they fire normally |
| `echoes` | Re-fire the same spec after `delay` at `mul` damage |
| `twin` | An extra bolt at 40% damage, offset 6° |
| `extraShards` | Side shards at ±25° and 30% damage |
| `shrapnel` | A bolt that expires or hits splits into 2 small bolts (30% damage) at ±35° |
| `warhead` | End of life → a 30 px blast at 50% damage |
| `bounce` | Ricochet once to the nearest other enemy |
| `pull` | Homing toward the nearest enemy at 90°/s |
| `orbit` (trait) | The bolt circles the ship once (0.6 s) before launching |
| `ignite` | Hits apply burn; bolts leave a short fire trail |
| `charge` | Hits apply charged |
| `chill` | Hits apply slow |
| `harden` | The shot destroys enemy bullets it touches |
| `mend` | Kills credited to this mount drop a heal mote (+2 hull) |

Beams with `charge`, `chill`, `ignite`, `harden` or `mend` apply them on tick.

- **Echo Coil heat** (only for coils in a route):
  - +1 heat per shot passing through. At 24 the coil overheats for 3 s.
  - While a coil is overheated, the affected mount recompiles its route without that coil's step: `compileShot` with the filtered steps.
  - A visible ring on the coil fills with heat.
- **Thruster:**
  - Its `flame` (or `lance`) shot comes from the thruster's routes.
  - The flame is always on while moving and at 40% while idle.

**Modifiers alone** (always active, using the part's own received traits as flags):

| Part | Behaviour |
|---|---|
| Mirror | An enemy bullet hitting its cell reflects back at 1.5× speed |
| Lens | A weak ray, 8 dmg every 1 s at the nearest enemy within 300 |
| Orbit Ring | Pushes enemies within 70 px outward at 60 px/s |
| Echo Coil | Repeats the cockpit shot (+1 echo at 0.3 s, 0.6) |
| Prism | A fan of 5 sparks (4 dmg, 300 px) every 2 s along its facing |

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Verify in the browser:
  - Loading each line diagram (without a signature hookup yet) shows the general rule: the beam splits at a mirror, the pulse fuses into slugs at a lens, the beam becomes a ring at an orbit, bolts park at an orbit, the exhaust becomes a lance at a lens, and the beam becomes a trident at a prism.
  - `loadShip` with pulse → lens → prism vs pulse → prism → lens visibly differs.
  - An echo-coil line overheats and its ring empties.

## Task 12: Utility parts, Bomb Pod container, Magnet scrap-feed

**Files:**
- Create: `src/game/Utility.ts`
- Modify: `src/game/Emitters.ts`, `src/game/Pickups.ts`, `src/game/Ship.ts`

**Interfaces:**
- Consumes: `MountSpec.payload`, `MountSpec.feeds`, `Loadout.stats`.
- Produces: event `'payload-burst'` `(mountUid)` and event `'scrap-slug'` `(mountUid)`. Task 15 uses both to detect Cluster Shell and Coin Slinger firing.

- **Bomb Pod container:** if `payload` is set, the burst also spawns a ring of 8 bolts using `compileShot(payload, [], null, 1)`. Under the `clusterShell` signature, that's 12 bolts at ×1.5 (handled in Task 15).
- **Magnet scrap-feed:**
  - Scrap within `pickupRadius` that reaches a magnet with `feeds` becomes ammo, up to 10 stored.
  - Each fed mount fires one heavy slug per 2 ammo: a bolt at 3× the base damage, pierce 99, gold colour, fired from the magnet's cell along the fed mount's aim.
- **Thruster:** `speedMul` is applied (already via stats); it adds a visible exhaust particle trail.
- **Repair Node:** `regenPerSec` (+1 HP per 5 s per node) with a soft green pulse.
- **Bulwark with traits:**
  - On contact damage to its cell, its received flags apply to the attacker: charge → charged, chill → slow, ignite → burn, warhead → a 30 px blast, harden → a 10 damage reflect.
  - Otherwise ×1.15 to its damage reduction (capped at −50%).
- **Magnet with traits:** received flags apply to the slugs it fires.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Verify in the browser:
  - The `clusterShell` diagram: bombs burst into a ring of bolts.
  - The `coinSlinger` diagram: scrap is vacuumed and fired as gold slugs.
  - Two thrusters visibly speed up the ship.
  - A repair node ticks the hull up with `god(false)` after taking damage.

## Task 13: Full swarm: Spitter, Lancer, Carrier, escalation, seeded first run

**Files:**
- Modify: `src/game/EnemySystem.ts`, `src/game/Projectiles.ts` (enemy bullets), `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `SpawnDirector` (all kinds), `DropPacer` (`seeded = loadSave(...).discovered.length === 0`), `ENEMIES`.
- Produces: `EnemySystem.bullets` (pooled, cap 200), each `{x, y, vx, vy, damage}`; `'carrier-killed'` event.

- **Behaviours:**
  - Mote packs spawn clustered and drift toward the ship.
  - Drones chase.
  - **Spitters** orbit at 260 px and fire a magenta bullet (speed 160, damage 8) every 2.2 s.
  - **Lancers** chase until within 300 px, then telegraph for 0.7 s (a red line along the dash path), dash at 600 px/s for 0.5 s, and rest for 1.5 s.
  - **Carriers:**
    - A large hexagon with 4 rotating turret points, each firing a 3-bullet spread every 3 s.
    - A health bar above it.
    - HP is `600 × hpMul`.
    - A warning ring at the screen edge for 2 s before arrival.
- **Scaling:** all enemy HP is multiplied by `director.hpMul()`. Alive enemies are capped at 300; when capped, the director's events are skipped, not queued.
- **Bullet interactions:**
  - Enemy bullets hitting ship cells deal damage (Bulwark ×0.6).
  - A Mirror cell reflects them (Task 11 hook).
  - `harden` shots destroy them.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Verify in the browser:
  - A fresh save (clear `modular.save.v1`) drops beam, mirror, pulse and bomb as its first four parts.
  - Spitters appear after about 1:00, and the first Carrier at about 1:30 with its warning ring.
  - A Carrier kill drops 3–4 parts and a Forge Uplink.
  - Lancers appear after about 2:30 and telegraph before dashing.
  - `timeScale(4)` to 6:00 keeps `state().fps` ≥ 50.

## Task 14: Forge Uplink editor (desktop and touch)

**Files:**
- Create: `src/scenes/ForgeScene.ts`
- Modify: `src/scenes/GameScene.ts`, `src/data/copy.ts`, `src/game/debug.ts` (`grantForge` live)

**Interfaces:**
- Consumes: `ShipGrid` (`clone`, `move`, `rotate`, `jettison`, `isValid`, `disconnected`), `traceLines`, `PART_SHAPES`.
- Produces: `ForgeScene` launched with `{ grid: ShipGrid }`, which calls back `onAccept(grid: ShipGrid)`. `GameScene` pauses itself on `'forge-picked'` and resumes on accept.

- **Layout:**
  - A dimmed overlay with a large 7×7 grid. The cell size is `min(w, h) × 0.8 / 7`, centred, and the top 70% of the screen in portrait.
  - Buttons: **Rotate**, **Jettison** (a bin), **Accept**. On the right side in landscape, below the grid in portrait.
- **Interactions:**
  - Drag a part to an empty in-bounds cell to move it; it snaps back if the cell is invalid.
  - Tap or click selects a part (highlight).
  - **R**, right-click or Rotate rotates the selected part.
  - **X**, the Jettison button, or dragging onto the bin or off the grid jettisons it.
  - **Enter** or Accept accepts.
  - The cockpit is immovable (a lock icon on hover).
- **Line preview:** fixed and turret lines (including cockpit and thruster) are drawn as faint lines along each `traceLines` route's `path`, redrawn after every edit. There are **no combo hints**.
- **Validation:** while `!isValid()`, disconnected parts glow red and Accept is disabled, with the label "Reconnect all parts".
- **Tutorial:** on the first Forge of a save, show the line (`copy.ts`) "Forge Uplink: drag to move · R / ⟳ to rotate · X / bin to jettison · Enter to accept". On touch it reads "tap ⟳" and "drag to bin".
- **Accept:** `Ship.setGrid(clone)` triggers the recogniser through the loadout (Task 15 announces).

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Verify in the browser:
  - Picking up a Forge Uplink pauses enemies and projectiles.
  - Drag, rotate (keyboard and right-click) and jettison work.
  - Disconnecting a part disables Accept.
  - Accepting resumes play with the new layout.
  - Repeat at a 390×844 window: pointer drag and the buttons work. The full touch check, with `?touch=1`, is in Task 20.
- [ ] **Step 4: Checkpoint A.**
  - Play a full non-debug run from a cleared save.
  - Confirm the core loop: fly, kill, bolt on, see rule effects, use the Forge, then die at about 4–10 min.
  - Note anything that isn't fun in `docs/q1/playtest-notes.md`, the input for Task 22.
  - Report the checkpoint to the user.

## Task 15: Signature runtime: firing detection, flourishes, announcement, discovery

**Files:**
- Create: `src/game/SignatureRuntime.ts`, `src/game/Fx.ts` (slow-mo, banner, linking line, shake and hit-stop helpers)
- Modify: `src/game/WeaponSystem.ts`, `src/game/Hud.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `Loadout.signatures`, `SIG_BY_ID`, `recordDiscovery`, `writeSave`, events `'payload-burst'` and `'scrap-slug'`.
- Produces:
  - `SignatureRuntime.fired(id: SignatureId, uids: number[])`. Every signature path calls it.
  - `Fx.slowmo(realMs, scale)`, `Fx.banner(title, sub, colour)`, `Fx.link(points, colour)`, `Fx.shake(intensity, ms)`, `Fx.hitstop(ms)`.
  - Run stats: `newThisRun: SignatureId[]` and `firedThisRun: SignatureId[]`.

- **When each rule-based signature counts as fired:**

  | Signature | Fires when |
  |---|---|
  | Split Beam, Hall of Mirrors, Halo, Trident, Afterburner Lance | The source beam or thruster has been on for 0.3 s with an enemy touched by any route |
  | Slug Round | The first fused slug is fired |
  | Gravity Sling | The first parked shot is released |
  | Cluster Shell | `'payload-burst'` from a bomb mount in a `clusterShell` match |
  | Coin Slinger | `'scrap-slug'` from a magnet in a `coinSlinger` match |

  Dedicated signatures call `fired` from Task 16 and 17 code.

- **Polish bump** (on top of power ×1.5, which is already in the specs): signature-coloured output plus these flourishes:

  | Signature | Flourish |
  |---|---|
  | Split Beam | A prism-white fork flash at the mirror |
  | Hall of Mirrors | Every beam gets a chromatic offset ghost |
  | Slug Round | Slugs leave a heavy shockwave ring on hit |
  | Halo | The ring spins with rotating spokes |
  | Gravity Sling | Parked bolts glow and the release is a single burst |
  | Afterburner Lance | A blue lance with a heat-shimmer trail |
  | Trident | Three prongs with a central core flash |
  | Cluster Shell | 12 bolts instead of 8 |
  | Coin Slinger | Slugs are gold coins with a "cha-ching" ping |

- **First fire in a save:**
  - `Fx.slowmo(500 real ms, 0.25)` and the stinger SFX (a placeholder beep until Task 21).
  - `Fx.link` over the participating cells' world positions.
  - `Fx.banner(name, quip, colour)` and the HUD "Xeno Archive n/15".
  - `recordDiscovery` → `writeSave`. If a blueprint was unlocked, a toast "Blueprint unlocked: <part>".
- **Later fires:** a small name tag above the ship, at most once per 4 s per id.
- **Same-frame discoveries:** queue the announcements, one at a time, 1.2 s apart.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Verify in the browser on a cleared save:
  - For each of the 9 rule-based signatures, `__modular.loadCombo(id)` then `spawn('drone', 15)` → the banner shows the correct name and quip, `state().discovered` grows by one, and the HUD count matches.
  - A reload keeps the discoveries.
  - Firing again shows only the tag.

## Task 16: Dedicated effects A: Resonator, Shatterstorm, Jumpstart

**Files:**
- Create: `src/game/SignatureEffects.ts`
- Modify: `src/game/WeaponSystem.ts`, `src/game/EnemySystem.ts`

**Interfaces:**
- Consumes: `MountSpec.signatures`, `Status`, `SignatureRuntime.fired`, `WeaponSystem.fireSpec`.
- Produces: `SignatureEffects.update(dt)`, plus the hooks `onEnemyHit(enemy, src)` and `onEnemyKilled(enemy, src)`, called by `EnemySystem` and `Projectiles`.

| Signature | Behaviour | Fires when |
|---|---|---|
| **Resonator** | The beam mount stops its normal output on the two mirror routes. The gap between the mirrors glows hotter over 3 s (rising whine), then a huge pulse fires out both ends of the line: `width` 24, `range` 600, damage 150 × power over 0.4 s, with a big shake and hit-stop of 60 ms. Then it repeats | The first pulse |
| **Shatterstorm** | A bolt from a mount in the match that hits a `frozen` enemy shatters it: 25 bonus damage, and 6 icicle shards (cryo spec, 8 dmg, 260 px) radiate out, applying `frozen` directly. Chains naturally; at most 40 shards alive | The first shatter |
| **Jumpstart** | An enemy that dies while `charged` revives as a cyan ally for 6 s (max 10): same shape tinted cyan, it rams the nearest enemy for its contact damage ×2, then pops | The first revival |

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Verify in the browser that each signature's `loadCombo` plus spawning shows its behaviour and its first-time announcement, and that fps holds ≥ 55 with `spawn('mote', 200)`.

## Task 17: Dedicated effects B: Storm Seed, Porcupine, Grand Finale

**Files:**
- Modify: `src/game/SignatureEffects.ts`, `src/game/Emitters.ts`, `src/game/Utility.ts`

**Interfaces:**
- Consumes: as in Task 16.
- Produces: none new.

| Signature | Behaviour | Fires when |
|---|---|---|
| **Storm Seed** | That Bomb Pod's bombs land as lightning pylons (a vertical glyph) that chain-zap 2 enemies within 140 px every 0.5 s for 4 s (12 dmg, applying `charged`). Max 4 pylons | The first pylon zap |
| **Porcupine** | Enemy bullets hitting the Bulwark cell stick as spikes (drawn on the cell, counter 0–20) instead of dealing damage. At 20, a ring of 20 spikes fires out (20 dmg each, pierce 2) and the counter resets | The first ring |
| **Grand Finale** | The pods' bursts spawn 4 bomblets (r 40, 25 dmg) that each burst into 12 pulse bolts. The echo repeats the whole volley at 0.4 s. A hard cap of 150 bolts per volley comes from the projectile pool (skip spawning past the cap) | The first volley, with the biggest shake in the game |

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Verify in the browser:
  - All three behave as described and announce once.
  - `loadCombo('grandFinale')` with `spawn('mote', 300)` keeps `projectiles <= 600` and fps ≥ 50.
  - Loading all 15 diagrams one after another on a cleared save gives `discovered.length === 15`.

## Task 18: Title, Xeno Archive, Blueprint starts, first-run intro

**Files:**
- Create: `src/scenes/TitleScene.ts`, `src/scenes/ArchiveScene.ts`
- Modify: `src/data/copy.ts`, `src/scenes/BootScene.ts` (→ Title), `src/scenes/GameScene.ts` (accepts `{ blueprint: PartId | null }`)

**Interfaces:**
- Consumes: `loadSave`, `SIGNATURES`, `PART_SHAPES`.
- Produces: `GameScene` init data `{ blueprint: PartId | null }`. When non-null, the part is placed at (0,−1), facing 0, before the run starts.

- **Title screen:**
  - "MODULAR" (glowing cyan), "Archive n/15", and **Launch** (the primary button, also Enter or Space).
  - An **Xeno Archive** button.
  - When `blueprints.length > 0`, a "Blueprint start" row of the unlocked part icons plus "None". The last choice is remembered in the save as `lastBlueprint`. *(This extends `SaveData` with `lastBlueprint?: PartId | null`; update `defaultSave` and the save test.)*
  - Best run time.
- **First run of a save** (`runs === 0`):
  - Before flying, show one intro card: "Salvage pilot. The swarm took this system. Its tech is yours if you can survive it."
  - Then a single control hint: "WASD / arrows to steer — weapons fire on their own" on desktop, "Drag anywhere to steer" on touch. It fades after 5 s or on first input.
- **Archive scene:**
  - A 5×3 grid of cards, in a single column on portrait phones, scrollable.
  - Discovered cards show the name, a recipe diagram drawn from `diagram` with the `PART_SHAPES` icons, the quip, and "Key part: <name>".
  - Undiscovered cards show only "??".
  - Back returns to the caller (Title or End).

- [ ] **Step 1:** Update `tests/core/save.test.ts` so `defaultSave().lastBlueprint` is `null`, and old saves without the field still load. Run it and watch it fail, then implement.
- [ ] **Step 2:** Implement the scenes.
- [ ] **Step 3:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 4:** Verify in the browser:
  - A cleared save shows the intro and then the hint.
  - After discovering Split Beam (via debug), the Title shows the Mirror blueprint.
  - Choosing it starts the run with a mirror at the front.
  - The Archive shows 1 card filled and 14 "??".
  - It works in a portrait phone emulation.

## Task 19: End screen and Ship snapshot (PNG)

**Files:**
- Create: `src/game/snapshot.ts`
- Modify: `src/scenes/EndScene.ts`, `src/scenes/GameScene.ts` (passes run stats)

**Interfaces:**
- Consumes: `PART_SHAPES`, `SIG_BY_ID`, `recordRun`, `writeSave`.
- Produces:
  - `renderSnapshot(ship: ShipJSON, stats: { timeMs; kills; salvage; newThisRun: SignatureId[]; firedThisRun: SignatureId[]; archiveCount: number; blueprints: PartId[] }): HTMLCanvasElement` at 1080×1350, using Canvas2D with `shadowBlur` glow.
  - `downloadSnapshot(canvas)`, which uses `canvas.toBlob` → an object-URL `<a download="modular-run.png">`. When `navigator.canShare({ files })` is true (phones), it calls `navigator.share`. Errors are caught and logged.

- **End screen:**
  - The snapshot image is shown scaled to fit.
  - It contains the large ship centred with glow, "MODULAR" plus the run time, kills and salvage, combos fired this run (new ones marked "NEW"), "Xeno Archive n/15", and "Blueprint unlocked: …".
  - **Run again** is the largest button (also Enter). **Save image** and **Xeno Archive** are secondary.
  - `recordRun` → `writeSave` on entry.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Verify in the browser:
  - Die with a 6+ part ship. The end screen shows the snapshot.
  - **Save image** downloads a PNG, and opening it shows a crisp, glowing ship with stats.
  - Run again starts immediately (with the last blueprint).
  - `runs` incremented in the save.

## Task 20: Phone controls, responsive layout, pause

**Files:**
- Modify: `src/game/Input.ts`, `src/game/Hud.ts`, `src/scenes/GameScene.ts`, `src/scenes/ForgeScene.ts`, `index.html`

**Interfaces:**
- Consumes: `Input.steer()`.
- Produces: `Input.isTouch: boolean` and `GameScene.pause()` / `resume()`.

- **Virtual joystick:**
  - The first touch on the left 60% of the screen (or anywhere in portrait) sets the base.
  - The thumb is clamped to 60 px.
  - Steer = offset / 60.
  - The base fades in and out. It's multi-touch safe (`input.addPointer(2)`).
- **Pause:** a pause button (top right, 44 px touch target), plus Esc and P. Auto-pause on `visibilitychange` hidden and on window blur. The pause overlay has Resume and Quit to title.
- **Resize:** it's handled live (the HUD repositions and the camera zoom recomputes). Rotating the phone mid-run or mid-Forge keeps the game working.
- **Text:** HUD text has a minimum size of 14 px on phones.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3:** Add the `?touch=1` override in `main.ts`, so `Input.isTouch` is true and the touch UI shows. Then verify with `?touch=1` at 390×844 portrait and 844×390 landscape (`resize_window`):
  - The joystick steers and the HUD is readable.
  - A full Forge edit works by touch.
  - Rotating the device mid-run and mid-Forge works.
  - Switching tabs pauses the game.
  - Desktop keyboard play is unchanged.

## Task 21: Juice and audio

**Files:**
- Create: `src/game/Audio.ts`
- Modify: `src/game/Fx.ts`, `src/game/WeaponSystem.ts`, `src/game/EnemySystem.ts`, `src/game/Pickups.ts`, `src/scenes/*`

**Interfaces:**
- Produces:
  - `Audio.unlock()` (on first pointer or key)
  - `Audio.sfx(name: 'shoot'|'beam'|'hit'|'kill'|'explode'|'pickup'|'attach'|'forge'|'stinger'|'hurt'|'death'|'ui')`
  - `Audio.music(on: boolean)`
  - `Audio.setMuted(m: boolean)` (a mute toggle on the Title and pause screens, persisted in the save as `muted`, plus a save test as in Task 18)

- [ ] **Step 1: Juice (committed):**
  - Kill pops: 6–10 particles in enemy colours.
  - Hit flash: a white tint for 50 ms.
  - Shake: on hurt 6 px for 150 ms, on Carrier death 12 px for 400 ms.
  - Hit-stop of 40 ms on Carrier death and on the first fire of a signature.
  - A weld flash and a ring on attach.
  - Bloom: `camera.postFX.addBloom` when WebGL is available, and `preFX.addGlow` on ship parts and pickups. Skip both under the Canvas renderer.
  - Damage numbers are **not** shown, to keep it clean.
- [ ] **Step 2: Basic SFX (committed):**
  - jsfxr-style synthesis with WebAudio oscillators, noise buffers and envelopes, one function per name.
  - Shoot sounds are throttled to at most 1 per 60 ms per name.
  - Master gain 0.5.
- [ ] **Step 3:** Run `npm test && npm run typecheck`. Then verify in the browser:
  - Every listed event makes a sound after the first click.
  - Mute works and persists.
  - Bloom is on under WebGL.
  - Forcing `?renderer=canvas` (support the flag in `main.ts`) still runs without errors.
- [ ] **Step 4: SLIPPABLE.** A dark synth loop: 4 bars, a 100 BPM bass ostinato plus a pad, using WebAudio scheduled notes and a low-pass filter. Its intensity rises after 3:00 by opening the filter. Variant pitches for SFX variety. **Skip this step only if the hard deadline is at risk.** It's a good candidate for a parallel agent.

## Task 22: Tuning, performance and full verification

**Files:**
- Modify: `src/data/tuning.ts`, `src/data/enemies.ts` (numbers only), and any bug fixes
- Create: `docs/q1/playtest-notes.md` (if it wasn't created at Checkpoint A)

- [ ] **Step 1: Three cleared-save runs without debug.** Record in `playtest-notes.md`:
  - time to the first part
  - time to the first signature
  - time to the first Forge
  - run length
  - fps lows

  Targets:
  - first part at about 15 s
  - first signature ≤ 3:00
  - first Forge 1:15–1:45
  - a good first run lasts 6–10 min

  Tune `TUNING` and `ENEMIES` until all three runs hit them.
- [ ] **Step 2: Signature sweep.** For all 15, `loadCombo(id)` + `spawn('drone', 20)` + `spawn('spitter', 4)`. Each fires, announces once, is distinct from the unnamed rule result, and doesn't dominate. Nerf any signature that clears the screen alone before 3:00.
- [ ] **Step 3: Performance.** With `timeScale(4)` to 8:00 plus a 20-part ship holding Grand Finale and Hall of Mirrors, `state().fps` sampled over 10 s averages ≥ 55, and there are no `Pool` overflow warnings in the console.
- [ ] **Step 4: Review Focus checks.**
  - Block localStorage: clear `modular.save.v1`, then reload with a `javascript_tool` snippet that overrides `Storage.prototype.getItem`/`setItem` to throw before the game boots (support a `?nostorage=1` flag in `main.ts` that does this). The game plays.
  - Background the tab for 60 s mid-run. On return there's no death spike and no enemy flood.
- [ ] **Step 5 (optional; do it if Steps 1–4 finish with comfortable margin before the deadline):** Stutter Step (Echo Coil touching Thruster). This becomes the 16th signature: a ghost ship trails 0.5 s behind and re-fires the loadout at 50%. It needs the recogniser rule, data, a diagram test, the effect and an Archive card. Otherwise leave it in the writeup roadmap.
- [ ] **Step 6:** Run `npm test && npm run typecheck && npm run build`. Expected: all PASS, and the build has no errors.

## Task 23: Release build and README

**Files:**
- Create: `q1-game/README.md`
- Modify: none, unless the sub-path check fails

- [ ] **Step 1:** `README.md` contents:
  - A one-paragraph pitch.
  - Controls (desktop and phone).
  - `npm install`, `npm run dev`, `npm test`, `npm run build`.
  - "Deploy: publish the `dist/` folder to GitHub Pages (built with relative paths, so any sub-path works)."
  - The project layout (core vs game).
  - The `?debug=1` sandbox commands.
  - An AI-use disclosure line pointing to the writeup.
- [ ] **Step 2:** Run `npm run build`, then `npx vite preview --base /modular/ --port 4173`, then open `http://localhost:4173/modular/`. Expected:
  - The Title loads and a full run plays.
  - No 404s and no console errors.
  - The phone emulation works.
- [ ] **Step 3:** Hand `q1-game/dist/` to the user for their GitHub Pages deploy. After they share the live URL, re-verify on it: the Title loads, one run, the PNG export, and a phone emulation.

## Task 24: Writeup draft

**Files:**
- Create: `docs/q1/writeup.md`

**Constraints:**
- Claude drafts and the user rewrites in their own voice.
- The writeup follows the brief's order exactly: Pitch, Core loop & first session, Progression & metagame, Money, AI, Shipping, Reference games.
- It adds two short sections at the end: **Assumptions** and **AI use & sources** (the brief requires the disclosure).
- **Style:**
  - Opinions with reasons and concrete numbers from design §§4, 6, 12–18 and the Task 22 playtest notes. Real measured times beat targets.
  - Short paragraphs and tables, with no filler. Every claim specific to MODULAR.
  - Target about 1,800–2,500 words.
  - Placeholders `[PLAY LINK]` and `[GITHUB LINK]` at the top for the user.

- [ ] **Step 1:** Draft each section:
  - **Pitch:** design §4.
  - **Core loop:** design §6 table plus the real timings measured in Task 22.
  - **Progression:** the three D1 hooks built, plus the §14 roadmap, with Archive seasons as the live-ops heartbeat.
  - **Money:** §16, with the "never sell power" rationale and comparisons from `research/reference-games.md` §5.
  - **AI:**
    - (a) How it was built: parallel research agents, the design synthesis, the test-first pure core, and what was rejected or edited (XENOFORGE, signature duplication fixed by "rules plus a named highlight", the mirror auto-aim problem solved with "conduit, then aim").
    - (b) The in-game vision, options A–D from §15, with the safety rules, and why none ship in the prototype (demo-link reliability, cost, the "AI changes text, never mechanics" principle for A). The data-driven combo engine is the hook point.
  - **Shipping:** §17.
  - **References:** the §18 table, plus one or two lines per game on what was pulled apart. Mention the originality finding: mirrors on your own ship redirecting your own weapons.
- [ ] **Step 2:** Self-check against the brief's bullet list: each question is answered explicitly, there's no generic sentence that could describe any game, and the numbers match the design and the playtest notes.
- [ ] **Step 3:** Hand over to the user with:
  - the writeup
  - the 15 AI-analyst quips for review (from `src/data/signatures.ts`)
  - a list of the claims they should personally confirm (the reference games they've actually played, and their own pre-research on the Captain Forever and Vampire Survivors idea)
