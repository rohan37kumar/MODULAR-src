# MODULAR: Q1 writeup

**Play:** https://rohan37kumar.github.io/MODULAR-src/ (desktop browser first; phone works in portrait)
**Code:** https://github.com/rohan37kumar/MODULAR-src

**Controls:** WASD or arrows to steer; weapons fire by themselves; Esc or P pauses. In the Forge Uplink, drag a part to move it, R or right-click to rotate, X or drag it to the bin to jettison, Enter to accept. On a phone: a floating virtual joystick, a pause button, and touch-drag in the Forge.

---

## 1. Pitch

MODULAR is a top-down neon survivor-like where your build is a physical object. You start as a bare cockpit with a pea-shooter. Swarm drones drop alien tech, and flying into a part welds it to your hull wherever it touched. Weapons and modifiers are octagons that weld edge to edge; the eight support parts are small square nodes that slot into the gaps where four octagons meet and feed all four at once. Touching parts share traits, and parts in front of a muzzle transform every shot that passes through them, in order. A Mirror in front of a Beam Lance bends the laser 90° while half of it carries straight on. A Thruster node beside a Lens turns your exhaust into a lance, so running away becomes an attack. There are 20 parts and 21 named combos to find.

**Who it's for:** players of Vampire Survivors, Survivor.io, Brotato and Nova Drift who play for the moment a build breaks. A run is 5–10 minutes, which is a phone session.

**Why play it:** in survivor-likes the build is a stack of level-up cards. You choose *what*, never *where*. In MODULAR, position is the build: the same five parts make a different ship depending on which cell or gap each one sits in and which way it faces. The genre's "eureka" gets a cause you can see on your own hull and rebuild on purpose next run. In the fiction nobody understands the swarm's tech, so a strange result reads as a discovery rather than a bug.

## 2. Core loop & first session

**Moment to moment:** steer → kill → fly into a dropped part → it bolts on → a trait tints your shots or a modifier reshapes them → a named combo fires → the swarm escalates → a Forge Uplink pauses the game so you can rearrange → repeat until the hull fails.

- **Auto-attach, plus a paused editor.** Under fire, parts attach themselves, so early combos happen by accident. A Forge Uplink (every 60–90 s, and from every Carrier mini-boss) pauses the game for one free edit: move, rotate, jettison. Accident first, intent second.
- **The Forge is a workbench, not a menu.** It's a hologram grid over the frozen, dimmed fight. Light pulses flow from each muzzle along its route in the weapon's colour and update while you drag, so you see where a shot will go before you accept. A combo you've already discovered lights up in gold over its parts. Undiscovered ones never glow, so it's a reminder, not a hint. Tap or hover any part and a card beside the grid says, in plain words, what it is (gun, shot changer or booster), what it does and where it works best. A selected square node draws spokes to the 4 spots it boosts: bright to a part, dotted to an empty spot. In flight, every node keeps faint spokes in its own colour into the parts it boosts.
- **Two shapes, two jobs.** Weapons and modifiers (and the Mimic) are octagons. They weld edge to edge and form the lines of fire. The eight support parts (Orbit Ring, Echo Coil, Thruster, Magnet, Bulwark Plate, Repair Node, Overclock, Relay) are small square nodes that slot into the gaps where four octagons meet, and each one feeds all four. One Overclock between four guns overclocks all four. One Orbit Ring between two Beam Lances makes two Halos. Nodes never sit in a line of fire, so a support part can't block a shot. An Orbit or Echo node hands the guns it touches the effect it used to give a shot passing through it, so Halo is now "an Orbit node touching a Beam Lance". A Bulwark node shields the four octagons around it. [CONFIRM: one line on why you made this change, in your words.]
- **Size is the tension.** Every part is hitbox on a grid capped at 7×7 octagons (nodes fill the 64 gaps between them and are small targets), so more guns means a bigger target. The camera eases out as the ship grows (to 0.85× zoom at a full 7×7, a little more while a Carrier is alive), so a big ship still has room to see what's coming. Parts are never knocked off; the hull just loses HP. Losing the part that made your combo would punish the one thing the game asks you to care about.
- **The swarm punishes straight lines.** The Shielder (40 HP) carries a 120° shield arc that swings toward your cockpit at 120°/s. Bolts and beams from the front stop dead on it. Splash, arc chains, burn and anything hitting from the side or back go through: a returning Saw blade, a Mirror's bent beam, a Relay hop from another corpse. The shield shatters after about 120 absorbed damage, so a plain gun gets there about four times slower. That gives the Forge a job: rebuild for angles.
- **Carriers are three-phase fights.** At 66% and 33% HP a Carrier sheds its outer modules, knocks small enemies back and drops a bonus part. P1 fires aimed spreads, P2 spins a 360° bullet spiral, P3 is a bare red core that charges you. The first Carrier only plays P1 → P2 (one change, at 50%) so the intro stays gentle. Every Carrier drops 2–3 parts and a Forge Uplink when it dies.
- **A random bolt-on never makes you weaker.** Traits are never harmful, and non-modifier parts in a firing line are transparent.

