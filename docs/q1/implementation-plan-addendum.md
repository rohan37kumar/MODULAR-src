# MODULAR: Addendum Implementation Plan (Inspiration Pass)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No git** (a project rule): there are no commit steps. The user handles version control. Record progress and rulings in `.superpowers/sdd/implementation-plan/progress.md`, under a new "Addendum" heading.

**Goal:** Add the approved inspiration-pass content to the finished MODULAR prototype:
- 5 parts: Saw, Hook, Overclock, Relay, Mimic
- 6 signatures, making 21
- the Shielder
- 3-phase Carriers
- octagonal frames and sleeker icons
- Archive COMBOS | MODULES tabs
- a richer Forge Uplink
- a camera zoom-out as the ship grows

Then re-tune and update the writeup.

**Architecture:** This follows the existing split.
- **New rules are pure functions in `src/core/`**, with Vitest tests:
  - Mimic resolution
  - new traits
  - Hook payload compilation
  - the new recogniser rules
  - the module save
  - the combat helpers: shield angle and absorb, Carrier phases, relay odds, zoom target and a rate limiter
- **Phaser systems in `src/game/` execute them.** Mimics are resolved once, into an "effective grid" clone, before traits, lines, recognition and loadout compilation run. Every downstream system then sees ordinary parts.

**Tech Stack:** Phaser 3.90.0, TypeScript 5.9.3, Vite 7.3.7, Vitest 3.2.7 (all pinned, nothing new). Commands run from `q1-game/`.

**Spec:** `docs/q1/design-addendum.md` (approved 2026-10-30), extending `docs/q1/design.md`. Section references written "A§n" point into the addendum; "§n" points into `design.md`.

## Global Constraints

- **The rules in `docs/q1/implementation-plan.md` → Global Constraints still apply:** pure core, pinned versions, the save key `modular.save.v1`, colours, copy rules, caps, `?debug=1` only, desktop and phone controls.
- **The Archive count is `SIGNATURES.length` (21) everywhere.** Never hard-code 15 or 21 in UI strings.
- **Parts:**
  - Saw = weapon/turret, routes, trait `boomerang`.
  - Hook = modifier, trait `snag`.
  - Overclock = utility, trait `overclock`.
  - Relay = utility, trait `relay`.
  - Mimic = utility, no trait of its own.
  - All five are in the drop pool from run 1. The seeded first run is unchanged.
- **Values from the spec, copied verbatim:**
  - Hook payloads: ×0.6 damage, at most 2 per impact. A beam carrier triggers at most once per 0.5 s per enemy.
  - Overclock: ×3 rate, ×0.5 damage, applied once.
  - Relay: projectile weapons only. Hop chances are 100/50/25…%, the range is about 6 cells (156 px), and a chain has at most 8 hops.
  - Mimic tie order: weapon > modifier > utility, then the neighbour with the lowest uid.
  - Shielder: 40 HP, a 120° arc (±60°) turning at 120°/s. It absorbs 3× its max HP, then shatters.
  - Carrier: phase changes at 66% and 33% (the first Carrier changes once, at 50%). The death drop is 2–3 parts, and each phase change drops 1 bonus part.
  - Zoom: a ×0.85 view scale at a full 7×7 ship, and ×0.95 more while a Carrier is alive.
  - Death sparks: 5 damage, triggered by kills within 3 cells (78 px) of a Relay. Grinder: about 15 dps.
- **No hints for undiscovered combos.** The Forge glow shows discovered signatures only.
- **New player-facing text** (6 quips and 21 module cards) is drafted for the user's review in `docs/q1/quips-review.md`. Quips are ≤ 90 characters, module lines ≤ 60.

## Review Focus

1. **Mimic clusters:** Mimics touching only other Mimics, or only the cockpit; a jettison that changes what a Mimic copies. Expected: they resolve to pea-shooters with no recursion, and they re-resolve on every loadout compile. Pinned in Task 2.
2. **Saves written before this update** (no `modules` field, 15 discoveries). Expected: they load, the Archive shows n/21, and the cockpit card is unlocked. Pinned in Task 5.
3. **Output explosions from the new multipliers:** Overclock + Prism + Echo + Twin on a Saw, long Relay chains, Hook payload storms. Expected: the volley cap, the hop cap of 8 and the payload rate limit all hold, and pool exhaustion skips shots silently. Pinned in Tasks 3 and 6.
4. **Damage the shield must never block:** burn ticks, blasts, arc chains, Halo rings, anything without a source point, and anything after the shield breaks. Pinned in Task 6 (`shieldHit` with `from` undefined, and with `shield` 0).
5. **One huge hit that crosses two Carrier thresholds** (Resonator, Grand Finale). Expected: both phase transitions play, in order, with 2 bonus drops. Pinned in Task 6 (`phaseSteps`).

---

## File Structure

```
q1-game/src/
  core/
    types.ts        MODIFY: new PartId/TraitId/SignatureId/EnemyKind members; ShotSpec.rateMul; Payload; MountSpec.shots[].payloads; MountSpec.mimic; SaveData.modules
    mimic.ts        CREATE: resolveMimics, withMimicsResolved
    shot.ts         MODIFY: Saw base, boomerang/snag/overclock/relay traits, rateMul
    loadout.ts      MODIFY: resolve mimics first; Hook payloads per route
    recogniser.ts   MODIFY: 5 new rules + impostor; recogniseShip()
    save.ts         MODIFY: modules (seen parts), recordModule
    combat.ts       CREATE: shield, carrier phase, relay odds, zoom target, RateLimiter
    director.ts     MODIFY: shielder spawns/groups/drops, carrier haul 2–3, onCarrierPhase
  data/
    parts.ts, enemies.ts, tuning.ts   MODIFY: new rows
    signatures.ts   MODIFY: 6 new entries (index 16–21)
    modules.ts      CREATE: MODULE_TEXT (21 cards)
    partShapes.ts   MODIFY: octagon frames, redrawn icons, 5 new icons, mimic colour
  game/
    WeaponSystem.ts MODIFY: rateMul, boomerang, relay/ricochet/domino, grinder, grapple, tethers, frost bloom, payload hooks
    Payloads.ts     CREATE: Hook payload release (bolt/stab/sticky bomb/arc), limiter
    Projectiles.ts  MODIFY: onRangeEnd, onBlocked, directional damage
    Beams.ts        MODIFY: shield truncation, `from`, payload touch hook
    Status.ts       MODIFY: 'snared'; cryoHit returns froze-now
    Effects.ts      MODIFY: snag in applyHitEffects; trait tints
    EnemySystem.ts  MODIFY: shielder AI + shield; carrier phases; damage() returns boolean
    Pickups.ts      MODIFY: grapple()
    Ship.ts         MODIFY: mimic rendering
    SignatureRuntime.ts  MODIFY: impostor credit; new firing hooks
    Audio.ts        MODIFY: SfxName += 'tink' | 'shatter' | 'phase' | 'clank' | 'click'
    Hud.ts, snapshot.ts  MODIFY: n/SIGNATURES.length
  scenes/
    BootScene.ts    MODIFY: textures for new parts, shielder, carrier phases 2–3
    GameScene.ts    MODIFY: Payloads system, module recording, carrier-phase drops, zoom easing, shielder callout
    ArchiveScene.ts MODIFY: COMBOS | MODULES tabs
    ForgeScene.ts   MODIFY: hologram, flowing routes + tethers, weld feel, known-combo glow, mimic view
    TitleScene.ts   MODIFY: n/SIGNATURES.length
tests/core/  mimic.test.ts, combat.test.ts (new); shot, loadout, recogniser, save, director, partShapes, traits (extended)
```

