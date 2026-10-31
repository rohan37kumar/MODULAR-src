# MODULAR

A neon survivor-like where your build is a physical object. You fly a bare cockpit through an alien machine swarm. The drones drop alien tech, and any part you fly into welds onto your hull wherever it touched. Weapons and modifiers are octagons that weld edge to edge; the eight support parts are square nodes that slot into the gaps between them and feed the four parts around them. Touching parts share traits, and parts in front of a muzzle transform every shot that passes through them, in order. Put a Mirror in front of a Beam Lance and the laser splits at a right angle. Put a Lens behind a Thruster and your exhaust becomes a lance. Twenty parts and twenty-one named combos wait in the Xeno Archive as "??" cards, with no hints. The swarm fights back with Shielders (front arcs that punish straight lines) and three-phase Carriers.

Built for the Lila Games game-designer assignment (Q1). The design, the plan and the writeup are in `../docs/q1/`.

## Controls

| | Desktop | Phone |
|---|---|---|
| Steer | WASD or arrows | Drag anywhere (a joystick appears under your thumb) |
| Fire | Automatic | Automatic |
| Forge Uplink | Drag a part to move it, R or right-click to rotate, X (or drag off the grid / to the bin) to jettison, Enter to accept | Drag to move, tap ⟳ to rotate, drag to the bin to jettison, tap Accept |
| Xeno Archive | COMBOS and MODULES tabs; wheel or drag to scroll, Esc to go back | Tap a tab, drag to scroll |
| Pause | Esc, P, or the ⏸ button | ⏸ button (the game also pauses when the tab is hidden) |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: the pure combo engine, save and director
npm run typecheck
npm run build      # outputs dist/
```

**Deploy:** `.github/workflows/deploy.yml` (at the repo root) runs the tests, builds and publishes to GitHub Pages on every update; set the repo's Pages source to "GitHub Actions" once. Or publish `dist/` to any static host by hand. It's built with relative paths (`base: './'`), so it works from any sub-path, such as `/modular/`. Everything is generated in code (textures, sound, music), so there are no asset files to host.

## Layout

```
src/core/    pure TypeScript, no Phaser, unit-tested
             grid (7×7 ship), traits (touch layer), lines (line-of-fire routing),
             recogniser (signature combos), shot (shot compiler), loadout (incl. Hook payloads), mimic (Mimic resolution),
             combat (shield arcs, Relay odds, Carrier phases, camera zoom), director (spawns and drops), save
src/data/    parts (20 + the cockpit), signatures (the 21 combos and the analyst's quips), modules (Archive MODULES cards),
             partShapes (octagon frames and icons), tuning (every number), enemies, copy
src/game/    Phaser runtime: ship, weapons, beams, emitters, Hook payloads, enemies, pickups, signature effects, FX, audio,
             HUD, input, snapshot (the end-screen PNG)
src/scenes/  Boot → Title → Game (+ HUD, Forge) → End, plus the Xeno Archive
tests/       Vitest suites for src/core and the pure helpers
```

The combo engine is data in, behaviour out: parts are tags, the ship compiles to typed shot specs, and signatures are pattern-matchers over the grid. That is the plug-in point for AI-generated parts or naming, as described in the writeup.

## Test and debug flags

Add these to the URL:

| Flag | Effect |
|---|---|
| `?debug=1` | Sandbox hooks on `window.__modular`, plus `window.__game` and `window.__audio` |
| `?timer=1` | Drives the loop with `setTimeout`, for automated browsers that throttle `requestAnimationFrame` |
| `?touch=1` | Forces the phone UI on desktop |
| `?renderer=canvas` | Forces the Canvas renderer (no bloom or glow) |
| `?nostorage=1` | Makes `localStorage` throw, to check the game still plays without saving |

`window.__modular` (with `?debug=1`, once a run has started):

- `state()`: hull, time, kills, parts, enemies, projectiles, fps, discoveries
- `loadCombo(id)`: loads one of the 21 signature diagrams
- `loadShip(json)`, `givePart(id, cell?, facing?)`, `drop(type, part?, dx?, dy?)`
- `spawn(kind, n)`: kind is mote, drone, spitter, lancer, shielder or carrier
- `grantForge()`, `god(on)`, `timeScale(x)`, `clear(paused?)`, `teleport(x, y)`

## AI use

The game was designed and built with Claude Code (Anthropic). The process: research agents, a design doc and an implementation plan approved by me before any code, then test-first implementation with browser verification. The full disclosure, sources and assumptions are in the writeup (`../docs/q1/writeup.md`).