### The first session

While the Archive is empty, the first drops are scripted (Beam Lance, Mirror, Pulse Cannon, Bomb Pod), so a reviewer who plays once still sees a combo.

| Beat | Target | Task 22 (the original 15-part build, 3 runs) | After the addendum re-tune (before square nodes) |
|---|---|---|---|
| First part drops | ~0:15 | 0:13–0:17 | 0:14–0:28 |
| First combo: slow-mo, a stinger, a line linking the cells, a banner, "Xeno Archive 1/21" | ≤ 3:00 | 0:31–1:09 (Split Beam twice, Cluster Shell once) | 0:28–1:06 (Split Beam in 4 of 5 runs) |
| First Forge Uplink, with a one-line tutorial | 1:15–1:45 | 1:16–1:17 | unchanged (same seeded timer) |
| First Carrier killed (arrives at 1:30) | — | 1:54–2:11 | 1:43–2:02 |
| First Shielder ("SHIELDED CONTACT") | ~2:30 | not in that build | 2:48–3:02 |
| Hull fails; end screen | 6–10 min | 6:14, 6:27, 8:28 | 2:42–3:34 as first built; **8:41** after the re-tune (one confirming run; see below) |
| Combos logged in the run | ≥ 3 | 6, 5, 2 | 1–3 as first built; 8 in the 8:41 run |

Every run starts on a cleared save, so it's the seeded first run. The scripted pilot flies to parts, flees crowds, accepts every Forge without rearranging and never dodges. It's a lower bound on a human, not a stand-in, and a human who uses the Forge on purpose should find more combos than it does.

**What the playtests changed.**
- **The cockpit gun.** It first fired straight ahead, aimed by steering, and the pilot managed **4 kills by 0:30**. Keyboard steering has 8 headings 45° apart, so a nose gun can be 22.5° off: a ~115 px miss at 300 px against a 10 px Mote. An auto-aimed pea-shooter got **32 kills**. The Pulse Cannon and Beam Lance still aim by steering (with a ±25° assist), because steering a Split Beam into a crowd is where the skill lives.
- **The first Carrier.** It emptied a full hull in ~11 s, so I cut its bullet damage from 8 to 5. It still took one run from 100 hull to 22, so the first Carrier now fires every 4.5 s instead of 3 s. The next run lost 18.
- **The other end of the run.** A 30-part ship out-scaled a linear swarm and was still at full hull at 10:00, so after 4:00 the spawn budget and enemy HP now grow with the square of the minutes. That leaves a sharp 4:00–5:00 cliff in two of three runs, which I want a human to judge.
- **The first minute.** The first qualifying kill after 0:12 always drops a part, and pickups drift in from 90 px, so grazing a part collects it. One run missed its parts and died at 1:58 with three.

