# Phone playtest fixes (2026-10-31)

Source: a friend's phone playtest. "Game lags when a Carrier dies or a blast happens. Combo names aren't needed in the Forge Uplink. What are the small dots enemies drop, and are they even worth it?" The user also confirmed the game stutters on their phone.

## Measured (desktop, forced 3× density)
- Worst frames: up to **35 sound effects started in one frame** (Cluster Shell chains) and 34 spark bursts per frame, with about 330 additive particles alive at once.
- Up to 600 display objects. As many as 400 of them are pooled scrap images, updated every frame.
- **Carrier death spike:** 34 ms, but only on the first death of a run. Repeat deaths cost 3–6 ms. Every effect timed on its own was cheap, so the spike reads as garbage collection.
- The phone GPU can't be measured from a desktop. The arithmetic says enough, though: native 3× is about 3 Mpx per frame, and full-screen bloom (4 steps) runs about 10 passes over it. That's the constant stutter.

## Decisions (user)
| Item | Decision |
|---|---|
| Scrap drops | **Removed.** |
| Magnet slug ammo / Coin Slinger | **Every on-screen kill feeds it** (+1 ammo), shown as a short streak from the wreck to the Magnet. |
| Forge combo names | **Drop the text, keep the known-combo glow.** |
| Phone graphics | **Fixed 2× density + lighter bloom** on phones. Desktop unchanged. |
| Hit-stop / slow-mo | **Keep all.** |
| End-screen 3rd stat | **PARTS** (modules on the final ship) replaces SALVAGE. |

## Fixes
1. **Scrap removal.** Remove the `scrap` drop type, the enemy `scrap` values, the Pickups scrap pool and its update loop, and the salvage counter. Carrier debris keeps its look.
2. **Kill-fed Magnet.** On each kill inside the camera view, give 1 ammo to the first slug-feeding Magnet that has room. A capped streak shows it. Slug rules are unchanged (2 ammo per slug, cap 10, one volley per 0.25 s). This also fixes the known issue that Coin Slinger never fired because scrap was collected before it reached the Magnet.
3. **Forge Uplink.** Remove the combo name labels and keep the glow outline.
4. **Phone budget.** On touch devices (coarse pointer, or `?touch=1`), cap density at 2× and run bloom at 2 steps instead of 4.
5. **Sound limiter.** Not needed: `Audio.sfx` already plays each name at most once per 60 ms and caps voices at 24. The 35 calls per frame were mostly dropped before making any sound.
6. **Particle cap.** Spark emitter gets a live-particle ceiling.
7. **End screen and snapshot PNG.** Show PARTS instead of SALVAGE. The "SALVAGE LOG" card title stays as fiction.
8. **Docs.** Update the writeup's scrap/salvage lines and CLAUDE.md.

## Verify
Tests, tsc and the build pass. In the browser: a Coin Slinger run (slugs fire from kills, streaks show), the Forge without names, the End screen with PARTS, phone mode at 2×, and frame stats re-measured against the numbers above.
