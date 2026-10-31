# MODULAR: Q1 Design Document

> **Status:** **Approved** by the user on 2026-10-29. The build follows `docs/q1/implementation-plan.md`. Written from the brainstorming session, with decisions logged in `CLAUDE.md`.
> **Title: MODULAR** (chosen by the user on 2026-10-29). "XENOFORGE" was rejected as the name, but everything else in that proposal was kept.
> **Legend:** anything marked *(my call)* was decided by Claude as a sensible default, and the user can override it. Everything else was decided by the user.

---

## 1. Intent: why this exists

This is Q1 of the Lila Games Game Designer written test (Part 1). The brief: *"build a small prototype we can actually play… a single core loop that's genuinely fun, and at least one day-1 hook that makes a new player want another run."* The deliverables are a one-click browser link, a GitHub repo and a detailed writeup (pitch, core loop, progression, money, AI, shipping, references).

**Who's judging.** Lila is a Bengaluru studio that makes mobile F2P games (LILA BLACK). Its stated aim is "AI games… experiences that only work because AI is at their core". The CEO is very likely the "JK" interviewer (inferred, not confirmed). He's a F2P veteran who cares about live-ops, retention and shipping fast. They explicitly penalise generic AI output. So the prototype has to *feel* fun, show strong F2P and retention thinking, and have one idea that's clearly ours.

**The idea in one line.** A neon-vector survivor-like where you bolt alien tech salvaged from the swarm onto your ship, wherever it touches. The parts combine through general rules into surprising combos. Captain Forever's ship-building, Vampire Survivors' horde flow and Noita's spell-combining, meeting on a grid.

**Success looks like:**
- A reviewer opens the link, understands it in seconds, triggers a combo they didn't expect within about 3 minutes, and starts a second run without being asked.
- The writeup reads as a designer's opinionated thinking, not AI filler.

---

## 2. Goals, non-goals, anti-goals

**Goals**
1. One core loop that's fun within 60 seconds: fly, kill, collect, bolt on, and discover what happens.
2. Combos that genuinely surprise players and are readable in hindsight ("of course the mirror split my laser!").
3. Visible day-1 hooks: the **Xeno Archive** ("??" wall), **Blueprint starts** and the **Ship snapshot**.
4. One-click play in a desktop browser, which also works on a phone.
5. Data-driven parts and combos, so new content and future AI features can plug in.

**Non-goals (not built before submission)**
- Any runtime AI or LLM calls. AI features are deferred; see §15.
- Daily Signal, daily bounties, meta-currency spending, permanent stat upgrades, hull unlocks, star-map campaign, Ascension tiers.
- Accounts, backends, leaderboards, analytics pipelines.
- Shape-based combos (lines, loops, symmetry).
- The Stutter Step combo. This is stretch only, built if time allows.

**Anti-goals (failure even if it "works")**
- It feels like a generic Vampire Survivors clone with a ship skin.
- Combos feel random or unexplainable. If players can't tell *why* something happened, the hook is dead.
- An accidental bolt-on makes the player weaker or feels punishing.
- Monetization that sells parts, combos or power.
- Writeup prose that reads like unedited AI.

---

## 3. Constraints

| Constraint | Detail |
|---|---|
| Deadline | Submit **Sat 2026-10-31, about 22:00 the user's local time**. Brainstorming, design and plan happen on Thu 10-29. Development follows, as fast as possible, with the deadline only a ceiling (user decision). **The writeup is part of the plan:** Claude drafts each brief section on Saturday, and the user rewrites it in their own voice. |
| Scope protection | **Only audio polish may slip** (fall back to basic synthesised SFX, no music loop). Phone controls, PNG export and all 15 signatures are **committed** (user decision). The plan must order work so the core loop is playable first. |
| Engine | **Phaser 3** (user decision). |
| Delivery | A static build on **GitHub Pages**. The user handles all GitHub and deploy steps; Claude never runs git. The build must work from a sub-path. |
| Platform | **Desktop first, playable on phone.** Desktop uses WASD or arrows and the mouse. Phone uses a virtual joystick and touch drag. The layout is portrait-friendly. |
| Art | Plain shapes only, in a **neon-vector style**: glowing lines, circles and triangles on black, with bloom and particles. |
| Originality | An original game, not a recreation of an existing one. Inspiration games are dissected, not cloned. |
| AI | No runtime AI in the initial build. |

---

## 4. Pitch