## Order and pace

- **Stage A (pure core, Tasks 1–6):** sequential and test-first. It unblocks everything else.
- **Parallel background agents:**
  - **Text** (after Task 4): the 6 quips and 21 module cards → `signatures.ts`, `modules.ts` and `docs/q1/quips-review.md`.
  - **Icons** (Task 13; can start after Task 1).
  - **Audio** (the five new SFX; after Task 1).
  - **Writeup references** (part of Task 17; any time).

  The main thread reads and re-runs everything an agent produces.
- **Stage B (runtime, Tasks 7–12)** → **Checkpoint C:** all new gameplay is browser-verified. Report to the user.
- **Stage C (look and UI, Tasks 13–15)** → **Checkpoint D:** feature complete. Report to the user.
- **Stage D (Tasks 16–18):** re-tune, writeup, final review.
- **Browser checks:** Brave via Claude-in-Chrome, in your own tab, with `?timer=1&debug=1`. For long scripted runs, use the `hmr: false` Vite config (see CLAUDE.md).

---

## Stage A: pure core

### Task 1: Types and data rows

**Files:**
- Modify: `src/core/types.ts`, `src/data/parts.ts`, `src/data/enemies.ts`, `src/data/tuning.ts`, `src/data/partShapes.ts` (placeholder icons only)
- Test: `tests/core/smoke.test.ts` (extend), `tests/core/partShapes.test.ts` (it must still pass)

**Interfaces:**
- Produces:
  - `PartId` += `'saw' | 'hook' | 'overclock' | 'relay' | 'mimic'`
  - `TraitId` += `'boomerang' | 'snag' | 'overclock' | 'relay'`
  - `SignatureId` += `'ricochet' | 'stickyBomb' | 'lightningRod' | 'flashFreeze' | 'domino' | 'impostor'`
  - `EnemyKind` += `'shielder'`
  - `ShotSpec.rateMul: number` (1 by default)
  - `interface Payload { partId: PartId; uid: number; hookUid: number }`
  - `MountSpec.shots: { route: Route | null; spec: ShotSpec; payloads: Payload[] }[]`
  - `MountSpec.mimic: boolean`
  - `SaveData.modules: PartId[]`
  - `WeaponTuning` gets the optional fields `pierce?: number; effects?: TraitId[]`

- [ ] **Step 1: Write the failing test** in `smoke.test.ts`:
  - `PARTS.saw` deep-equals `{ family: 'weapon', aim: 'turret', trait: 'boomerang', routes: true, isModifier: false }` (with `toMatchObject`).
  - `PARTS.hook` matches `{ family: 'modifier', trait: 'snag', isModifier: true, routes: false }`.
  - `PARTS.overclock.trait === 'overclock'`, `PARTS.relay.trait === 'relay'`, `PARTS.mimic.trait === null`, `PARTS.mimic.family === 'utility'`.
  - `LOOSE_PART_IDS.length === 20`.
  - `ENEMIES.shielder` deep-equals `{ hp: 40, speed: 95, radius: 10, contactDamage: 8, scrap: 3 }`.
  - `TUNING.weapons.saw` matches `{ shape: 'bolt', pierce: 99, effects: ['boomerang'] }`, and its `range` is 104 (4 cells).
- [ ] **Step 2:** Run `npx vitest run tests/core/smoke.test.ts`. Expect FAIL.
- [ ] **Step 3: Implement.**
  - Add the type members above.
  - **Parts:** `saw: def('saw','Saw','weapon','turret','boomerang',true)`, `hook: def('hook','Hook','modifier','none','snag')`, `overclock: def('overclock','Overclock','utility','none','overclock')`, `relay: def('relay','Relay','utility','none','relay')`, `mimic: def('mimic','Mimic','utility','none',null)`.
  - **Tuning:**
    - Saw: `{ shape: 'bolt', damage: 12, fireRate: 1 / 1.2, speed: 380, range: 104, width: 8, pierce: 99, effects: ['boomerang'] }`.
    - Add `shielder: 0x9ef0ff` to `BASE_TINT` in `EnemySystem.ts`, and add a `TEXTURE` entry `'enemy-shielder'` (drawn in Task 10; until then, reuse the drone texture key).
  - **Placeholder icons:** in `partShapes.ts`, add `[FRAME]` for the 5 new parts so `PART_SHAPES` stays total (real icons come in Task 13). Set `partColour('mimic')` to `0xf48fb1`.
  - **Type errors:** fix any `Record<PartId|EnemyKind|SignatureId, …>` maps the typecheck flags, using sensible placeholders. Fill new `SignatureId` keys in Task 4.
- [ ] **Step 4:** Run `npx vitest run tests/core/smoke.test.ts tests/core/partShapes.test.ts`. Expect PASS. `npm run typecheck` may still fail only on `SIG_BY_ID`/`SIGNATURES` consumers; note that and continue (Task 4 closes it).

### Task 2: Mimic resolution

**Files:**
- Create: `src/core/mimic.ts`, `tests/core/mimic.test.ts`

