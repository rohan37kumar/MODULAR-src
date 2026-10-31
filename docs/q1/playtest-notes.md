# MODULAR: playtest notes

These notes feed Task 22 (tuning). Times are in-game time. The runs below come from a **scripted pilot**, not a human. It was driven by synthetic WASD input in the browser with these rules:
- fly to floating parts;
- face the nearest enemy;
- break off when an enemy is within 150 px or 4+ crowd within 130 px;
- accept every Forge Uplink without rearranging.

It never dodges bullets. It's a lower bound on a human, not a substitute for one.

## Checkpoint A: 2026-10-29

### What works end to end
Each step of the loop is wired and was checked in Brave:
- Fly, kill and pick up drops.
- Parts bolt on where they touch.
- Touch traits tint the output.
- Line rules work: split, slug, halo ring, parked bolts, lance, trident and echo heat.
- The Forge Uplink works: pause, drag, rotate, jettison and accept.
- The swarm escalates: Spitters at 1:00, a Carrier at 1:30 after a 2 s warning, Lancers at 2:30.
- When the hull fails, the End screen appears, and Run again starts a fresh run.

### Key finding: a nose-fixed pea-shooter on an 8-way keyboard can't start the loop
WASD gives 8 headings, 45° apart, so a forward-fixed gun is up to 22.5° off target. At 300 px that's a miss of about 115 px, and a Mote is 10 px wide. You also have to fly *toward* enemies to shoot them, while surviving means flying *away*.

| Run (fresh save, scripted pilot) | Kills by 0:30 | Enemies alive at 0:30 | First part | First Forge | Death |
|---|---|---|---|---|---|
| Original numbers, fixed pea-shooter + 25° aim assist | 0–5 | 75 (0:20) | 1:48 | none | survived 2:10 by fleeing, 22 kills |
| Tuned spawn, fixed + assist | 4 | 53 | none by 1:34 | none | hull 36 at 1:34 |
| Tuned spawn, **auto-aimed pea-shooter** (`?pea=turret`) | 32 | 7 | 0:24 | 1:17 | 1:43 (Carrier, before the Carrier nerf) |
| Same + Carrier nerf | 10 | 47 | 0:16 | 1:17 | 2:03, 312 kills, 8 parts |

**Decided (user, 2026-10-30):** the cockpit pea-shooter auto-aims. Fixed weapons keep the ±25° assist.

### Tuning already applied (builder tuning, design §20)
| Change | From → to | Why |
|---|---|---|
| Spawn budget at t = 0 | 1.0 → 0.5 units/s (same ramp) | About 2 enemies/s at the start matched the pea-shooter's best possible kill rate, so the swarm snowballed before the first part |
| Pea-shooter fire rate | 3 → 4 /s | Same reason |
| Carrier bullet damage / speed | 8 → 5, 150 → 130 | Its 12-bullet volleys emptied a full hull in about 11 s |
| Player i-frames | 250 → 350 ms | Stops a single volley stacking hits |
| Fixed-weapon aim assist | new, ±25° | Covers the 8-way heading gap |
| Turret lead | new | Un-led turret shots missed orbiting Spitters entirely |

### Not fun yet / to tune in Task 22
- **The Carrier fight decides the run.** Even after the nerf, the scripted pilot loses ~60 hull to the first Carrier. Players need a readable way to dodge, or the first Carrier should be gentler.
- **Lancer telegraph lines are faint.** Make them brighter and thicker.
- **Early pace:** the director still reaches about 100 enemies by 1:00. That's fine with an auto-aimed pea-shooter, and brutal without one.
- **Scrap** is only collected within 40 px without a Magnet, so salvage stays near 0 unless you fly through it. Fine for now, since salvage isn't spent in the prototype.
- Run length targets (6–10 min) and the first signature (≤ 3:00) can't be judged until Task 15 lands signature firing and discovery.

### Performance (Brave 156, `?timer=1`)
- 300 Motes at once: 60 fps, update 0.43 ms, render 0.39 ms.
- Heavy prism, echo and needle ship against 300 Motes: 60 fps, at most 178 projectiles (cap 600).
- At the 300-enemy cap for minutes, at 4× sim speed: 59–60 fps.

### Testing note
Brave throttles `requestAnimationFrame` to about 1.5/s in the automation window while the main thread is idle. Browser checks therefore use the test-only `?timer=1` flag, which drives Phaser's loop with `setTimeout`. Real players never need it.

## Task 22: tuning pass, 2026-10-30

Same scripted pilot as Checkpoint A, with the same rules: fly to pickups, close on the nearest enemy, flee when one is within 150 px or 4+ are within 130 px, and accept every Forge without rearranging. It runs at 2× sim speed. Every run starts on a cleared save, so it is the seeded first run. All times are in-game time.

### Before and during tuning