- **What:** a top-down neon sci-fi survivor-like. You start as a bare cockpit, and every drone you destroy drops a piece of alien tech that welds onto your ship wherever it touches. Mirrors split your lasers, bombs burst into bullets, and your engine exhaust becomes a lance. Nobody understands this tech, so every bolt-on is an experiment.
- **Who:** mobile and PC players of survivor-likes and roguelites (Vampire Survivors, Survivor.io, Brotato, Nova Drift) who love "build-crafting" and the *eureka* of a broken combo, in sessions of about 5–10 minutes.
- **Why play it:** in survivor-likes, builds are menu picks from level-up cards. Here **your build is a physical object you assemble under fire**, and the combos come from *where* things sit. Players will see a new interaction almost every run, and remember a few, share them, and hunt for more.

---

## 5. World and tone

- **Fiction:** an alien machine swarm has consumed a star system. You're a lone salvage pilot. Your ship's bonding field welds any xenotech it touches onto the hull.
- **Why combos are surprising, in the fiction:** nobody understands xenotech, so every new adjacency is an experiment.
- **Onboard analysis AI (in the fiction only):** when a signature combo first fires, the ship's AI "scans" it, names it and logs it to the **Xeno Archive**. All of its lines are **pre-written** for the prototype.
- **In-fiction names:**

  | Mechanic | Fiction name |
  |---|---|
  | Wrench | **Forge Uplink** |
  | Mini-bosses | **Carriers** |
  | Health pickups | **Hull repair cores** |
  | Codex | **Xeno Archive** |

  When the hull fails, the run ends, but the Archive keeps everything you discovered.
- **Look:** black space, the player in cyan, the swarm in red and magenta, parts colour-coded by family *(my call: weapons amber, line modifiers white and violet, utility green)*. Bloom, glow and particles.
- **Sound:** a dark synth mood, plus punchy synthesised SFX *(my call: procedural WebAudio and jsfxr-style SFX, with a simple synth loop or a CC0 track)*.

---

## 6. Core loop and first session

**Moment to moment:**
1. Steer the ship. Weapons fire on their own.
2. Kill swarm enemies.
3. Enemies drop parts that float for about 10s.
4. Fly into a part to bolt it on where it touched.
5. Touching parts interact, and parts in front of a muzzle transform the shot.
6. A combo fires. The first time a signature combo fires, it's announced and logged.
7. A **Forge Uplink** drops. The game pauses, and you rearrange and rotate everything to build combos on purpose.
8. The horde escalates and Carriers arrive.
9. Your hull fails.
10. The end screen shows a **Ship snapshot**, your Archive progress and newly unlocked **Blueprints**.
11. Start another run.

**The first session, minute by minute (target):**

| Time | What happens |
|---|---|
| 0:00 | A one-screen intro ("Salvage pilot. The swarm took this system. Its tech is yours if you can survive it."), then you're flying. A single control hint. |
| 0:00–0:30 | Motes and Drones arrive. The cockpit pea-shooter kills them. The first part drops at about 15s. **The first run is seeded:** an early Beam Lance, then a Mirror. |
| 0:30–2:00 | Parts bolt on. Touch traits visibly tint shots. Ship size starts to matter. |
| ~2:00–3:00 | **First signature combo** (likely Split Beam or Cluster Shell): slow-mo, a sound cue, the AI analyst's banner, and "Xeno Archive 1/15". |
| ~1:30–2:00 | The first **Forge Uplink**, with a one-line tutorial: drag to move, R or a button to rotate, X to jettison. |
| ~1:30 | The first **Carrier** fight, which drops 3–4 parts and always a Forge Uplink. |
| 6–10 min | A good first run ends when the hull fails. The end screen shows the snapshot, the Archive and the Blueprint unlocks. |

**What brings them back tomorrow:** the "??" wall (12–14 combos still unknown), Blueprint starts that let them pursue a combo deliberately, and a snapshot of the ship they're proud of.

---

## 7. Controls

| | Desktop | Phone |
|---|---|---|
| Steer | WASD or arrow keys | Virtual joystick (left thumb, appears where you touch) |
| Forge Uplink | Mouse drag to move a part; **R** or right-click to rotate; drag off the grid or press **X** to jettison; **Enter** or a button to accept | Touch drag; a rotate button; a jettison bin; an accept button |
| Pause | Esc / P | A pause button |