**Interfaces:**
- Produces:
  - `resolveMimics(grid: ShipGrid): Map<number, PartId>`: Mimic uid → copied id. `'cockpit'` means the pea-shooter.
  - `withMimicsResolved(grid: ShipGrid): { grid: ShipGrid; mimics: Set<number> }`: a clone whose Mimic parts have `id` replaced. A Mimic copying a Mirror gets `orient: '/'` when it has none. Uids, facing and positions are kept.

- [ ] **Step 1: Write the failing tests:**
  - `mimic touching two lenses and one pulse copies lens` (counts 2 vs 1)
  - `tie: one pulse and one lens → pulse` (weapon beats modifier)
  - `tie within family → lowest-uid neighbour` (needle placed before cryo → needle)
  - `mimic touching only the cockpit → 'cockpit'`
  - `two mimics touching each other and the cockpit → both 'cockpit'` (Review Focus 1)
  - `a resolved grid has no 'mimic' ids and keeps every uid, cell and facing`
  - `re-resolves after a jettison` (jettison the lens neighbours → it flips to the pulse)
- [ ] **Step 2:** Run `npx vitest run tests/core/mimic.test.ts`. Expect FAIL (module missing).
- [ ] **Step 3: Implement both functions.**
  - Count the non-Mimic, non-cockpit orthogonal neighbours by `PartId`.
  - Pick the highest count. Break ties by family rank (`weapon` 0, `modifier` 1, `utility` 2), then by the lowest uid among that type's neighbours.
  - With no candidates, use `'cockpit'`.
- [ ] **Step 4:** Run the test again. Expect PASS.

### Task 3: Traits, Saw base and Overclock in the shot compiler

**Files:**
- Modify: `src/core/shot.ts`
- Test: `tests/core/shot.test.ts`, `tests/core/traits.test.ts`

**Interfaces:**
- Consumes: Task 1 types.
- Produces:
  - `baseShot(id)` reads the optional `pierce` and `effects` from tuning, with `rateMul: 1`.
  - `applyTrait` handles the 4 new traits as below. `compileShot` is unchanged in signature.

- [ ] **Step 1: Write the failing tests:**
  - `baseShot('saw')` has `pierce 99`, `effects ['boomerang']`, `rateMul 1`.
  - `overclock on a pulse → rateMul 3, damage ×0.5, effects include 'overclock'`
  - `overclock on a bomb burst and on an arc chain → rateMul 3, damage ×0.5`
  - `overclock on a beam → damage ×1.5, rateMul 1`
  - `overclock on thruster flame → unchanged`
  - `relay on a bolt → effect 'relay'; on a beam, burst or chain → unchanged (no fallback boost)`
  - `boomerang on a bolt → effect; on a beam → ×1.15 fallback`
  - `snag → effect on every shape`
  - Volley cap (Review Focus 3): `compileShot('saw', ['overclock','twin','echo','split'], route through prism+echo, 1)`. Assert `count × (1 + echoes) × (twin ? 2 : 1) ≤ MAX_VOLLEY`.
- [ ] **Step 2:** Run `npx vitest run tests/core/shot.test.ts tests/core/traits.test.ts`. Expect FAIL.
- [ ] **Step 3: Implement** the four `applyTrait` cases and the `rateMul` default. Rate-based shapes are `bolt`, `burst` and `chain`; continuous shapes are `beam`, `ring` and `lance`; `flame` is unchanged.
- [ ] **Step 4:** Run the tests again. Expect PASS.

### Task 4: Signatures data, Hook payloads, recogniser rules, Impostor

**Files:**
- Modify: `src/data/signatures.ts`, `src/core/loadout.ts`, `src/core/recogniser.ts`
- Test: `tests/core/recogniser.test.ts`, `tests/core/loadout.test.ts`

**Interfaces:**
- Consumes: `withMimicsResolved` (Task 2).
- Produces:
  - `recognise(grid: ShipGrid, mimics?: Set<number>): SignatureMatch[]` (takes an already-resolved grid).
  - `recogniseShip(grid: ShipGrid): SignatureMatch[]` (resolves, then recognises). Use this everywhere outside `loadout.ts`.
  - `compileLoadout(grid)` resolves Mimics first. Each `shots[i].payloads` lists up to 2 `Payload`s (`HOOK_MAX_PAYLOADS = 2`). `MountSpec.mimic` is true for resolved Mimics.
  - Exports `HOOK_PAYLOAD_MUL = 0.6`.

- [ ] **Step 1: Write the failing tests.**
  - Update the sanity tests from 15 to `SIGNATURES.length === 21`, with indices 1..21.
  - Switch the per-diagram tests to `recogniseShip`.
  - `each diagram recognises exactly its own signature`, except `impostor`, whose diagram yields `['slugRound','impostor']` with identical uids.
  - `pulse→hook with bomb touching hook → stickyBomb [pulse, hook, bomb]`, and the same with a needle.
  - `beam→hook with arc touching → lightningRod`
  - `hook not in the line (only touching) → no stickyBomb`
  - `saw+relay → ricochet`, `overclock+cryo → flashFreeze`, `relay+pulse → domino`, `relay+needle → no domino`
  - **loadout:**
    - the carrier pulse's shot has `payloads: [{ partId: 'bomb', uid, hookUid }]`
    - the payload gun itself has normal shots (no loss)
    - three weapons touching one hook → `payloads.length === 2`
    - the carrier is never its own payload
    - the impostor diagram's mimic mount has `mimic: true` and `partId: 'lens'`
- [ ] **Step 2:** Run `npx vitest run tests/core/recogniser.test.ts tests/core/loadout.test.ts`. Expect FAIL.
- [ ] **Step 3: Add the 6 `SIGNATURES` entries.** All have `supersedes: []` and `dedicated: false`. Use the quip `'TODO'` for now; the Text agent replaces it, and the test asserts it's ≤ 90 characters.

  | # | id | name | keyPart | colour | diagram |
  |---|---|---|---|---|---|
  | 16 | `ricochet` | Ricochet | `saw` | `0xe6ee9c` | saw (1,0) f1; relay (1,−1) f0 |
  | 17 | `stickyBomb` | Sticky Bomb | `hook` | `0xff8a80` | pulse (0,−1) f0; hook (0,−2) f0; bomb (1,−2) f1 |
  | 18 | `lightningRod` | Lightning Rod | `hook` | `0x84ffff` | beam (0,−1) f0; hook (0,−2) f0; arc (1,−2) f1 |
  | 19 | `flashFreeze` | Flash Freeze | `overclock` | `0xe1f5fe` | cryo (1,0) f1; overclock (1,−1) f0 |
  | 20 | `domino` | Domino | `relay` | `0xffd740` | pulse (0,−1) f0; relay (1,−1) f1 |
  | 21 | `impostor` | Impostor | `mimic` | `0xea80fc` | pulse (0,−1) f0; mimic (0,−2) f0; lens (−1,−2) f0; lens (1,−2) f0 |

  **Recipe strings:**
  - Saw touching Relay
  - Pulse Cannon or Needle Turret → Hook (line), Bomb Pod touching the Hook
  - Beam Lance → Hook (line), Arc Coil touching the Hook
  - Overclock touching Cryo Turret
  - Relay touching Pulse Cannon
  - Any combo completed by a Mimic