| Run | Tuning | First part | First combo | First Forge | Hull after the first Carrier | Run over | Combos found |
|---|---|---|---|---|---|---|---|
| 1 | as at Checkpoint B | 0:22 | 0:45 Split Beam | 1:17 | 100 → 22 | **never**: still at full hull at 10:00 with 39 parts (stopped) | 3 |
| 2 | + late surge, gentler first Carrier | 0:30 | 1:10 Cluster Shell | 1:16 | 80 → 62 | 10:33 | 7 |
| 3 | + steeper HP surge, forced first drop | 0:26 | none | none | died at 1:58 | 1:58, with only 3 parts | 0 |

### Final tuning (three fresh runs)

| Run | First part | First combo | First Forge | First Carrier kill | Run over | Kills | Parts | Combos found |
|---|---|---|---|---|---|---|---|---|
| A | 0:17 | 0:31 Split Beam | 1:17 | 2:01 | **8:28** | 4,462 | 39 | 6 |
| B | 0:16 | 0:43 Split Beam | 1:16 | 2:11 | **6:14** | 1,915 | 30 | 5 |
| C | 0:13 | 1:09 Cluster Shell | 1:16 | 1:54 | **6:27** | 2,052 | 34 | 2 |
| **Target** | ~0:15 | ≤ 3:00 | 1:15–1:45 | — | 6–10 min | | | |

All three runs hit every target. The pilot never uses the Forge on purpose, so a human who does should find more combos than its 2–6.

### What changed, and why

| Change | From → to | Why (run) |
|---|---|---|
| **Late surge** (new) | linear ramps only → after 4:00, budget + 0.5 × min², HP + 0.25 × min² | Run 1: a 30-part ship out-scales a linear swarm. At 9:00 it held full hull with 130 enemies alive, so the run would never end |
| First Carrier volley gap | 3 s → 4.5 s (later Carriers stay at 3 s) | Run 1: the first Carrier took the hull 100 → 22. Run 2: 80 → 62 |
| First part drop | 25% per kill after 0:12 → the first qualifying kill after 0:12 always drops | Runs 1–3: the first part landed at 0:22–0:30 against a ~0:15 target |
| Pickup tractor (new) | items must be touched → they drift in at 150 px/s within 90 px of the hull | Run 3: the pilot missed its parts and the seeded Forge, then died at 1:58 with 3 parts. Grazing a part should collect it |
| Loose part life | 10 s → 14 s | Same as above |
| Lancer warning line | a faint 1–3 px line → a wide soft lane, a thick core and a flashing end ring | Checkpoint A note: the line was too faint to read at a glance |

### Performance (Step 3)
- **The fps counter can't measure this.** Brave throttles the automation window: this tab got about 73 `setTimeout` calls and 2 `requestAnimationFrame` calls per second. Even an empty screen read 40–44 fps.
- **Measured instead:** I timed 120 real frames as `game.step()` + `gl.finish()`, which counts CPU and GPU.
  - The scenario: a 20-part ship with Grand Finale, Hall of Mirrors and 6 more signatures, at 9:20 (fast-forwarded at 4× from 0:00), with 300 enemies and about 100 projectiles.
  - Result: **2.85 ms on average, 5.4 ms at p95, 6.0 ms at worst.** A 60 fps frame allows 16.7 ms.
- The console showed no pool warnings or errors. Projectiles peaked around 200, against a cap of 600.

### Review Focus checks (Step 4)
- **Blocked storage** (`?nostorage=1`): `localStorage` throws. The run still went Title → launch → a discovery → End, with no console errors. The Archive simply isn't kept.
- **Huge frame delta:** feeding a live run one 60 s frame advanced the sim by only 50 ms. Hull and enemy count were unchanged, so there's no death spike and no flood.
- **Real backgrounding:** hiding the tab auto-pauses the game (checked in Task 20 with a hidden `visibilitychange`). The automation can't hide a tab, because both of its tabs report "visible".

### Still worth a human playtest
- **The 4:00–5:00 cliff:** in runs B and C the hull fell from ~70–100 to ~35 within 30 s. That's when the surge starts and the 3rd Carrier lands. It's a dramatic difficulty spike; check whether it reads as fair when you can dodge.
- **Ship size:** ships reach 30–39 parts by the end. The 7×7 grid (49 cells) is never full, so the size tension only bites through the hitbox.

### Signature dominance sweep (Step 2)
Each combo's diagram flies alone (god mode, part drops off) through a real swarm from 0:00 to 3:00 at 4× speed. The baseline is the bare cockpit.

