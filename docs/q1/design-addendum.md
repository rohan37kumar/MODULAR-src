# MODULAR: Design Addendum (Inspiration Pass)

**Status:** draft for user approval · **Date:** 2026-10-30
**Extends:** `docs/q1/design.md`. Everything there still holds unless this document changes it. Section numbers like "§9.3" point to `design.md`.
**Source:** the user's earlier research notes, `docs/q1/research/design_inspo_clean.txt`, brainstormed item by item on 2026-10-30. Everything not marked *(my call)* is a user decision.

---

## 1. Intent

The game is feature-complete (Tasks 1–23). This pass adds what the user's original research asked for and the first build didn't have:

- **More combo depth.** Five new parts, built on Noita's triggers and Chainsaw and on Risk of Rain's proc chains, plus six new signatures. Every one of them *changes behaviour*: the Backpack Battles trap of stat-only combos is an explicit anti-goal.
- **A reason to rebuild mid-run.** The Shielder punishes plain straight-line fire and rewards angles, splash, chains and returns, so the Forge Uplink gets a job.
- **Boss moments.** Carriers become three-phase fights in the style of classic space-shooter bosses.
- **Readability and polish:** octagonal part frames, sleeker icons, an Archive tab that explains every module in plain words, and a richer Forge Uplink.
- **A truer reference list** for the writeup.

**Anti-goals**
- Stat-only combos.
- Hints for undiscovered combos. The no-hints rule (§9.4) still stands.
- Anything that makes an accidental bolt-on worse.
- Breaking the tuned first run: the seeded first combo must still land within 2–3 minutes.

**Timeline:** the user is not worried about the timeline. The task order is fixed and the Sat ~22:00 deadline is a ceiling.

---

## 2. New parts (5)

Fire Cell from the notes is **dropped**: the Thruster's Ignite trait (§10) already covers burning.

**Rollout:** all five join the drop pool from run 1, so the pool goes from 15 parts to 20. First-run seeding (§12) is unchanged. *(My call: drop weights stay equal per family, as today.)*

| Part | Family *(my call)* | Aim class | Alone | Touch trait given | In a line |
|---|---|---|---|---|---|
| **Saw** | Weapon | Turret | Boomerang blade (below) | **Boomerang** *(my call)*: neighbours' projectiles fly to the end of their range, then return to the ship, hitting again on the way back. On non-projectile outputs it falls back to a small stat boost (§9.2). | Routes like other turret shots (conduit, then aim) |
| **Hook** | Modifier | n/a | **Grapple:** every ~3s it fires a tether at the nearest loose part or pickup and reels it in | **Snag** *(my call)*: neighbours' hits briefly stop the target (~0.3s) | **Trigger:** see §2.2 |
| **Overclock** | Utility | n/a | **Grinder:** its exposed sides (sides with no neighbour) are spinning teeth that damage touching enemies (~15 dps, tune) | **Overclock:** touching weapons fire **3× as often at 0.5× damage per shot** (1.5× DPS, triple on-hit effects) | Transparent |
| **Relay** | Utility | n/a | **Death sparks:** any enemy killed within ~3 cells of the Relay throws a 5-damage spark at the nearest enemy | **Relay:** projectile weapons only (§2.4) | Transparent |
| **Mimic** | Copies its target *(my call)* | Copied | Becomes a copy (§2.5) | Copied | Copied |