The addendum (the Shielder, Carrier phases, five new parts) broke the pacing: the same pilot died at 2:42, 3:19 and 3:34. A damage log found two causes. A Carrier ram did 20 every half second while it sat on the hull (one P3 charge took 61 hull in about a second), and the first Carrier's volleys plus its new P2 spiral could take 75 hull from a small ship. Rams now hurt once (12 damage, a 1.5 s cooldown, a knockback, and the charge ends on impact). Later Carriers spiral more thinly, the late surge starts at 5:00 instead of 4:00, and Carriers drop a repair core 75% of the time instead of 50%. The next run lasted 8:41 with 8 combos. I then softened only the first Carrier (volleys every 6 s instead of 4.5 s) after one more run lost 76 hull to it; that last change hasn't had its own confirming runs yet. All of these numbers predate the square-node change, which lets a ship carry 64 small support parts on top of 49 octagons; the game hasn't been re-tuned since.

**What brings them back tomorrow:** most of the 21 combo cards still "??" (the pilot logged 2–6 per run), unseen modules on the MODULES tab, a Blueprint for chasing the combo they half-understood, and a picture of the ship they died in.

## 3. Progression & metagame

### The day-1 hooks I built

1. **Xeno Archive (the core hook).** 21 combo cards, each "??" with no hint until its combo first fires. Then it shows the name, a recipe diagram and the analyst's line, and it survives death. A second tab, MODULES, has one card per part (20 plus the cockpit): what kind of part it is, what it does alone, what it gives the parts it touches, what it does to shots passing through, and a placement tip ("Between guns"). A module stays "??" until it first bolts on. It explains parts, never combos, so the no-hints rule holds. The bet is that a combo you stumbled into and then understood is worth more than one you were told about. Section 6 names the fallback if that's wrong.
2. **Blueprint starts.** Each discovery unlocks its key part as an optional starting part on the cockpit's nose (Split Beam unlocks the Mirror; Ricochet unlocks the Saw). There's one slot, so run 2 is *different*, not easier. "That happened by luck" becomes "this run I'm building it".
3. **Ship snapshot.** The end screen shows your final ship large and glowing, with time, kills, the combos found (new ones highlighted) and Archive progress, plus a PNG **Save image**. **Run again** is the biggest button.

**Rejected for day 1:**
- **Daily bounties** hand a newcomer a chore before they have a reason to care.
- **Permanent stat upgrades** make run 2 easier, not different, and move power off the hull into a menu.
- **Near-miss hints** contradict the no-hints rule. They're held back as the first fix.

### What keeps someone playing for months

The engine makes content cheap. 20 parts give 190 pairs; every pair does *something* by rule, and 21 combos are named. The addendum was a dry run of a content season: five parts (Saw, Hook, Overclock, Relay, Mimic) added 85 pairings to the original set, six of them named, and the old parts gained partners instead of retiring. The next 5-part family would add 110.

1. **Archive seasons every 4–6 weeks**, the live-ops heartbeat. Each brings ~5 parts and ~10 combos, and the "??" wall refills.
2. **Star-map campaign:** swarm strains, hazards (ion storms boost electrical parts) and sector bosses, giving runs the destination Captain Forever lacked.
3. **Sideways depth:** hull unlocks with different grid shapes, and opt-in Ascension tiers.
4. **The AI layer** (5b), which makes the wall open-ended.
5. **Daily Signal and bounties**, once there's a live audience to bring back.

## 4. Money

Free-to-play, with three streams and one hard rule.

| Stream | What | Why it isn't a cash grab |
|---|---|---|
| Opt-in rewarded ads | One revive per run, or double salvage at run end | The player triggers them. Never mid-fight or in the Forge, and no interstitials. |
| Cosmetic store | Hull paints, beam colours, exhaust trails, Archive themes | The shareable object is a picture of your ship, so looks have real value |
| Optional season pass | Tied to Archive seasons; mostly cosmetic, generous free track | New parts and combos are free for everyone. The pass sells how they look. |

**Never sell parts, combos or power.** Once a combo can be bought, "??" becomes a price list, and the discovery that drives day 1 is gone for payers and cheapened for everyone else.

- **Vampire Survivors mobile** is the model: free, with optional ads for a revive or bonus gold, plus $1.99 DLC. Players took it well.
- **Survivor.io** shows the ceiling and the price: ~$75M in two months, ~$500k a day from ads, and constant pay-to-win complaints about its gear gacha. I'd take the ad placement and skip the gear wall.
- **Balatro** ($9.99) and **Brotato** ($4.99) prove premium works here, and my research leaned that way. I chose F2P because Lila ships F2P and cosmetics hang off the snapshot. The cost is that F2P only pays if retention hits the Section 6 targets.