- [ ] **Step 4: Recogniser.**
  - Add the touch rules `ricochet {a:['saw'], b:['relay']}`, `flashFreeze {a:['overclock'], b:['cryo']}` and `domino {a:['relay'], b:['pulse']}`.
  - Add the hook rules: for each source route containing a `hook` step, if that Hook has an orthogonal neighbour of the payload type, add `[src, hook, payloadPart]`.
  - After the overlap filter, add `{ id: 'impostor', uids }` for every kept match whose uids include a Mimic uid.
- [ ] **Step 5: Loadout.**
  - Run `compileLoadout` on `withMimicsResolved(grid).grid` and pass `mimics` to `recognise`.
  - **Payloads:** for each route, take each `hook` step in order. Collect the hook's neighbours whose resolved `PARTS[id].family === 'weapon'` or whose id is `'cockpit'` with uid ≠ 0, excluding the carrier uid. Dedupe by uid and cap at `HOOK_MAX_PAYLOADS`.
- [ ] **Step 6:** Run `npx vitest run` (all tests). Expect PASS. Then `npm run typecheck`. Expect PASS, or only runtime files that Tasks 7–15 touch failing, each fixed minimally now (e.g. `payloads: []`).

### Task 5: Save: modules seen

**Files:**
- Modify: `src/core/save.ts`
- Test: `tests/core/save.test.ts`

**Interfaces:**
- Produces:
  - `defaultSave().modules === []`.
  - `loadSave` sanitises `modules` with `cleanIds(…, isLoosePart)` and defaults to `[]`.
  - `recordModule(s: SaveData, id: PartId): SaveData` returns the same object when the id is already known or is `'cockpit'`.
  - `MODULE_COUNT = PART_IDS.length` (21, the cockpit included).

- [ ] **Step 1: Write the failing tests:**
  - **The pre-addendum save:** `{"version":1,"discovered":["splitBeam"],"blueprints":["mirror"],"runs":3}`. Expect `modules []`, `discovered ['splitBeam']`, and no throw (Review Focus 2).
  - Unknown module ids are dropped.
  - `recordModule` appends once and is idempotent.
  - `recordModule(s,'cockpit') === s`.
- [ ] **Step 2:** Run `npx vitest run tests/core/save.test.ts`. Expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run the test again. Expect PASS.

### Task 6: Combat helpers and director changes

**Files:**
- Create: `src/core/combat.ts`, `tests/core/combat.test.ts`
- Modify: `src/core/director.ts`, `src/data/tuning.ts`
- Test: `tests/core/director.test.ts`

**Interfaces (`combat.ts`):**
- **Shield constants:** `SHIELD_HALF_ARC = Math.PI / 3`, `SHIELD_TURN = 2 * Math.PI / 3` (rad/s), `SHIELD_ABSORB_MUL = 3`.
- `shieldBlocks(facing: number, at: Pt, from: Pt): boolean`: is the direction from `at` toward `from` within ±`SHIELD_HALF_ARC` of `facing`?
- `shieldHit(shield: number, facing: number, at: Pt, amount: number, from?: Pt): { hp: number; shield: number; blocked: boolean; broke: boolean }`:
  - No `from`, or a shield ≤ 0 → `{ hp: amount, shield, blocked: false, broke: false }`.
  - Blocked → the shield absorbs the hit. Any overflow past 0 passes to `hp`, and `broke` is true when the shield crosses 0.
- **Carrier phases:**
  - `carrierPhase(hpFrac: number, first: boolean): 1 | 2 | 3`. Thresholds are 0.66 and 0.33; for the first Carrier, a single threshold at 0.5 with a maximum phase of 2.
  - `phaseSteps(prev: 1 | 2 | 3, hpFrac: number, first: boolean): (2 | 3)[]`: every phase entered, in order.
- **Relay:** `relayChance(hop: number): number`. `hop` 1 → 1, 2 → 0.5, 3 → 0.25; `hop > RELAY_MAX_HOPS (8)` → 0. Also `RELAY_RANGE = 156`.
- **Zoom:** `shipZoomMul(extentCells: number, carrierAlive: boolean): number` = `(1 - 0.05 * clamp(extent, 0, 3)) * (carrierAlive ? 0.95 : 1)`, so extent 3 gives 0.85.
- **Rate limiter:** `class RateLimiter { constructor(perSec: number); take(nowMs: number): boolean }`, a sliding 1 s window.

- [ ] **Step 1: Write the failing tests (`combat.test.ts`):**
  - **Angles:** blocks at 0°, 59° and −59°; passes at 61°, 180° and 90°.
  - `shieldHit` with no `from` → full hp, even with a full shield (burn, blasts, rings: Review Focus 4).
  - `shieldHit` with shield 0 → full hp.
  - A blocked hit of 50 against shield 120 → `{ hp: 0, shield: 70, blocked: true }`.
  - A blocked hit of 50 against shield 30 → `{ hp: 20, shield: 0, broke: true }`.
  - `phaseSteps(1, 0.2, false)` → `[2,3]`; `phaseSteps(1, 0.2, true)` → `[2]`; `phaseSteps(2, 0.5, false)` → `[]`; `carrierPhase(0.66, false)` → 1, and 0.659 → 2 (Review Focus 5).
  - `relayChance` gives 1, 0.5, 0.25 for hops 1, 2 and 3, and 0 for hop 9.
  - `shipZoomMul(0,false)` = 1, `(3,false)` = 0.85, `(3,true)` = 0.8075.
  - `RateLimiter(30)`: the 31st `take` inside 1 s returns false, and `take` works again after 1 s.