| Ship | Kills by 3:00 | Enemies alive at 0:30 / 1:00 / 1:30 / 2:00 / 2:30 |
|---|---|---|
| Bare cockpit | 252 | 22 / 59 / 100 / 188 / 275 (overrun) |
| Most combos (Split Beam, Cluster Shell, Hall of Mirrors, Slug Round, Halo, Gravity Sling, Resonator, Trident, Shatterstorm, Jumpstart, Storm Seed) | 480–565 | 45–100 still alive at 2:30 |
| Afterburner Lance | 402 | … 100 |
| Coin Slinger | 402 | … 164 (no scrap ammo in this test, since drops were off) |
| Porcupine | 312 | … 210 (a defensive combo: it only fires back what it catches) |
| **Grand Finale** | 534 | 15 / 24 / 17 / 27 / 26: the strongest, but it never clears the screen |

**No nerfs.** Every combo roughly doubles a lone cockpit, and none clears the screen alone before 3:00. Grand Finale is the 4-part jackpot and is meant to be the strongest.

## Addendum re-tune (Task 16), 2026-10-30/31

Same scripted pilot and rules as Task 22 (2× sim speed, cleared save, accepts every Forge). Frame cost is update + render ms per frame (Brave throttles the automation window, so fps can't be measured).

### Before: the addendum as built (Checkpoint C build)

| Run | First part | First combo | First Carrier kill | First Shielder | Run over | Kills | Parts | Forges | Combos | Frame avg / p95 / max |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | — | 0:35 Split Beam | 2:05 | — | **2:42** | 483 | 15 | 2 | 2 | 1.5 / 2.4 / 2.9 ms |
| 2 | 0:21 | 0:48 Split Beam | 2:11 | 2:51 | **3:19** | 554 | 14 | 2 | 1 | 1.4 / 2.4 / 3.7 ms |
| 3 | 0:19 | 0:36 Split Beam | 2:07 | 2:51 | **3:34** | 693 | 21 | 3 | 3 | 2.3 / 3.8 / 4.5 ms |

What killed them (a damage logger on `hurt`):
- Run 2: the first Carrier took 75 hull: 55 from P1 volleys, plus a 20-point ram.
- Run 3: the second Carrier went from P2 to P3 in 2 s, and its charge sat on the hull. A ram did 20 every 0.5 s (the contact cooldown), so it took 61 hull in about 1 s.

### What changed, and why

| Change | From → to | Why |
|---|---|---|
| Carrier contact | 20 every 0.5 s while touching → 12, once per 1.5 s, 60 px knockback; a P3 charge ends on impact | Run 3: one charge did 61 damage in about 1 s. A ram should hurt once |
| Later Carriers' P2 spiral | a burst every 200 ms → every 320 ms | The 4-arm spiral fired 20 bullets/s. A 25-part hull couldn't avoid it |
| Late surge start | 4:00 → 5:00 | Shielders and Carrier phases now add the mid-run pressure the 4:00 surge used to supply |
| Repair core on a Carrier kill | 50% → 75% | One run picked up no heal in 5 minutes. "Sometimes" still holds |
| First Carrier only | volleys every 4.5 s → 6 s; P2 spiral burst every 380 → 520 ms | Two runs lost 75–76 hull to it with a 6–12 part ship. It is meant to be the gentle introduction |

Also in this pass: the final review's Snag fix. Before it, a Hook touching a Beam or Needle could stop a Carrier from attacking for good, which made some runs artificially easy.

### After

| Run | Tuning | First part | First combo | First Carrier kill | First Shielder | Run over | Kills | Parts | Forges | Combos | Frame avg / p95 / max |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | review fixes + Carrier contact | 0:14 | 0:39 Split Beam | 2:02 | 2:49 | 4:54 | 1,023 | 25 | 4 | 2 | 2.2 / 4.1 / 5.5 ms |
| B | + spiral 320 ms, surge at 5:00 | 0:28 | 1:06 Cluster Shell | 1:51 | 2:48 | 4:49 | 977 | 22 | 4 | 3 | 1.4 / 2.8 / 5.0 ms |
| C | + Carrier ram 12, repair 75% | 0:15 | 0:36 Split Beam | 1:43 | 3:02 | **8:41** | 3,336 | 46 | 9 | 8 | 2.5 / 4.5 / 6.2 ms |
| D | same as C | — | 0:28 Split Beam | (lost 76 hull to it) | — | stopped at 2:36 with 24 hull | | | | | |

The first-Carrier softening (the last row of "What changed") came from run D. Its three confirming runs were **not done**: the user asked to wrap up. **Status:**
- One run (C) is fully in target.
- The final numbers are untested in a full run.
- All runs met: first combo < 3:00, frame cost well under the 16.7 ms budget, and no console errors.

### Still worth a human playtest
- **The first Carrier** is the swing fight: the pilot lost 0–76 hull to it depending on the ship. Check that the 6 s volley gap still reads as a threat.
- **Ending:** run C ended with Shielder groups plus Lancers grinding a 46-part hull down in about 10 s at 8:30. A human who dodges should last longer.