"Double salvage" assumes the live game adds a salvage currency spent on sideways unlocks like hulls. The prototype has none: scrap drops were cut after a phone playtest, because they cluttered the screen and did nothing for most players.

## 5. AI

### 5a. How I used AI to build it

I used Claude Code in a fixed order: brainstorm, design doc, implementation plan, code. No code was written until I'd approved the doc and the plan. Every creative and scope call was mine and is logged with a date. Defaults Claude picked are marked "my call" in the design doc so I could overrule them.

- **Research:** six parallel agents covered Noita's wands, reference games, combo systems in a dozen games, Lila and AI-in-games, and two ideation passes that produced 58 combos. I brought the seed (Captain Forever's building, Vampire Survivors' horde, Noita-style combos) and cut 58 to fifteen. Shape combos (loops, symmetry, spin physics) went because they'd be unreadable at speed. A second pass over my own inspiration notes went through the same brainstorm → design → plan loop and added five parts, six combos, the Shielder and three-phase Carriers.
- **Design:** Claude asked one multiple-choice question at a time, each with a recommendation. I rejected the name XENOFORGE but kept its world, and I ruled out hints and knocked-off parts. I also set the many-to-many rule: no part is locked to one partner.
- **Code:** the combo engine (grid with its octagon cells and node gaps, traits, routing, recogniser, shot compiler, plus the addendum's Mimic resolution, Hook carrier/payload graph, Shielder arc test and Carrier phases) is pure TypeScript, separate from Phaser and written test-first: 236 tests. Parallel agents wrote isolated modules (enemies, the Forge editor, part icons and their octagon redraw, sound, quips and module cards), and the main session re-read and re-ran everything they produced.
- **Testing:** Claude drove the game in my browser, including the scripted pilot. I made the calls its numbers raised.

**Three design problems caught before any code:**
- **Mirrors vs turrets.** Turrets auto-aim, so a Mirror in front of one would do nothing. The fix is "conduit, then aim": the shot travels the line of parts *inside* the hull, changes at each modifier, and aims from wherever it exits. A Mirror gives it two exits.
- **Signatures duplicating rules.** The first draft coded each named combo separately, repeating the general rules. Now the rules produce the effect, and a signature adds the name, the announcement, the Archive card, the Blueprint, about +50% strength and a visual flourish. Only six of the original set need dedicated code.
- **A shield nobody could break.** The Shielder's arc turns to face the cockpit, so almost all of a normal ship's fire (turrets, the pea-shooter, Mirror exits a few cells off-centre) lands inside it, and circling is slower than its 120°/s turn. A ship without a Bomb Pod or Arc Coil could never kill one. Now the shield shatters after ~120 absorbed damage: straight fire works at about a quarter of the speed, and combos clearly win.

**Bugs only play revealed:**
- Turrets missed orbiting Spitters until their shots led the target.
- Coin Slinger never fired, because scrap was collected at the ship's centre before it reached the Magnet.

### 5b. Is AI part of the game?

Not at runtime in this prototype, by decision, but the slot exists. The onboard analyst names each combo in a clipped, clinical voice ("Scrap is now ammunition. Filed under unserious. Revising: kill rate is serious."), using 21 pre-written lines.

**Why none ships yet:**
- A reviewer's one click must work every time. A static GitHub Pages build can't hold an API key, and a proxy adds a server, rate limits and a failure point.
- Latency is 1–5 s, so a model can only run between waves or in the paused Forge.
- The prototype tests one question, whether spatial combos are fun, and an AI layer would muddy the answer.

**The plug-in point:** parts and combos are data, tags in and behaviour out. The engine compiles the ship into shot specs (a closed set of typed fields: shape, damage, count, spread, pierce, orbit, echoes), and signatures are pattern-matchers over the grid. A model can produce *data* inside that schema, never code, and a validator clamps it.

| Option | What it is | My take |
|---|---|---|
| **A. Analyst + global first discovery** | A model names strong unnamed stacks (a Needle Turret behind a Lens fuses darts by rule but has no name) from structured part data. Cached globally, Infinite Craft-style: "First catalogued by Pilot 7F3A". Text only, never mechanics. | Build first. Cheap and proven, and 21 cards become an open-ended wall. |
| **B. Swarm Mind commander** | A model reads your build and designs a counter-ship from the same parts, with a taunt. Pre-built counters are the fallback. | The one that makes MODULAR an *AI game*: the enemy studies you. The Shielder is a hand-made, one-size counter; this would tailor one to you. Highest fun, highest balance risk. |
| **C. Offline part design** | A model proposes parts and combos in the schema. A validator, a headless balance simulation and a human gate check them. | A production tool for Archive seasons. Players never see the model. |
| **D. Difficulty director** | Adapts pressure during a run | Weakest. The heuristic spawn director already does most of it. Better as a churn model on real data than as an LLM. |

**Safety rules for all four:** no free-text player input, schema-validated JSON out, a global cache keyed by sorted part IDs (so each combination is paid for once), an offline fallback ("Unidentified Synergy #47"), and keys held server-side.

## 6. Shipping

**Test first:** a hallway test with 5–8 players on cleared saves and no instructions.

| Question | Pass looks like |
|---|---|
| Do they notice their first combo and explain what caused it? | They point at the parts. "Something happened" means the hook is dead. |
| Time to first combo | Under 3:00 |
| Do they use the Forge deliberately? | They move a part towards a goal, not just press Accept. After their first Shielder, they rebuild for angles or splash. |
| Do they start a second run unprompted? | They press Run again before I ask |

**Change direction if:**
- **Combos are fun but unreadable:** add partial hints and stronger link lines, even though that breaks the no-hints rule.
- **The Forge feels like a chore:** offer auto-arrange.
- **One combo dominates:** rebalance it.

**Kill it if:** there's no unprompted second run after two iterations, or soft-launch D1 stays under 25%.

**Soft-launch numbers:**

| Metric | Target | Context |
|---|---|---|
| D1 retention | ≥ 35% | GameAnalytics, all mobile: median ~22%, top quartile ~26–30%. Survivor.io launched in the mid-40s. |
| D7 retention | ≥ 10% | Median under 4%, top quartile 7–8%. Ambitious; I found no published survivor-like D7. |
| Combos discovered on D1 | ≥ 3 | The leading indicator for the Archive |
| Runs per session; Archive completion curve | Baseline | Is "one more run" real, and where do players stall? |

Ad opt-in and cosmetic conversion come later, once retention holds.

If I could watch only two numbers, they'd be **D1** and **combos discovered on D1**. The second should predict the first. If they move independently, the Archive isn't the hook I think it is.

## 7. Reference games

[CONFIRM: mark which of these you played yourself and which you studied through wikis, reviews and videos.]

| Game | What I pulled apart | Borrowed | Did differently |
|---|---|---|---|
| **Captain Forever** | Parts from kills, mouse-snapped mid-fight. Reviews: clunky building, no progression. | Salvage bolt-on; size as risk | Auto-attach plus a paused Forge; the ship keeps its shape; a meta layer |
| **Vampire Survivors** | Evolutions found by accident or on wikis; a "?" collection | Horde flow; the "??" collection | Combos come from placement, not level-up cards |
| **Noita** | Wands as ordered programs: modifiers change the next spell, triggers carry a payload, copy spells repeat it. Chainsaw turns a junk spell into a fire-rate engine; Divide By has a recursion cap. Its flaws: silent failures, and shuffle hiding cause and effect. | Order along a firing line; payloads (Bomb Pod, and the Hook as a trigger: shots through it release the touching gun's payload on impact); a copy operator (Echo Coil); Chainsaw as Overclock (3× rate, 0.5× damage); a copy cap (a Mimic never copies a Mimic) | Spatial and readable: every pairing visibly does something, and the Hook draws a tether from payload gun to carrier line |
| **The Binding of Isaac** | Items that replace your shot type and stack into hybrids (Tammy's Head + Brimstone fires a ring of lasers) | Parts that change *what* a gun fires, not just its numbers | Split what fires (weapons) from what changes it (modifiers and utility parts), so every hybrid has a visible cause on the hull |
| **Balatro, Gungeon** | General rules plus a naming layer; Gungeon's "key item + any one of a set" | That hybrid. Cluster Shell takes a Pulse Cannon *or* a Needle Turret. | Recognition is a grid pattern: touching (edge to edge, or a node on a corner), or in line in order |
| **Breath of the Wild** | The chemistry engine: fire, wind and electricity act on anything with the right property, not on authored pairs | The many-to-many rule: a part's touch trait works on every neighbour that can use it | One verb per part, with 21 named highlights on top of the rules |
| **Katamari Damacy** | Whatever you roll over sticks, and the camera pulls back as you grow | Sticking on contact; the camera eases out as the ship fills its grid | Growth is risk as well as power: every part is hitbox, and the grid stops at 7×7 |
| **Risk of Rain 2** | Items proc other items, and each link in a chain is weaker than the last | Decay on chains: a Relay hop fires on a kill at 100%, then 50%, then 25% | One visible shot jumping corpse to corpse, projectile guns only, capped at 8 hops |
| **Ball x Pit** | Two level-3 balls fuse into a new, named ball by fixed recipe (Burn + Iron makes Bomb) | The payoff of a named discovery | Names are recognised from what you built, with no recipe to queue and no level gate |
| **Nova Drift** | Super mods from hidden prerequisite pairs | Hidden combos emerging from a build | Built on the hull, not drafted from walls of mod text |
| **Backpack Battles** | Adjacency as the puzzle, with hint stars. Its trap: many combos are only bigger numbers. | Adjacency | Real-time, no hint stars, and every combo changes behaviour, not just stats |
| **Cosmoteer, Reassembly** | Block-built ships with firing arcs; Reassembly's fixed guns are hard to aim | Modular ships | Your parts *transform* your shots instead of blocking them |

Edmund McMillen has called missing item descriptions Isaac's biggest flaw. That's why every MODULAR combo is named, announced and linked on screen the first time it fires, and why every part gets a plain-language card in the Archive.

**Originality:** research across modular-ship games found no shipped game where mirror parts on your own ship redirect your own weapons. That's the mechanic I'd defend as MODULAR's own, though "not found" isn't proof it doesn't exist.

---

## Assumptions

- Reviewers will play one or two runs on desktop, so the first run is seeded. Phone play is secondary.
- There's no backend. Progress is saved in the browser, so clearing site data resets the Archive.
- Money, the long-term metagame and in-game AI are designed, not built.
- Lila ships mobile F2P, so the audience, money and metrics are framed for mobile F2P even though the prototype runs on the web.
- Tuning numbers are starting points. The measured timings come from a scripted pilot (Task 22 and the addendum re-tune, both in `docs/q1/playtest-notes.md`), not from human players. [CONFIRM: add any human playtest data.]

## AI use & sources

- **Tools:** Claude Code (Anthropic) [CONFIRM: model/version] for research, design synthesis, all code and tests, browser testing, the analyst quips, the module cards and this writeup's first draft.
- **AI output:**
  - The research summaries were agent-produced and spot-checked by me [CONFIRM].
  - The design doc and its addendum put my logged decisions into AI-drafted prose.
  - The code was AI-written to my approved plans and verified by tests and play.
  - The quips and module cards were AI-drafted and reviewed by me.
  - This writeup was drafted by Claude and rewritten by me.
- **Mine:** the seed concept, the inspiration notes behind the addendum, every logged design and scope decision, and the final edit.
- **Sources:** GameAnalytics 2025 mobile benchmarks; Naavik and mobilegamer.biz (Survivor.io); pocketgamer.biz, TouchArcade and AppleInsider (Vampire Survivors, Brotato, Balatro); the Noita, Gungeon and Isaac wikis; PC Gamer (Infinite Craft); Jayisgames and Game Developer (Captain Forever); Ball x Pit's evolution recipes (stevivor.com/guides/ball-x-pit-ball-evolutions-guide-all-ball-combinations). Other full URLs are in `docs/q1/research/`.