- [ ] **Step 2: Write the failing director tests:**
  - No shielder spawns before 165 000 ms.
  - Shielder events have count 1 before 300 000 ms and 2 after, with event cost 5.
  - A Carrier kill drops 2–3 parts.
  - `DropPacer.onCarrierPhase(now)` returns exactly one `{ type: 'part' }` and resets the part gap.
  - `'shielder'` is a part dropper with chance `partChance + 0.1`.
- [ ] **Step 3:** Run `npx vitest run tests/core/combat.test.ts tests/core/director.test.ts`. Expect FAIL.
- [ ] **Step 4: Implement `combat.ts`. Then update tuning and the director:**
  - **Tuning:** `spawns.shielder = { cost: 2.5, weight: 10, unlockMs: 165_000 }`, `shielderGroup = { fromMs: 300_000, count: 2 }`, `drops.partDroppers` += `'shielder'`, `drops.partChanceBonus = { shielder: 0.1 }`, `drops.carrierParts = { min: 2, max: 3 }`.
  - **Event cost:** `cost × count` for shielder groups. Pick the count before the affordability check.
- [ ] **Step 5:** Run `npx vitest run`. Expect all PASS. `npm run typecheck` must be clean before Stage B.

---

## Stage B: runtime (verify every task in the browser with `?debug=1&timer=1`, using `__modular.loadCombo(id)`)

### Task 7: Saw, Overclock, Snag, Relay, Ricochet, Domino, Flash Freeze

**Files:**
- Modify: `src/game/WeaponSystem.ts`, `src/game/Projectiles.ts`, `src/game/Status.ts`, `src/game/Effects.ts`, `src/game/SignatureRuntime.ts`

**Interfaces:**
- Consumes: `relayChance`, `RELAY_RANGE` (Task 6); `ShotSpec.rateMul` (Task 3).
- Produces:
  - `Projectiles.onRangeEnd: ((b: Bolt) => boolean) | null`. Returning true keeps the bolt alive when `travel ≤ 0`.
  - `Status` kind `'snared'`: `speedMul` is 0 while it's active.
  - `Status.cryoHit(e): boolean`: true when this hit froze the target.

- [ ] **Step 1: Rate.** In `WeaponSystem.update`, the rate is `fireRate * m.shots[0].spec.rateMul`. Apply it to the cooldown in `rebuild` too.
- [ ] **Step 2: Boomerang.**
  - In `fireBolt`, a spec with `'boomerang'` sets `flags.boom = 1` and stores the home offset `flags.hx/hy` = origin − ship.
  - `onRangeEnd` turns the bolt home once: it sets `flags.ret = 1`, clears `hit` and sets travel to 2000.
  - While returning, `steer` homes the bolt at `spec.speed` toward ship + offset and expires it within 14 px.
  - Saw bolts spin; set the rotation from time when `src.partId === 'saw'`.
- [ ] **Step 3: Snag.** Add `'snag'` to `applyHitEffects`, calling `Status.apply(e,'snared',300)`. Add the tints `TRAIT_TINT.overclock = 0xff5252`, `relay = 0xffd740`, `snag = 0xbdbdbd` and `boomerang = 0xe6ee9c`.
- [ ] **Step 4: Relay hops.** In `hit(b,e)`, when `!e.alive && b.spec.effects.includes('relay')`:
  - Take hop = `(b.flags.hop ?? 0) + 1`. Roll `relayChance(hop)`.
  - Find the target with `nearest(e.x, e.y, RELAY_RANGE, b.hit)`.
  - **Saw (Ricochet):** redirect *this* bolt toward the target, set `travel = max(travel, RELAY_RANGE)` and `flags.hop = hop`, then call `sigs.byMount(uid,'ricochet')`.
  - **Otherwise:** fire one bolt (count 1, no echoes, twin or shards) from the corpse with `b.damage` and `flags.hop = hop`. With `'domino'` in `src.signatures`, also fire a 6-bolt shrapnel ring (×0.3 damage, range 120) and call `sigs.byMount(uid,'domino')`.
- [ ] **Step 5: Relay alone (death sparks).** On `'enemy-killed'`, take the first Relay mount within 78 px of the corpse. Deal 5 damage to the nearest enemy within 156 px, with a 110 ms white flash line. At most one spark per kill.
- [ ] **Step 6: Overclock alone (grinder).** In `alone()`, case `'overclock'`, every 100 ms: if the part has ≥ 1 empty orthogonal side, deal 1.5 damage to enemies within `CELL*0.6` of its cell. (Task 10 adds `from` = the cell, so the grinder is angle-tested against Shielders.) Draw teeth on the exposed sides in `draw()`.
- [ ] **Step 7: Flash Freeze.** When `Status.cryoHit(e)` returns true and `src.signatures` includes `'flashFreeze'`:
  - Slow every enemy within 39 px (`Status.apply(…,'slow',2000,0.6)`).
  - Play an expanding frost ring in `0xe1f5fe`.
  - Call `sigs.byMount(uid,'flashFreeze')`.
- [ ] **Step 8: Verify.**
  - `npm run typecheck && npm test` → PASS.
  - In the browser, `loadCombo` each of ricochet, domino and flashFreeze, plus a bare Saw and a bare Overclock. Check that:
    - a Saw blade goes out and comes back;
    - Ricochet redirects the blade;
    - Domino sprays shrapnel;
    - the frost ring appears on a freeze;
    - Overclock visibly triples the fire rate;
    - the grinder hurts touching Motes;
    - `__modular.state().counts['signature-fired']` rises for each.

### Task 8: Hook (payloads, Sticky Bomb, Lightning Rod, tethers, grapple)