### 2.1 Saw
- Auto-aims at the nearest enemy and flies out about 4 cells, **piercing everything**. It curves back toward the ship and hits again on the way home.
- *(My calls, settled after the builder check:)*
  - The Saw is an ordinary shot in the existing shot pipeline and projectile pool, with a normal fire rate (about 1 blade per 1.2s, to tune). There's **no "one blade out" cap**.
  - Line modifiers act on it exactly as on any turret shot: Prism, Mirror, Echo and Twin multiply blades, and the Lens fuses 3 into one big blade.
  - Each blade returns to the point where it left the hull (its line's exit cell) and despawns on arrival.
  - Overclock just triples the fire rate, as for other weapons.
- It's a projectile, so it counts for Relay, Boomerang and every line modifier.

### 2.2 Hook (trigger and payload)
- **Carrier:** any gun whose line (§9.3) passes **through** the Hook: fixed or turret shots, the cockpit pea-shooter and Thruster exhaust.
- **Payload:** any *other* weapon orthogonally **touching** the Hook.
- **Effect:** the carrier's shots release a payload on impact, at about **60% of the payload weapon's damage**:
  - a Pulse, Needle or Cryo touching the Hook → a small burst of its projectiles from the impact point;
  - a Beam → a short beam stab (~3 cells) toward the nearest enemy;
  - a Bomb Pod → a small bomb blast;
  - an Arc Coil → an arc chain from the target;
  - a Saw → a blade launched from the impact point.
- **The payload gun keeps firing normally** (user decision: a bolt-on never makes a weapon worse).
- **A visible tether** (a dashed, pulsing line in the payload's colour) links the payload gun to the Hook, both in-run and in the Forge.
- *(My calls: if several weapons touch the Hook, each one releases its payload, up to 2 per impact. A continuous beam carrier triggers at most once per 0.5s per enemy. A global cap on payload procs per second protects performance.)*
- The Bomb Pod's existing **Container** rule (Cluster Shell: the bomb carries bullets) is the mirror image of this (Sticky Bomb: bullets carry bombs). Both can be live at once.
- **Shielder interaction:** a payload is released wherever the carrier shot lands. If that's on the shield, a blast, arc or burst payload still applies, because it's area damage; stab, burst and blade payloads are tested by angle as usual (§3).

### 2.3 Overclock
- Applies to every weapon touching it: Pulse, Beam (tick rate), Needle, Bomb Pod, Arc Coil, Cryo, Saw and the cockpit. *(My call: Thruster exhaust is excluded, and non-weapon neighbours get the §9.2 fallback.)*
- A weapon gets the Overclock effect once, however many Overclocks touch it, the same as the existing no-stacking rule.

### 2.4 Relay
- Only **projectile** weapons can relay: Pulse, Needle, Cryo, Saw and the cockpit pea-shooter.
- When such a gun's shot **kills**, a fresh shot of the same type (with the same traits) fires from the corpse at the nearest enemy not yet hit in this chain.
- Each hop has half the previous chance: **100% → 50% → 25% → …** until a roll fails. *(My calls: hop range ~6 cells, chain cap 8 hops.)*
- Next to a Beam, Bomb Pod or Arc Coil, the Relay gives no trait. Its alone behaviour (death sparks) still runs.
- **Saw exception:** a Saw doesn't spawn a new blade. The **same blade redirects** to the next target, then returns home (this is Ricochet, §4).

### 2.5 Mimic
- It becomes a copy of the part **type it touches most**. Ties go weapon > modifier > utility, then to the neighbour that attached first. Mimics never copy other Mimics.
- If it touches **only the cockpit** (or only Mimics), it copies the cockpit's weak auto-aimed pea-shooter, so it's never inert.
- It **fully counts as the copied part** for every rule *and* every signature.
- It re-evaluates after every attach and every Forge Uplink accept. It keeps its own facing and orientation, rotating like any other part.
- *(My call, look:)* the copied part's icon with a slow glitch shimmer and a small **Ξ** glyph in one corner (from the note's "Greek letters"). In the Forge it shows its own Ξ icon with the copy's icon ghosted inside.

---

## 3. New enemy: Shielder

| | |
|---|---|
| **HP** | 40 (scales with the existing HP ramp) |
| **Look** *(my call)* | A rounded square body (distinct from the Lancer and Carrier hexagons) with a bright cyan-white 120° arc in front |
| **Movement** *(my call)* | A slowish chaser, Drone-sized, with contact damage like a Drone |
| **Shield** | A **120° front arc** that swings to face the player's cockpit at about **120°/s** |
| **Arrival** | First one at about **2:30**, with a **"SHIELDED CONTACT"** callout. Then 1–2 per wave, with small groups after 5:00. *(My call: the builder may stagger it ±15s from the Lancer's 2:30 debut so two new threats don't land on the same frame.)* |
| **Drops** *(my call)* | A part drop chance slightly above a Drone's |

**What the shield blocks and what gets through:**

| Blocked: any projectile or beam whose incoming direction is within ±60° of the shield's facing | Gets through |
|---|---|
| Bolts, darts, icicles, Saw blades on the way out, Relay hops arriving from the front, the cockpit shot. A **beam visibly stops at the arc.** | **Splash:** Bomb Pod, Cluster Shell, Sticky Bomb, Grand Finale bursts. **Arc chains**, Storm Seed. **Burn already ticking** (Thruster Ignite). **Anything hitting from the side or back**: a returning Saw, Relay hops from other corpses, Orbit Ring and Halo arcs, Mirror and Prism angles. Contact damage (Grinder) is angle-tested too. |

**The shield breaks after a beating** (user decision, after the builder check).
- **Why:** the shield faces the cockpit, so almost all of the player's fire arrives inside the arc (turrets, the pea-shooter, and Mirror/Prism exits only ~3 cells off-centre). Circling is slower than the 120°/s turn. Without a break, a ship with no Bomb Pod or Arc Coil could never kill it.
- **The rule:** the shield absorbs blocked hits and **shatters after ~120 absorbed damage** (about 3× the Shielder's HP, scaling with the HP ramp). Then the Shielder is exposed for the rest of its life.
- **The result:** straight fire works but takes about 4× as long, while splash, chains, burn and back hits kill it fast. It's never a wall, and combos clearly win.
- **Readability:** the arc visibly cracks in stages as it absorbs damage (e.g. at 33% and 66%) and bursts into shards with a glassy break sound.
- *(My call, feedback:)* blocked hits spark off the arc with a dull "tink" sound, so players see that the problem is the *angle*.

---

## 4. New signatures (6). The Archive goes from 15 to 21

They follow the §9.4 pattern: name, scan announcement, Archive entry, Blueprint unlock, about +50% strength, a unique flourish, and a quip in the onboard-AI voice (§5 of `design.md`, written by the builder and reviewed by the user).

| # | Combo | Recipe (relation) | What you see | Key part *(my call)* |
|---|---|---|---|---|
| 16 | **Ricochet** | Saw touching Relay | On each kill, the same blade redirects to the next enemy (100/50/25%…) before flying home: one blade carving a path through the pack | Saw |
| 17 | **Sticky Bomb** | Pulse Cannon or Needle Turret → Hook (line), with a Bomb Pod touching the Hook | Every bolt sticks a small bomb into what it hits, which pops a beat later | Hook |
| 18 | **Lightning Rod** | Beam Lance → Hook (line), with an Arc Coil touching the Hook | Every enemy the beam touches forks an arc chain to its neighbours, so a straight line becomes a spreading web | Hook |
| 19 | **Flash Freeze** | Overclock touching Cryo Turret | Triple-rate chill hits freeze targets almost instantly. **Frost bloom:** each time a target freezes, a frost ring bursts out and chills (slows) every enemy within ~1.5 cells. It's a crowd-lock, distinct from Shatterstorm's shard explosion (user decision, after review). | Overclock |
| 20 | **Domino** | Relay touching Pulse Cannon | Every relay hop also sprays a ring of shrapnel from the corpse, so kills cascade across a packed swarm | Relay |
| 21 | **Impostor** | Any signature completed with a Mimic standing in for one of its parts | The underlying combo fires, plus a glitchy "IMPOSTOR" flourish on the Mimic | Mimic |

- **Impostor crediting** *(my call)*: when a Mimic completes a signature, **both** the underlying signature and Impostor are credited (the real combo genuinely fired). Impostor's announcement plays once, the first time.
- **Overlaps** follow the existing rule (§9.4): when Domino fires, the plain Relay hop is part of it. Ricochet replaces the Saw's plain Relay behaviour.
- **Blueprints:** Hook is now the key part for two signatures, which is fine; Mirror already has three.

---

## 5. Carrier: three phases

- **Thresholds:** phase changes at **66% and 33% HP**.
- **Each transition:**
  - the outer module ring blows off (debris particles);
  - a shockwave pushes small enemies back (no damage to the player);
  - hit-stop, a flash and a phase callout;
  - **1 bonus part drops immediately**.
- **Phases:**

| Phase | Look | Behaviour |
|---|---|---|
| **P1** | The current Carrier (big hexagon with turrets) | **Today's behaviour, unchanged** (user decision, after the builder check): drifts, spins, and fires aimed 3-bullet spreads from 4 turrets every 3s (4.5s for the first Carrier). No Drone launching. |
| **P2** | The outer ring gone; a smaller silhouette with an exposed core | **No aimed shots.** It spins and fires a **dense rotating 360° bullet spiral** of slow bullets from the core, so it reads clearly different from P1. The bullets can be reflected by Mirror, destroyed by Bulwark Harden and stuck for Porcupine. *(My call: the first Carrier's P2 spiral is sparser, keeping its Task 22 gentleness.)* |
| **P3** | An exposed pulsing **red core** | Faster. **Charges** at you after a telegraph (reuses the Lancer's), plus **aimed bursts** |

- **The first Carrier plays only P1 → P2** (one transition at 50%), to keep the tuned gentle intro.
- *(My calls:)*
  - Total HP stays about what it is today, including the gentler first Carrier.
  - The death drop goes from 3–4 to **2–3 parts**, so with the bonus phase drops total loot roughly matches today's.
  - It still **always drops a Forge Uplink**, and sometimes a hull repair core.
  - The hitbox radius shrinks per phase (about 40 → 32 → 24).

---

## 6. Look and feel

### 6.1 Octagonal parts
- Every module frame (path 0 in `partShapes.ts`, plus its ported variant) becomes a **regular octagon**. The build grid stays square.
- **The diamond gaps where four parts meet stay dark** (user decision: no weld nodes).
- Muzzle ports sit on the side of the octagon that the part faces.
- *(My call:)* it applies everywhere a part is drawn: in-run, the Forge Uplink, the Archive and the PNG Ship snapshot. Hitboxes stay as full square cells, so gameplay is unchanged.

### 6.2 Sleeker part icons
- **Part icons only** (the buttons stay as text).
- Redraw all 20 parts plus the cockpit to sit inside the octagon: **thinner strokes, a soft neon glow, and one bold symbol each with less internal detail**.
- Family colours are unchanged. The five new parts get icons in the same style.
- The existing conventions still apply: icons face up, and the renderer rotates them.

### 6.3 Xeno Archive: COMBOS | MODULES tabs
- **COMBOS:** the existing cards, now 21. The counter reads "n/21".
- **MODULES:** one card per part (20 parts plus the cockpit = 21 cards). Each card has the icon, the name and three short plain-language lines:
  - **ALONE:** what it does by itself
  - **TOUCH:** what it gives its neighbours
  - **IN LINE:** what it does to shots passing through, or "-" if nothing
- Example: *Lens. Alone: a weak ray at the nearest enemy. Touch: neighbours hit 20% harder. In line: fuses every 3 shots into one big piercing slug.*
- A part you've never bolted on shows as **"??"**, a second collection to fill. A part counts as seen when it first attaches (a Blueprint start counts). *(My call: the cockpit is always unlocked. Existing saves start with an empty module list, apart from the cockpit.)*
- **Part info appears only in the Archive.** There's no in-run toast and no Forge info panel (user decision). Text has to be short and simple: no jargon, no numbers beyond one key value.

### 6.4 Forge Uplink upgrades
All four are in:
1. **Hologram workbench.**
   - The frozen battle stays visible behind, dimmed and desaturated.
   - The grid becomes a glowing blueprint with a slow scan-line sweep and corner-bracket frame.
   - Header: "FORGE UPLINK // BONDING FIELD ACTIVE".
   - A quick hologram flicker on open and close.
2. **Live flowing routes.** The static route lines become animated light pulses flowing from each muzzle through its line in the weapon's colour, with Hook tethers drawn as dashed lines. They update live while dragging. They show **routing only**.
3. **Weld feel.**
   - Picking up a part lifts it with a drop shadow.
   - Dropping it snaps it into place with a weld-spark burst and a clank sound.
   - Rotation tweens 90° with a click.
   - A jettisoned part spins off-screen.
4. **Known-combo glow.** When parts form a combo the player has **already discovered**, its name lights up in gold over those parts, live. Undiscovered combos never glow, so the no-hints rule stands.

### 6.5 Camera zoom-out (Katamari)
- The camera eases out as the ship's footprint grows: about **15% wider view at a full 7×7 ship** compared with a bare cockpit, on a slow ease of about 1s.
- *(My call:)* a small extra pull-out (~5%) while a Carrier is alive.
- This multiplies the existing screen-size zoom (`GameScene.ts`). The spawn and despawn distances already read `cam.zoom`.

---

## 7. Writeup changes (`docs/q1/writeup.md`)

- **Reference table:** merge in the note's list.
  - **Add:** Breath of the Wild (the chemistry engine: verbs act on targets, not authored pairs, i.e. our many-to-many rule), Katamari (things stick; the camera zooms out as you grow), Risk of Rain 2 (proc chains with decay → Relay's 100/50/25%) and Ball x Pit (the joy of a named discovery).
  - **Extend:** the Noita row (triggers carrying payloads → Hook; Chainsaw → Overclock; Divide's copy cap) and the Isaac row.
  - **Reword** the note's "no build screen" and "one thumb", which contradict the Forge Uplink.
  - Don't add rows for things we didn't really take. Write it in the user's voice.
- **Counts and content:** parts 15 → 20, combos 15 → 21. Mention the Shielder ("the swarm punishes straight lines") and the Carrier phases in the core loop and first session section.
- **Shipping section:** the playtest numbers in §2 and §6 must come from the re-tune pass (§8), not from the old Task 22 data.

---

## 8. Constraints

- **The first run stays tuned:** the time to the first combo is under 3 minutes, and a good first run lasts 6–10 minutes. With the Shielder, new parts and Carrier phases, the **scripted pilots from Task 22 must be re-run** and re-tuned, with the results recorded in `docs/q1/playtest-notes.md`.
- **Performance:** the §19 target still applies (60 fps with about 300 enemies and 500 projectiles). Relay chains, Hook payloads, Overclock and Ricochet all need caps.
- **Saves:** existing localStorage saves must keep loading. New fields default safely.
- **Tests:** the pure-logic parts (traits, lines, the recogniser, Mimic resolution, the Hook carrier/payload graph and the Shielder angle test) get Vitest unit tests like the existing engine.
- **Browser verification** in Brave via Claude-in-Chrome (own tab, `?timer=1`) before anything is called done.

---

## 9. Left to the builder

- All tuning numbers within the intent above.
- The visual specifics of the new icons, the Shielder, Carrier phase art and Forge effects, within the neon-vector style.
- New quips (6) and Module card text (21). Both go to the user for review, the same as before.
- How the Forge's dimmed background is achieved (a snapshot of the frozen game, or the scene left visible underneath).
- Code architecture and test approach.

## 10. Not in scope

- Fire Cell.
- In-run part toasts and a Forge info panel.
- Weld nodes in the octagon gaps.
- Vector icons on buttons.
- Stutter Step (still the user's call, unchanged).
- Blender (Saw + Overclock) and Minigun (Overclock + Needle) signatures. Those pairings still work through the general rules; they just aren't named.


## A§9. Square nodes (user decision, 2026-10-31)

**What changed.** The violet and green parts (Orbit Ring, Echo Coil, Thruster, Magnet, Bulwark Plate, Repair Node, Overclock, Relay) are no longer octagons. They are small squares (drawn as diamonds) that sit in the gaps where four octagons meet: the cell corners, 8×8 slots including the outer rim. A node touches the four octagons around it and gives each its effect. Nodes never touch each other and never sit in a line of fire. The Mimic stays an octagon.

**The user's calls:**
- **Line effects through touch.** An Orbit or Echo node gives every routed weapon it touches its old in-line effect (parked orbit shots / doubled shots, with Echo's overheat), instead of its touch trait. Bomb Pod and Arc Coil still get the trait.
- **Recipes.** Halo = an Orbit node touching a Beam Lance. Gravity Sling = an Orbit node touching a Pulse Cannon or Needle Turret. Afterburner Lance = a Thruster node touching a Lens (the exhaust passes through the Lens). Porcupine = a Magnet node and a Bulwark node on the same octagon. All 21 combos survive.
- **Bulwark.** A Bulwark node shields the four octagons it touches: hits there take ×0.6.
- **Process.** A short design note, then build directly.

**Builder's calls (Claude):**
- **Connection.** Octagons connect edge to edge, as before. A node is connected if any octagon it touches is connected; nodes never bridge octagons.
- **Attaching.** A loose node welds into the free corner of the touched octagon nearest it, facing away from the cockpit along its longer axis. A loose octagon that touches a node hands over to that node's nearest octagon.
- **Hitbox.** A node's hitbox is 0.45× a cell's.
- **Capacity.** Nodes don't use up cells: 49 cells plus 64 slots.
- **Overclock grinder.** It works on the node's open sides (both octagons on that side are empty).
- **Pickup tractor.** It now pulls toward the nearest part instead of the ship's centre, because nodes leave empty pockets inside the ship's bounds.