- **The ship's heading follows the steering direction,** turning smoothly *(my call)*. Forward fixed guns hit what you fly toward. When you stop, the ship keeps its heading.
- Aiming is otherwise automatic. See the aiming classes in §9.

---

## 8. Ship and grid

- **Grid:** square cells around a central cockpit, **capped at 7×7** with the cockpit at the centre *(my call: about 24–28px cells, tuned for readability)*.
- **Attaching:** when a floating part overlaps any ship cell, it snaps into the **free cell next to the contacted cell, nearest the contact point**. If no free cell is valid (cap reached), the part bounces off.
- **Facing on attach:** away from the cockpit, along the side where it touched *(my call)*. The Forge Uplink can rotate it in 90° steps. Mirrors have an orientation of `/` or `\` (orientation on attach is the builder's choice).
- **Connectivity:** every part must connect to the cockpit through orthogonal neighbours. In the Forge Uplink, an arrangement that leaves parts disconnected can't be accepted; those parts are highlighted.
- **Damage:** the ship **keeps its shape** and only loses hull HP. **Every part is hitbox.** A bigger ship has more firepower but is a bigger target. That's the core tension, taken from Captain Forever.
- **Hull:** *(my call)* 100 HP. A hull repair core restores 30.
- **Jettison:** only in the Forge Uplink.

---

## 9. The combo engine

Two layers of general rules make every pairing do *something*. A third layer recognises the dramatic pairings and names them.

### 9.1 Aiming classes (every weapon has one)

| Class | Behaviour |
|---|---|
| **Fixed** | Fires straight along its facing, so it's aimed by steering. |
| **Turret** | Auto-aims at the nearest enemy from where its shot leaves (see conduit below). |
| **Emitter** | Needs no aim: it lobs at the densest crowd, chains, or bursts in every direction. **Touch traits only** *(my call)*. |

The cockpit has a weak **auto-aimed pea-shooter** that also receives traits, so every part does something from the moment it's picked up.
- It was originally fixed forward. At Checkpoint A (2026-10-29) the user changed it to auto-aim like a turret, because 8-way keyboard steering can't aim a nose gun: a scripted pilot got 4 kills by 0:30 with a fixed gun, against 32 auto-aimed.
- Fixed weapons (Pulse Cannon, Beam Lance) stay aimed by steering, with a ±25° aim assist.

### 9.2 Layer 1: Touch traits (many-to-many)

- Every part **gives one trait** to each orthogonal neighbour and **receives** its neighbours' traits.
- A trait modifies the receiving part's output: shots, beam, exhaust, burst, block, heal, and so on.
- **Generic traits are small** (about 15–25%), **always visible** (output tint or trail, plus a small coloured pip on the receiving part), and **never harmful**.
- The same trait received twice doesn't stack *(my call)*. Up to 4 traits per part (one per side).
- A part with no meaningful output, such as Bulwark or Magnet, still applies its received traits to its own event when possible. For example, a Bulwark with Charge zaps attackers. If a trait has nothing to apply to, it falls back to a small stat boost *(builder detail)*.
- **Principle (user decision):** no part is locked to one partner. Every part works with many others, and each has a few signature pairings where it shines.

### 9.3 Layer 2: Line of fire (routing)

- A weapon's **line** is the contiguous run of occupied cells in front of its muzzle, along its facing.
- **Line modifiers** in that run (Mirror, Lens, Orbit Ring, Echo Coil, Prism) transform the shot **in order**. Order matters: Beam > Lens > Mirror ≠ Beam > Mirror > Lens.
- Non-modifier parts in the line are transparent *(my call)*.
- **Fixed weapons** fire through the line, and the shot keeps the line's final direction.
- **Turrets: "Conduit, then aim" (user decision).**
  - The shot travels the same line *inside the hull* as a faint glowing conduit and is transformed at each modifier.
  - It leaves at the end of the line, or at each branch end after a Mirror, and **auto-aims from there**.
  - An accidental bolt-on never makes a turret worse.
- **Thruster exhaust counts as a fixed backward weapon:** a short, low-damage flame that routes through cells behind the thruster.
- **Mirror in a line:** the line turns 90° according to the mirror's orientation, **and half the shot continues straight**. Both branches keep routing. *(My call: each branch at about 70% damage, to be tuned.)*

### 9.4 Layer 3: Signature combos (rules plus a named highlight; user decision)

- **Effects come from the general rules for every weapon.** A Mirror splits *any* shot's line, a Lens fuses *any* shot weapon's bolts, and so on.
- **A signature is a specific pairing the game recognises** (e.g. Beam Lance → Mirror). It gets:
  - the **name**
  - the **scan announcement**
  - the **Archive entry**
  - its **Blueprint** unlock
  - a **polish bump**: about +50% effect strength and a **unique visual flourish** (colour, particles, shape) that makes it look distinct from the plain rule result.
- **Similar but unnamed results are fine and intended.** For example, Needle Turret → Lens fuses darts using the same rule, but it isn't a named entry. These "uncatalogued" results are the natural material for the deferred AI-naming feature (§15).
- **Signatures whose effect no general rule produces** have dedicated effect code. That effect is simply *the* behaviour for that pairing; no weaker generic version exists. These are Resonator, Shatterstorm, Jumpstart, Storm Seed, Porcupine and Grand Finale. Cluster Shell and Coin Slinger are named highlights over the Bomb Pod container rule and the Magnet scrap-feed rule (§10).
- A **recogniser** scans the ship graph after every attach and every Forge Uplink accept. It looks for specific partner pairs plus the required relation (touching, or in line in a given order).
- **Overlaps** *(my call)*: when a larger signature contains a smaller one (Resonator or Hall of Mirrors ⊃ Split Beam; Grand Finale ⊃ Cluster Shell), **the larger one's effect plays** for the parts involved. **Only the signature that actually fires is credited** in the Archive and as a Blueprint. The smaller one is discovered when it fires on its own somewhere.
- **The first time a signature actually fires in a save file,** the announcement plays:
  - about 0.5s of slow-motion
  - a stinger sound
  - a **thin linking line** between the participating cells
  - a banner with the name and the AI analyst's one-liner
  - "Xeno Archive n/15"

  After that, a small name tag flashes when it fires again, and nothing more *(my call)*.
- **No hints (user decision):** undiscovered combos show as "??" with no clues, silhouettes or adjacency markers.

---

## 10. Parts (15, plus the cockpit)

*Numbers are starting points for tuning.*

### Weapons

| Part | Class | Alone | Touch trait given | Notes |
|---|---|---|---|---|
| **Pulse Cannon** | Fixed | Fast bolts straight ahead | **Shrapnel:** outputs burst into 2 small bolts at end of life | The ideal ammo for Lens and Mirror |
| **Beam Lance** | Fixed | Continuous laser line, short range | **Pierce:** outputs pass through +1 enemy | Bent, split and focused by its line |
| **Needle Turret** | Turret | Auto-aimed fast darts | **Twin:** +1 extra shot at 40% | Uses the conduit |
| **Bomb Pod** | Emitter | Lobs a bomb at the densest crowd every ~3s; it bursts in a radius | **Warhead:** outputs pop in a small blast at end of life | **Container:** a weapon touching it becomes its payload (Cluster Shell) |
| **Arc Coil** | Emitter | Lightning chains across 3 nearby enemies and marks them **Charged** | **Charge:** outputs Charge what they hit | Touch only |
| **Cryo Turret** | Turret | Auto-aimed icicles that slow; 3 hits freeze for 1.5s | **Chill:** outputs slow targets | Conduit |

### Line modifiers (strongest in a line, and they still give a trait when merely touching)

| Part | Alone | Touch trait | In a line |
|---|---|---|---|
| **Mirror** | Reflects enemy bullets that hit it | **Bounce:** outputs ricochet once | Turns the line 90° and half continues straight (see §9.3) |
| **Lens** | A weak focused ray at the nearest enemy | **Focus:** +20% damage | Fuses every 3 shots into 1 big piercing shot at ×4. Beams get narrower and ×2. Exhaust becomes a lance |
| **Orbit Ring** | Gently pushes nearby enemies away | **Orbit:** outputs circle the ship once before launching | Shots park in orbit (max 16) and release at enemies within ~120px. A beam bends into a ring |
| **Echo Coil** | Repeats the cockpit shot | **Echo:** outputs repeat after 0.4s at 60% | Duplicates everything passing through. A **visible heat ring** fills, and when full the coil is off for 3s |
| **Prism** | A small fan of sparks every 2s | **Split:** +2 side shards at 30% | Splits the shot into a 3-way fan at 60% each |

### Utility and defence

| Part | Alone | Touch trait | Notes |
|---|---|---|---|
| **Thruster** | +Speed | **Ignite:** outputs leave fire trails and burn | Its exhaust is a routable backward weapon |
| **Magnet** | Larger pickup radius | **Pull:** outputs curve toward crowds | **Scrap-feed rule:** next to any shot weapon, it vacuums nearby scrap and feeds it as bonus heavy piercing slugs. With Pulse or Needle it's the signature Coin Slinger |
| **Bulwark Plate** | −40% damage taken on its cell | **Harden:** outputs destroy enemy bullets they touch | Defensive anchor |
| **Repair Node** | Heals 1 HP every 5s | **Mend:** kills by its neighbours drop small heal motes | Next to Arc Coil it gives Jumpstart |

**Scrap** *(my call)*: killed enemies drop small scrap motes. They're counted as "salvage" on the end screen; there's nothing to spend them on in the prototype. They give the Magnet a purpose and are the ammo for Coin Slinger.

---

## 11. Signature combos (15 in the prototype)

**Key part** is the ingredient unlocked as a **Blueprint start** when the combo is discovered (§13).

| # | Combo | Recipe (relation) | What you see | Surprise type | Key part |
|---|---|---|---|---|---|
| 1 | **Split Beam** | Beam Lance → Mirror (line) | The laser bends 90° and a second branch continues straight | The user's idea; light obeys the hull | Mirror |
| 2 | **Cluster Shell** | Bomb Pod touching Pulse Cannon or Needle Turret | Each bomb bursts into a ring of 12 bolts | The user's idea; payload | Bomb Pod |
| 3 | **Hall of Mirrors** | Beam Lance → 2+ Mirrors (line, not forming a Resonator) | Each Mirror splits the line again, so 3+ beams leave the hull at different points and directions, crossing the screen as a mesh | Scale explosion | Mirror |
| 4 | **Slug Round** | Pulse Cannon → Lens (line) | Three bolts fuse into a fat, slow slug that pierces everything | Fewer bullets, more kills | Lens |
| 5 | **Halo** | Beam Lance → Orbit Ring (line) | The laser bends into a spinning ring around the ship, turning a sniper weapon into a melee aura | Behaviour transfer | Orbit Ring |
| 6 | **Gravity Sling** | Pulse Cannon or Needle Turret → Orbit Ring (line) | Bolts park in a glowing ring and unload at point-blank range | Role inversion | Orbit Ring |
| 7 | **Afterburner Lance** | Thruster exhaust → Lens (line, behind the thruster) | The engine flame focuses into a long blue lance behind you | Role inversion: fleeing is attacking | Thruster |
| 8 | **Resonator** | Beam Lance → two Mirrors back to back with opposite orientations (line) | The gap glows hotter for ~3s, then a huge pulse fires out both ends | Showpiece | Mirror |
| 9 | **Trident** | Beam Lance → Prism (line) | A three-pronged laser | Easy early discovery | Prism |
| 10 | **Shatterstorm** | Cryo Turret touching Pulse Cannon or Needle Turret | Frozen enemies hit by bolts shatter into 6 freezing shards, chaining across the pack | State priming | Cryo Turret |
| 11 | **Jumpstart** | Arc Coil touching Repair Node | Enemies killed while Charged revive as cyan allies for 6s (max 10) | Enemy hijack | Repair Node |
| 12 | **Coin Slinger** | Magnet touching Pulse Cannon or Needle Turret | Nearby scrap is vacuumed up and fired as heavy piercing slugs | A joke combo that's secretly strong | Magnet |
| 13 | **Storm Seed** | Arc Coil touching Bomb Pod | Bombs land as lightning pylons that chain-zap for 4s | Payload | Arc Coil |
| 14 | **Porcupine** | Magnet touching Bulwark Plate | Enemy bullets that hit the Bulwark stick as spikes; at 20 they fire back in a ring | Enemy hijack, defence turned to offence | Bulwark Plate |
| 15 | **Grand Finale** (jackpot) | Bomb Pod touching a 2nd Bomb Pod and a Pulse Cannon, plus an Echo Coil touching either Pod | Bombs burst into bombs that burst into bolts, echoed: about 150 bolts per volley (capped) | Nesting × copying | Echo Coil |

- **Later, if time allows:** **Stutter Step** (Echo Coil touching Thruster) — a ghost ship trails 0.5s behind and re-fires the whole loadout.
- **Parked, not planned:** Comet Tail, Gauss Rail, Moon Mines, Contrail.

**Each discovered combo needs, for the Archive:** its name, a one-line AI-analyst "scan" quip (pre-written, in the onboard-AI voice), a recipe diagram drawn with the part shapes, and its key part.

---

## 12. The swarm and the run economy (approved; numbers to tune)

| Enemy | Look | Behaviour | Role |
|---|---|---|---|
| **Mote** | Tiny dot | Comes in packs and drifts toward you; dies in one hit | Fodder, the "mowing" feel |
| **Drone** | Triangle | Chases you; contact damage | The main source of parts |
| **Spitter** | Diamond | Keeps its distance and fires slow bullets | Gives Mirror, Bulwark and Porcupine something to work on |
| **Lancer** | Long hexagon | Telegraphs, then dashes in a straight line | Punishes standing still |
| **Carrier** | Big hexagon with turrets | Mini-boss about every **90s** | Drops **3–4 parts**, **always a Forge Uplink**, and **sometimes a hull repair core** |

- **Drops:** a new part every ~10–20s on average. Loose parts fade after about 10s. You choose what to bolt on by what you fly into.
- **Forge Uplink:** about every 60–90s, plus one from every Carrier.
- **First run seeding:** while the Archive is empty, the first few drops are scripted to make an early combo likely (e.g. Beam Lance, then Mirror, then Pulse Cannon, then Bomb Pod).
- **Escalation:** spawn rate and enemy mix ramp continuously. Spitters arrive at about 1:00, Lancers at about 2:30, and density and HP rise over time.
- **Run end:** the hull reaches 0 HP. There's no timer, and the run is endless.

---

## 13. Forge Uplink, end screen and hooks

**Forge Uplink (editor):**
- Picking it up **pauses the game** and shows the ship grid large.
- You can drag to move, rotate 90°, and jettison.
- Fixed and turret lines are drawn as faint lines so routing is visible. This shows *what affects what*, but gives **no combo hints**.
- Accept is blocked while any part is disconnected.

**Xeno Archive (codex, the core D1 hook):**
- A grid of 15 cards. Undiscovered cards show only **"??"**.
- A discovered card shows its name, recipe diagram and AI-analyst quip.
- Reachable from the title screen and the end screen.
- Persisted in **localStorage** *(my call)*.

**Blueprint starts (D1 hook):**
- Each discovered combo unlocks its **key part** (§11) as a starting option.
- Before a run, the player may choose **one** unlocked blueprint part to start with, bolted onto the front of the cockpit *(my call: 1 slot)*.
- This turns "found it by luck" into "this time I'll build it on purpose".

**Ship snapshot (D1 hook):** when the hull fails, the end screen renders:
- the final ship large, with glow
- run time, kills and salvage
- the combos discovered this run (new ones highlighted)
- Archive progress
- any Blueprints unlocked
- a **Save image** button (PNG export) and **Run again**, which is the default and most prominent.

---

## 14. Long-term metagame (roadmap for the writeup; not built)

1. **Star-map campaign:** sectors with distinct swarm strains, hazards (e.g. ion storms boosting electrical parts, asteroid fields) and sector bosses. It gives runs a destination.
2. **Archive seasons** every 4–6 weeks: a new part family (about 5 parts and 10 combos). The "??" wall refills, and it's the live-ops heartbeat.
3. **Hull unlocks:** cockpits with different grid shapes and built-in guns. Sideways choices, not more power.
4. **Ascension tiers:** opt-in difficulty modifiers.
5. **The AI layer** (deferred features in §15) arriving as major updates.
6. **Daily Signal and daily bounties** as the daily return loop for the live game.

---

## 15. AI

**In the prototype:** none at runtime (user decision). The onboard AI analyst is fiction with pre-written lines. Parts and combos are **structured data** (tags in, behaviour out) so AI features can plug in later *(my call)*.

**The AI-in-game vision (for the writeup), all deferred:**
- **A. AI analyst and global first discovery.** For strong stacks outside the 15 signatures, an LLM names the "uncatalogued anomaly" and writes lore from structured part data only. Results are cached globally, Infinite Craft-style ("First catalogued by Pilot 7F3A"). It changes text only, never mechanics.
- **B. Swarm Mind commander.** An LLM reads a summary of your build and designs a counter-ship from the same parts, with a taunt. Pre-built counter-ships are the fallback.
- **C. Offline AI part design.** An LLM proposes new parts and combos in the data schema. A validator, a headless balance simulation and a human gate check them before anything ships.
- **D. AI difficulty director.**
- **Safety rules for all of them:** no free-text input from players, schema-validated outputs, caching, offline fallbacks, and keys kept server-side.

**AI used to build it (for the writeup):** Claude Code for research (parallel research agents), design synthesis, code and debugging. The writeup must document this honestly, including what was edited or rejected.

---

## 16. Money (writeup only)

- **F2P.** The only ads are opt-in rewarded ones: 1 revive per run, or double salvage at run end.
- **A cosmetic store:** hull paints, beam colours, exhaust trails, Archive themes. A game about how your ship looks sells looks well.
- **An optional season pass** tied to Archive seasons, mostly cosmetic and generous on the free track.
- **Hard rule: never sell parts, combos or power.** Buyable combos kill the discovery fantasy.

---

## 17. Shipping (writeup only)

- **Test first** (5–8 player hallway tests):
  - Do players notice their first combo and **explain what caused it**?
  - Is time to first combo under 3 minutes?
  - Do they use the Forge Uplink deliberately?
  - Do they start a second run without being prompted?
- **Change direction if:**
  - combos are fun but unreadable → add hints and linking lines
  - the Forge Uplink feels like a chore → auto-arrange
  - one combo dominates → rebalance
- **Kill if:** there's no unprompted second run after two iterations, or soft-launch D1 stays under 25%.
- **Soft-launch numbers:**
  - D1 ≥ 35% and D7 ≥ 10% (benchmarks: top-quartile mobile D1 is about 26–30%; Survivor.io launched in the mid-40s)
  - ≥ 3 combos discovered on D1
  - runs per session
  - Archive completion curve
  - later: rewarded-ad opt-in and cosmetic conversion

---

## 18. Reference games (writeup material; the research is in `docs/q1/research/`)

| Game | Borrowed | Done differently |
|---|---|---|
| Captain Forever | Bolt-on salvage from kills; ship size as tension | No mouse fumbling under fire (auto-attach plus a paused Forge Uplink); the ship keeps its shape; a meta layer it lacked |
| Vampire Survivors | Auto-fire horde flow; a Collection of "??" | Combos come from physical placement, not level-up cards or chests |
| Noita | Order-dependent modifiers, payloads, copy operators | Made spatial and readable on a ship grid, with no silent failures |
| Nova Drift | Hidden combo unlocks emerging from builds | Combos are assembled spatially rather than drafted |
| Balatro / Isaac / Gungeon | General rules plus named recognised combos (a hybrid) | Recognition is a grid pattern (adjacency and line of fire) |
| Backpack Battles | Adjacency as the puzzle | Real-time, and no hint stars (yet) |
| Cosmoteer / Reassembly | Modular ships, firing arcs | Your own parts *transform* your shots rather than blocking them. Research found no shipped game where mirror parts on your own ship redirect your own weapons |

---

## 19. Technical decisions

- **Phaser 3** (user decision). *(My calls:)* TypeScript plus Vite, the latest Phaser 3.x, WebGL with Canvas fallback, Phaser postFX glow and bloom where available.
- **The combo engine is pure logic** (grid → traits, lines, recognisers), separate from rendering, and unit-tested *(my call: Vitest)*.
- **Parts and combos are defined as data** (JSON or TS objects).
- **Persistence:** localStorage for the Archive, Blueprints and best run. Every read and write is wrapped so a blocked storage doesn't break the game.
- **Audio:** synthesised SFX via WebAudio (jsfxr-style) and a simple synth loop. All audio assets must be CC0 or generated.
- **Build:** a static `dist/` with relative asset paths, for GitHub Pages under a repo sub-path. The game code lives in `q1-game/`.
- **Performance:** target 60 fps on a mid-range laptop with about 300 enemies and about 500 projectiles on screen. Pool everything, and cap combo outputs (Grand Finale, Hall of Mirrors, Echo).

---

## 20. Left to the builder

- Exact tuning numbers (damage, rates, HP, spawn curves, drop tables, trait strengths), within the intent above.
- Visual specifics of each part, enemy and effect within the neon-vector style and colour families.
- Enemy AI details, the spawn director implementation, and pooling.
- Code architecture, module layout and the test approach.
- Exact Forge Uplink UI layout (desktop and portrait phone).
- The writing of the AI-analyst quips and combo lore (to be reviewed by the user).

## 21. Open items

- None. The title is **MODULAR**.