**Files:**
- Create: `src/game/Payloads.ts`
- Modify: `src/game/WeaponSystem.ts`, `src/game/Beams.ts`, `src/game/Pickups.ts`, `src/game/runtime.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `Payload`, `HOOK_PAYLOAD_MUL` (Task 4); `RateLimiter` (Task 6).
- Produces:
  - `DamageSrc.payloads?: Payload[]` (set per shot by `WeaponSystem.src`).
  - `GameScene.payloads: Payloads`.
  - `Payloads.release(p: Payload, x: number, y: number, carrier: DamageSrc, targetId: number): void`
  - `Payloads.onBeamTouch(key: string, e: Enemy, carrier: DamageSrc): void` (throttled to once per 500 ms per `key:e.id`)
  - `Payloads.update(dtMs: number): void`
  - `Pickups.grapple(x: number, y: number, range: number): { x: number; y: number } | null`

- [ ] **Step 1: `Payloads.release`.**
  - **Spec:** look up the payload mount in `scene.ship.loadout`. Its `shots[0].spec` × `HOOK_PAYLOAD_MUL`, ×1.5 when the carrier has `stickyBomb` or `lightningRod`.
  - **Bolt payloads** (pulse, needle, cryo, cockpit): 3 bolts at the nearest enemies, skipping `targetId`, with range ≤ 160.
  - **Saw:** 1 blade.
  - **Beam:** a 78 px instant stab toward the nearest enemy, at spec.damage × 0.5, with a flash line.
  - **Burst (bomb):** a sticky bomb that follows `targetId` (or stays put) and blasts after 300 ms (r 42), drawn as a blinking dot in `0xff8a80`.
  - **Chain (arc):** `emitters.arc` from the impact point.
  - **Limits:** `RateLimiter(30)` caps payloads globally.
  - **Crediting:** for stickyBomb and lightningRod, call `sigs.byMount(carrier.mountUid, id)`.
- [ ] **Step 2: Wire the triggers.**
  - `WeaponSystem.hit` → `release` for each `b.src.payloads`.
  - `Beams.damageTick`: for each touched enemy, call `payloads.onBeamTouch` when `src.payloads?.length`.
- [ ] **Step 3: Tethers.** In `WeaponSystem.draw`, for every payload, draw a dashed line (6 px dash, 4 px gap, scrolling over time) from the payload cell to the hook cell, in the payload part's colour at alpha 0.55.
- [ ] **Step 4: Grapple.**
  - In `rebuild`, collect `carrierHooks` (the uids of hooks appearing in any route).
  - In `alone()`, case `'hook'`, when it isn't a carrier hook, call `pickups.grapple(cell, 260)` every 3000 ms and show a 200 ms tether flash.
  - `grapple` marks the nearest not-yet-reeling floating item; reeling items move toward the ship at 520 px/s.
- [ ] **Step 5: Verify.**
  - `npm run typecheck && npm test` → PASS.
  - Browser:
    - **Sticky Bomb:** bombs stick, then pop. **Lightning Rod:** arcs fork off beam contacts.
    - Tethers are visible.
    - A lone Hook reels in a dropped part (`__modular.drop('part','lens',200,0)`).
    - The payload gun still fires.
    - With 3 Overclocked carriers, the FPS stays ≥ 50 and no pool errors appear in the console.

### Task 9: Mimic rendering and Impostor credit

**Files:**
- Modify: `src/game/Ship.ts`, `src/game/SignatureRuntime.ts`, `src/scenes/BootScene.ts`

**Interfaces:**
- Consumes: `resolveMimics` (Task 2).

- [ ] **Step 1: Ship rendering.** `Ship.redraw` draws each Mimic as its resolved part's texture, using the cockpit texture scaled to 0.8 for `'cockpit'`. Add:
  - a slow alpha shimmer (0.75↔1 at 1.2 s);
  - a small `Ξ` text in `0xf48fb1` at the cell's top-left corner (font 9 px).
- [ ] **Step 2: Impostor credit.** `SignatureRuntime.fired(id, uids)`: when `id !== 'impostor'` and `ship.loadout.signatures` has an `impostor` match with identical uids, also call `fired('impostor', uids)`. On every impostor fire, add a 250 ms RGB-split jitter on the Mimic cell (two offset tinted copies of its sprite).
- [ ] **Step 3: Verify.**
  - `npm test` → PASS.
  - In the browser, `loadCombo('impostor')`: the Mimic shows as a Lens with Ξ. Slug Round and Impostor both announce (queued) and both are saved to the Archive.

### Task 10: Shielder

**Files:**
- Modify: `src/game/EnemySystem.ts`, `src/game/Projectiles.ts`, `src/game/Beams.ts`, `src/game/WeaponSystem.ts`, `src/game/Audio.ts`, `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `shieldBlocks`, `shieldHit`, `SHIELD_TURN` and `SHIELD_ABSORB_MUL` (Task 6).
- Produces:
  - `EnemySystem.damage(e, amount, src, flash = true, from?: { x: number; y: number }): boolean`, which is false when fully blocked.
  - `Projectiles.onBlocked: ((b: Bolt, e: Enemy) => void) | null`
  - `SfxName` += `'tink' | 'shatter'`.

- [ ] **Step 1: Spawn and AI.**
  - On spawn: `ai.facing` = the angle to the ship, and `ai.shield = ai.shieldMax = maxHp * SHIELD_ABSORB_MUL`.
  - Behaviour: chase like a Drone and rotate `ai.facing` toward the ship by at most `SHIELD_TURN * dt * speedMul`. A frozen or snared Shielder doesn't turn.
  - Texture: `'enemy-shielder'`, a rounded square (BootScene).
  - Draw the shield arc in `gfx`: a 120° arc at `radius + 5`, 3 px, `0xe0ffff`. Remove one third of its segments as visible cracks at each 33% of absorbed damage.
- [ ] **Step 2: Damage.**
  - `damage()` routes Shielders through `shieldHit`. A blocked hit plays a `'tink'` (throttled to one per 80 ms) and a 4-particle spark at the arc.
  - `broke` → 12 cyan-white shards and `'shatter'`.
  - Return `!blocked || hp > 0`.
- [ ] **Step 3: Directional sources.**
  - **Projectiles:** pass `from = { x: e.x - b.vx, y: e.y - b.vy }`. When blocked, call `onBlocked` (WeaponSystem releases payloads there, with no hit effects), then expire the bolt.
  - **`Beams.line`:** truncate each segment at the first Shielder with `shield > 0` whose arc blocks from the segment origin, and pass `from` = the origin to `damageTick`.
  - **`Beams.ring`, blasts, arcs and burn** pass no `from`.
  - **Grinder** passes its cell.
- [ ] **Step 3b: Audio.** Add the `'tink'` voice (a short high square ping, 40 ms) and `'shatter'` (a noise burst with a high band-pass, 180 ms), in the existing voice style.
- [ ] **Step 4: Callout.** On the first Shielder spawn of a run, `fx.toast('SHIELDED CONTACT', 0x9ef0ff)`.
- [ ] **Step 5: Verify.**
  - `npm test` → PASS.
  - Browser, `spawn('shielder',3)` with a bare cockpit: shots spark off the arc, the shield cracks, then shatters, and the Shielders die. That's the straight-fire path.
  - With the `stickyBomb` and `halo` combos: damage lands at once.
  - A Beam Lance beam is visibly cut at the arc.

### Task 11: Carrier phases

**Files:**
- Modify: `src/game/EnemySystem.ts`, `src/game/Audio.ts`, `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `phaseSteps` (Task 6); `DropPacer.onCarrierPhase` (Task 6).
- Produces: the event `'carrier-phase'` (enemy, phase); `SfxName` += `'phase'`.

- [ ] **Step 1: Phase state.** On spawn: `ai.phase = 1` and `ai.first = 1` for the run's first Carrier.
- [ ] **Step 2: Transitions.** In `damage()` for Carriers still alive after the hit, run each step of `phaseSteps(ai.phase, hp/maxHp, !!ai.first)`, in order:
  - set the radius to `[40, 32, 24][phase-1]`;
  - set the texture to `enemy-carrier-2`/`-3`;
  - push non-Carrier enemies within 180 px outward by 70 px;
  - `fx.hitstop(60)`, `fx.shake(6,250)`, a white flash ring, and `fx.toast('CARRIER · PHASE n', 0xff2d55)`;
  - play `'phase'`;
  - emit `'carrier-phase'`.

  GameScene listens and spawns `pacer.onCarrierPhase(timeMs)` at the Carrier.
- [ ] **Step 3: Behaviour by phase.**
  - **P1:** unchanged.
  - **P2:** no aimed volleys. A spiral of `arms` = (first ? 2 : 4) bullets every (first ? 380 : 200) ms, at speed 110 and damage 5, with the arms rotating at 1.4 rad/s.
  - **P3:** speed ×1.8. Every 4000 ms: a 700 ms telegraph (reuse the Lancer telegraph drawing) → a dash at 500 px/s for 600 ms. Plus an aimed 5-bullet ±24° fan every 1800 ms (speed 150, damage 5).
  - **BootScene:** textures for phases 2 and 3 (a smaller hexagon with an exposed core; then a core with a red tint ring).
- [ ] **Step 4: Verify.**
  - `npm test` → PASS.
  - Browser, `spawn('carrier',1)` twice:
    - The first Carrier makes 1 transition, with 1 bonus part, and spirals sparsely.
    - The second makes 2 transitions, and P3 charges with its telegraph.
    - The kill drops 2–3 parts and a Forge Uplink.
    - Hitting a second Carrier with Grand Finale for a big chunk plays both transitions.

### Task 12: Camera zoom-out

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Implement.**
  - Store the screen zoom from `layout()` as `baseZoom`.
  - Each frame: target = `baseZoom * shipZoomMul(extent, carrierAlive)`, where extent = the maximum of |x| and |y| over all parts. Ease with `zoom += (target - zoom) * (1 - Math.exp(-real / 1000 * 3))`.
  - Re-size the star layers when the zoom changes by more than 0.002.
- [ ] **Step 2: Verify.** `__modular.loadShip` with a 7×7 ship: the zoom settles at about 0.85 × the base within about 1.5 s, and the stars still cover the view.

**Checkpoint C:** run `npm test`, `npm run typecheck` and `npm run build`. Then play a normal run in the browser to about 6 min with a scripted pilot. Report to the user with numbers: the first Shielder time, Carrier phase drops, FPS, and any console errors.

---

## Stage C: look and UI

### Task 13: Octagonal frames and sleeker icons (parallel agent candidate)

**Files:**
- Modify: `src/data/partShapes.ts`, `src/scenes/BootScene.ts` (stroke weights), `src/scenes/ForgeScene.ts` (selection and highlight shapes)
- Test: `tests/core/partShapes.test.ts`

- [ ] **Step 1: Write the failing tests:**
  - `FRAME is a regular octagon` (8 points, every side length equal within 1e-3, extent ±0.42).
  - `PORTED is FRAME with a top-edge gap of ±0.09`.
  - All 21 part ids have 1–4 paths, every point is within ±0.44, and the existing tests still hold.
- [ ] **Step 2:** Run `npx vitest run tests/core/partShapes.test.ts`. Expect FAIL.
- [ ] **Step 3: Frame.**
  - `FRAME` = `[-0.174,-0.42],[0.174,-0.42],[0.42,-0.174],[0.42,0.174],[0.174,0.42],[-0.174,0.42],[-0.42,0.174],[-0.42,-0.174]`.
  - `PORTED` = the same as an open path from `[0.09,-0.42]` round to `[-0.09,-0.42]`.
- [ ] **Step 4: Icons.**
  - Redraw every inner icon as one bold symbol with fewer points.
  - New icons: Saw is a 6-tooth ring blade; Hook a J-hook with a barb; Overclock a gear with 3 speed ticks; Relay two nodes joined by a zig-zag arrow; Mimic a `Ξ` (three bars).
  - **BootScene stroke:** the crisp line goes 0.065 → 0.05 × size, and the glow 0.14 → 0.18 × size at alpha 0.12.
  - **ForgeScene:** selection, disconnected and highlight outlines become octagons via a `octagonPoints(cx, cy, s)` helper.
- [ ] **Step 5: Verify.** `npm test` → PASS. In the browser, take a screenshot of the ship, the Forge and the End snapshot PNG: every part is an octagon, the icons read at 26 px, and the muzzle ports are visible.

### Task 14: Archive tabs, module text, module recording, n/21

**Files:**
- Create: `src/data/modules.ts`
- Modify: `src/scenes/ArchiveScene.ts`, `src/scenes/GameScene.ts`, `src/scenes/TitleScene.ts`, `src/game/Hud.ts`, `src/game/snapshot.ts`
- Test: `tests/core/smoke.test.ts` (module text), `tests/game/snapshot.test.ts` (it must still pass)

**Interfaces:**
- Produces:
  - `MODULE_TEXT: Record<PartId, { alone: string; touch: string; inLine: string }>`. `inLine` is `'-'` for parts with no line role. The Text agent drafts it; this task wires it in.

- [ ] **Step 1: Write the failing test:** every `PartId` has all three lines, each non-empty and ≤ 60 characters, with no digits except one key value per card (allow at most one number per card).
- [ ] **Step 2:** Run `npx vitest run tests/core/smoke.test.ts`. Expect FAIL until the text lands.
- [ ] **Step 3: Recording.** GameScene: on `'part-attached'` and on a Blueprint start, `save = recordModule(save, id)` → `writeSave`. Record the *placed* id (`'mimic'` for a Mimic).
- [ ] **Step 4: Archive tabs.**
  - Two tab buttons, **COMBOS** and **MODULES**, under the header, remembering the last tab for the session.
  - **MODULES:** a 21-card grid, cockpit first, then `PART_IDS` order.
    - A seen card shows the icon texture (with mirror and rotation unchanged), the name, and three labelled lines **ALONE / TOUCH / IN LINE**.
    - An unseen card shows `??`.
    - The header reads `n/21 modules logged`.
  - Phone portrait keeps the same scroll behaviour as COMBOS.
- [ ] **Step 5: Counts.** Replace every "/15" with `/${SIGNATURES.length}`: Hud, Title, Archive, and the snapshot text and pip row (21 pips; wrap to 2 rows if they don't fit the width).
- [ ] **Step 6: Verify.** `npm test` → PASS. In the browser, check both tabs on desktop and in the 390×844 iframe, and that a fresh pickup unlocks its module card on the next Archive visit.

### Task 15: Forge Uplink upgrades

**Files:**
- Modify: `src/scenes/ForgeScene.ts`, `src/scenes/GameScene.ts` (pass `discovered`), `src/game/Audio.ts`

**Interfaces:**
- Consumes: `recogniseShip` (Task 4), `withMimicsResolved` (Task 2), `HOOK_MAX_PAYLOADS` (Task 4).
- Produces: `ForgeData.discovered: SignatureId[]`; `SfxName` += `'clank' | 'click'`.

- [ ] **Step 1: Hologram workbench.**
  - The game scene stays paused and visible underneath. A full-screen `0x000814` overlay at alpha 0.72 dims it.
  - A blueprint grid: 1 px cyan lines at alpha 0.12, with a horizontal scan band sweeping every 2.4 s.
  - Corner brackets around the grid area.
  - The header `FORGE UPLINK // BONDING FIELD ACTIVE`.
  - A 180 ms flicker (alpha 0 → 1 → 0.6 → 1) on open, and the reverse on accept.
- [ ] **Step 2: Flowing routes.**
  - Replace the static lines with animated dashes along each route (`traceLines` on the resolved grid), in the source weapon's family colour, with the dash offset scrolling at 40 px/s. Keep the arrowhead.
  - Hook tethers are dashed lines from each payload part to its hook, from `compileLoadout`'s payloads.
  - Everything updates live while dragging, using the hypothetical grid.
- [ ] **Step 3: Weld feel.**
  - On pickup: scale 1.08 and a drop shadow (a black copy offset 4 px at alpha 0.5).
  - On drop: a 120 ms snap tween, an 8-spark burst and `'clank'`.
  - On rotate: a 90° tween over 120 ms and `'click'`.
  - On jettison: the part spins (720°) and flies off-screen over 400 ms.
  - Audio voices: `'clank'` is a metallic noise burst, 90 ms; `'click'` is a short tick, 30 ms.
- [ ] **Step 4: Known-combo glow.** On every grid change, run `recogniseShip` on the working grid. For matches whose id is in `discovered`, draw the signature name in gold (`0xffd740`, bold, 13 px) above the centroid of its parts, plus a 2 px gold octagon outline on each part. Undiscovered matches draw nothing.
- [ ] **Step 5: Mimic view.** The Forge part view for a Mimic shows its own Ξ icon, with the resolved part's icon ghosted inside at alpha 0.35 and scale 0.6.
- [ ] **Step 6: Verify.** `npm test` → PASS. In the browser:
  - Open a Forge with a discovered Split Beam ship plus an undiscovered Trident layout. Only Split Beam glows.
  - The routes flow, and they follow a dragged Mirror live.
  - Hook tethers draw.
  - Phone portrait layout is intact.

**Checkpoint D:** run `npm test`, `npm run typecheck` and `npm run build` (the `/modular/` sub-path preview). Report to the user with screenshots: the Forge, the Archive MODULES tab, a Shielder, Carrier P3.

---

## Stage D: finish

### Task 16: Re-tune pass

**Files:**
- Modify: `src/data/tuning.ts` (and `enemies.ts` if needed), `docs/q1/playtest-notes.md`

- [ ] **Step 1:** Re-run the three Task 22 scripted pilot runs (method in `playtest-notes.md`) on a fresh save. Record:
  - time to the first combo, run length, first Shielder time, first Carrier kill time and phase drops;
  - parts per run, Forge count, FPS (min and average), and any console errors.
- [ ] **Step 2:** Tune only within the spec's intent until all three runs meet: first combo < 3:00, a good run of 6–10 min, and FPS ≥ 55 on average. Likely levers: utility family weight (now 5 parts), Shielder weight and unlock, P2 spiral density, Overclock damage.
- [ ] **Step 3:** Write the before/after table and every changed number into `playtest-notes.md` under "Addendum re-tune". Run `npm test` again → PASS.

### Task 17: Writeup update

**Files:**
- Modify: `docs/q1/writeup.md`

- [ ] **Step 1: References** (A§7):
  - **Add rows:** Breath of the Wild (the chemistry engine → the many-to-many rule), Katamari (sticking and camera zoom-out), Risk of Rain 2 (proc decay → Relay 100/50/25%), Ball x Pit (named discovery).
  - **Extend:** the Noita row with Hook (triggers/payloads), Overclock (Chainsaw) and Divide's copy cap; the Isaac row as well.
  - **Don't reproduce** the note's "no build screen" or "one thumb".
- [ ] **Step 2: Counts and content:** 20 parts, 21 combos, the Shielder ("the swarm punishes straight lines"), Carrier phases, the MODULES tab. Replace any old playtest numbers with the Task 16 results.
- [ ] **Step 3:** Grep the writeup for `15` and `[TBD`. Every hit is either intentional or fixed. Keep it in the user's voice (they edit it on Saturday).

### Task 18: Final review and release build

- [ ] **Step 1:** Dispatch one fresh reviewer (the most capable model) over the whole addendum diff, with this plan and the spec. Fix any confirmed defects.
- [ ] **Step 2:**
  - Run `npm test`, `npm run typecheck` and `npm run build`, then `MSYS_NO_PATHCONV=1 npx vite preview --base /modular/`.
  - Play one full run in the browser at `/modular/`.
  - Check the console: zero errors.
- [ ] **Step 3:** Update `q1-game/README.md` (parts and combos counts, the new controls/content), CLAUDE.md's decision log, and the progress ledger. Report to the user.
