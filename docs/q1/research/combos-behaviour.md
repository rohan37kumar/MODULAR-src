# Ideation: behaviour, payload and transformation parts and combos

*Subagent ideation, 2026-10-29. Raw input for our synthesis, not decisions.*

## Shared rules
- **The cockpit has a weak peashooter,** so every modifier does something the moment it's picked up.
- **Every part has an output, even if it's latent:** thruster plume, bulwark "block" event, drone "heal" pulse. Modifiers can act on latent outputs, so role inversions come from the system rather than from scripts.
- **Notation:** `A + B` means the parts touch in any order. `A → B` means A is inner, closer to the cockpit. For payloads, the inner part carries and the outer part is the payload, so you nest by building outward.

## Base parts (17)
| # | Part | Alone | Look | Tags |
|---|---|---|---|---|
| 1 | Pellet Gun | Fast small bullets at the nearest enemy | Short yellow rectangle | weapon, projectile, kinetic, fast |
| 2 | Arc Laser | Short beam that locks onto the nearest enemy | Thin cyan rectangle | weapon, beam, energy |
| 3 | Bomb Pod | Slow bomb with a radius burst; a container by default | Orange circle, dark core | weapon, explosive, slow, container |
| 4 | Frost Lance | Slow piercing icicle, freezes for 1.5s | Pale-blue triangle | weapon, projectile, cold, pierce |
| 5 | Saw Disc | Boomerang blade that hits twice | Grey notched circle | weapon, projectile, kinetic, boomerang |
| 6 | Spark Coil | Lightning chains across 3 enemies and leaves them **Charged** | Purple circle inside a square | weapon, chain, electric |
| 7 | Payload Bay | Loads the outer neighbour's shot into the inner neighbour's shot. Alone: +25% damage to parts it touches | Hollow orange square | modifier, container |
| 8 | Orbit Ring | Shots from parts it touches orbit the ship once, then launch | Green ring | modifier, motion:orbit |
| 9 | Seeker Fin | Homing, and changes how the part picks its target | Pink triangle | modifier, motion:homing, targeting |
| 10 | Bounce Plate | Ricochets ×3. Alone it reflects bullets | White rectangle with a diagonal | modifier, motion:bounce, reflect |
| 11 | Echo Coil | Repeats the output 0.4s later at 60%. A visible heat ring; off for 3s when full | Magenta square inside a square | modifier, copy, heat |
| 12 | Volatile Cell | +50% fire rate. Explodes when you're hit (2 damage to you) | Yellow square with black stripes | modifier, power, explosive, volatile |
| 13 | Bulwark Plate | Blocks one hit every 5s | Thick grey rectangle | defense, block |
| 14 | Thruster | +30% speed; the plume singes enemies | Orange triangle with a trail | utility, motion, fire, latent-output |
| 15 | Repair Drone | Tethered drone, 1 HP every 10s | Green circle with a cross | utility, drone, heal |
| 16 | Tractor Beam | Grabs a small enemy or bullet and holds it 1s as a shield | Violet fan | utility, beam, grab |
| 17 | Magnet Node | Pulls in pickups and loose parts | Red and blue circle | utility, field, magnetic |

## Combos (30)
Markers: RI = role inversion · HJ = enemy hijacking · JP = jackpot · JK = joke that's secretly OP · SR = self-risk · CV = conversion · CP = copy

| Combo | Ingredients | On screen | Surprise | Wow | Cost |
|---|---|---|---|---|---|
| Popcorn Shell | Bomb Pod + Pellet Gun | The bomb pops into a ring of 12 pellets | The Bomb Pod is secretly a container; found by accident | 3 | S |
| Tick Swarm | Pellet → Bay → Bomb Pod | Pellets stick in targets, blink, then pop | Reversed order gives the opposite result | 3 | S |
| Lighthouse | Bomb Pod + Arc Laser | The bomb lands as a spinning laser sprinkler | A beam payload with no aim spins | 4 | M |
| Lightning Yo-yo | Saw → Bay → Spark Coil | The saw zaps at the far end and on its way back | A boomerang has two release points | 3 | M |
| Matryoshka (JP) | Bomb → Bay → Saw → Bay → Frost | The bomb bursts into 6 saws that spray icicles | Nested two deep | 4 | L |
| Halo | Orbit Ring + Arc Laser | The beam becomes a rotating ring around the ship | Orbit applied to a beam: a sniper weapon becomes a melee aura | 5 | M |
| Laser Cage | Bounce Plate + Arc Laser | The beam ricochets off screen edges in a lattice | Bounce applied to an instant beam | 4 | M |
| Moon Mines | Orbit Ring + Bomb Pod | A belt of up to 8 orbiting bombs | A slow shot plus orbit never leaves | 3 | S |
| Shatterstorm | Frost Lance + any kinetic weapon, anywhere | Frozen enemies burst into freezing shards | A status rule that needs no adjacency | 4 | S |
| Domino Grid | Spark Coil + Bomb Pod | Charged enemies explode on death and Charge their neighbours | A self-spreading mark | 4 | S |
| Junk Ball | Magnet + Spark Coil | Struck enemies clump into a rolling crusher | Pull plus chain makes physics | 5 | M |
| Backfire (RI) | Thruster + Seeker Fin | The exhaust swings toward enemies like a flamethrower; the recoil kites | Homing on a latent output | 4 | S |
| Riot Frisbee (RI) | Bulwark + Saw Disc | Each block throws a ghost plate as a boomerang | Defense inherits the boomerang | 3 | S |
| Bedside Manner (RI) | Repair Drone + Seeker Fin | The drone overheals an enemy until it pops for 50% of its max HP | The Seeker changes the *target rule* | 4 | M |
| Return to Sender (RI, HJ) | Tractor + Bomb Pod | The grabbed enemy *is* the bomb | Enemies count as payloads | 4 | M |
| Coin Slinger (RI, JK) | Magnet + Pellet Gun | Loot is fired as piercing ammo, and XP still counts | Throwing money that's secretly collection | 3 | S |
| Overthinker (RI, JK) | Repair Drone + Bomb Pod | Bombs are "repaired" into up to 40 floating mines that go off when you're hit | The healer sabotages your weapon | 4 | S |
| Jumpstart (HJ) | Spark Coil + Repair Drone | Charged kills come back as allies for 6s | A defibrillator | 5 | M |
| Porcupine (HJ) | Magnet + Bulwark | Enemy bullets stick as spikes; at 20 they fire back in a ring | The shield becomes a magazine | 4 | M |
| Doppelganger (HJ, CP) | Echo + Tractor | The grabbed enemy is copied as an ally | A copy operator on an enemy | 4 | M |
| Stutter Step (CP) | Echo + Thruster | A ghost ship trails you and re-fires your loadout | An echo of movement echoes the whole ship | 5 | M |
| Feedback Loop (CP) | Echo + Echo + a weapon | ×4 copies, 3× heat; overheat self-damage unless a Bulwark is attached | Visible cost | 3 | S |
| Reactive Armour (SR) | Volatile Cell + Bulwark | Every hit sets off a huge nova and does no damage to you | Mitigation turns a liability into a nova | 4 | S |
| Hiccups (SR, JK) | Volatile Cell + Repair Drone | A perpetual nova every 1.5s that nets out to zero HP | Healer plus bomb | 3 | S |
| Battering Ram (CV) | Thruster + Bulwark | Ram damage = speed; kills refund the boost | Speed becomes damage | 3 | S |
| Junk Armour (CV) | Magnet + Saw Disc | Wreckage bolts on as temporary blocks | The game's own attach rule applied to corpses | 4 | M |
| Grand Finale (JP) | Bomb → Bay → Bomb → Bay → Pellet, + an Echo | 1 bomb → 6 bombs → 72 pellets, about 150 when echoed | Nesting multiplied by copying | 5 | M |
| Planet Smasher (JP) | Junk Ball + Tractor + Orbit | A growing flail of crushed enemies | Three kinds of pull stack | 5 | L |
| Mutiny (JP, HJ) | Jumpstart + Echo + Seeker | Allies' kills revive too, so the horde changes colour like a wave | Conversion feeds itself (cap 30) | 5 | L |
| Entourage (JP, CP) | Stutter Step + Echo + Orbit | 3 ghost ships orbit you, firing | Orbit applied to ghosts | 5 | L |

## Engine: tags in, behaviour out
Combos are named recognisers for results the rules already produce.
1. **Motion transfer:** `motion:X` sets the motion of the parts a modifier touches (orbit, homing, bounce, boomerang), latent outputs included.
2. **Containers:** chains walked from inner to outer, up to depth 3. The carrier type sets when the payload is released (projectile on hit, bomb on burst, saw at both ends of its throw, grab on throw). A payload with no aim spins or bursts radially.
3. **Status reaction matrix:** frozen×kinetic = shatter, charged×death = explode, magnetised×magnetised = clump, charged×heal = revive.
4. **Target-selector swap:** each part has a verb and a selector, and Seeker flips the selector to any faction.
5. **Echo:** repeats any output or event with a delay and a damage multiplier, plus heat. Copies keep their modifiers.
6. **Conversion:** a source (speed, missingHP, kills, blocks, pickups) feeds a sink (damage, armour, ammo).

Special code is needed for faction flip, ghost ship, clump physics, an entity used as a projectile, stick-and-count, and temporary grid cells.

**Data model:** codex entries are pure data built from a closed set of operations (`setMotion`, `payload`, `setSelector`, `statusReaction`, `echo`, `convert`, `factionFlip`, `spawnGhost`, `clump`) with typed parameter ranges and caps. At runtime each result gets a canonical signature, and a match unlocks the codex entry.

**AI fit:**
1. **Runtime naming:** an LLM names unseen signatures, the result is cached, and it changes only text.
2. **Offline generation:** an LLM proposes schema entries, a validator and headless simulation check them against a power budget, and a human approves. The LLM never writes code.

## The agent's 2-day pick (10)
Popcorn Shell, Tick Swarm, Lighthouse, Grand Finale, Halo, Backfire, Shatterstorm, Jumpstart, Reactive Armour, Coin Slinger. They use 14 of the 17 parts; Saw Disc, Bounce Plate and Tractor can be cut.

---

## Revision: many-to-many synergies (after the user's constraint)
**Four rules:**
1. Every part gives one **trait** to everything it touches. Every part has an output (real or latent: exhaust, block event, heal pulse) that receives traits.
2. Plain adjacency works **both ways at about 40%**. A Payload Bay makes it one-way at 100%.
3. **A trait's reading depends on the output kind:** shot, beam, stream, burst, body or event. Orbit on a bullet is mild, while orbit on a beam is a laser ring.
4. **Signatures** are the pairings where that reading is most dramatic, and they get a name and a codex entry.

Each trait has a colour. Parts show a pip for each trait they're receiving, and outputs get a matching tint or trail. The cockpit peashooter also takes traits.

| Part | Generic trait given to any neighbour | Signature partners |
|---|---|---|
| Pellet Gun | Shrapnel: outputs shed 2 pellets at the end | Bomb, Frost, Magnet |
| Arc Laser | Tether: a damaging line from the ship to each output | Orbit, Bounce, Bomb |
| Bomb Pod | Warhead: outputs pop at the end | Pellet, Laser, Spark, Orbit, Repair, Tractor |
| Frost Lance | Chill: slows; 3 stacks Freeze | Pellet, Saw, Thruster |
| Saw Disc | Return: outputs come back and hit again | Bulwark, Magnet, Spark, Frost |
| Spark Coil | Charge: Charges targets, +1 arc | Repair, Magnet, Bomb, Saw |
| Payload Bay | Load (one-way, 100%), works on latent outputs too | Every weapon |
| Orbit Ring | Orbit (alone: pushes enemies away) | Laser, Bomb, Tractor |
| Seeker Fin | Seek; utility parts can pick any faction (alone: marks elites +20%) | Thruster, Repair |
| Bounce Plate | Bounce | Laser |
| Echo Coil | Echo 0.4s at 60%, with a heat ring | Thruster, Tractor, Echo |
| Volatile Cell | Overcharge: +50% rate and size | Bulwark, Repair |
| Bulwark Plate | Harden: outputs absorb a bullet; no self-damage | Volatile, Saw, Magnet, Thruster |
| Thruster | Ignite: fire trails, Burning | Seeker, Echo, Bulwark, Frost |
| Repair Drone | Mend: neighbours' kills drop heal sparks | Spark, Seeker, Bomb, Volatile |
| Tractor Beam | Pull: drags enemies to the impact point | Bomb, Orbit, Echo |
| Magnet Node | Magnetise: targets drift together; outputs drag pickups | Spark, Pellet, Bulwark, Saw |

**Trait × output-kind table (excerpt):** 17 traits × 6 kinds is about 100 cells, each with a fallback (+20% stat and a tint).
| Trait | Shot | Beam | Stream | Burst | Body | Event |
|---|---|---|---|---|---|---|
| Orbit | circles once | **Halo ring** | fire spiral | rotating nova | grabbed enemy swung as a flail | block arc circles |
| Bounce | ricochet ×3 | **Laser Cage** | splashes | re-hits | pinball enemy | reflects bullets |
| Echo | repeats | second pulse | second plume | double pulse | **Doppelganger** | second block or heal |
| Charge | Charges | Charges | electric exhaust | arcs | drone zaps | **blocks zap the attacker** |
| Magnetise | clumps | pulls along the beam | sucks pickups | implodes, then explodes | pickups orbit | blocked bullets stick |
| Seek | homes | sweeps to packs | **Backfire** | favours elites | **targets any faction** | block fires at the shooter |

**Matrix summary:** 153 pairs. 33 are signatures (about 22%), 8 same-part pairs are stat-only fallbacks, and the remaining 112 are visible generic effects, so about 95% do something visible. Every part has at least 1 signature, and most have 3–4.

**New combos in this revision:** Contrail (Frost + Thruster: the exhaust freezes into ice walls, so steering draws barriers; wow 4, S) and Flail (Orbit + Tractor: the grabbed enemy is swung around the ship; wow 4, M).

**Engine order each frame:** trait pass (adjacency at 0.4, Bay at 1.0) → interpretation lookup → ship-wide status reactions (Frozen×kinetic shatter, Charged×death explode, Magnetised×2 clump, Charged×heal revive, Burning×Frozen steam) → signature recognisers (codex unlock plus an optional override).

**Prototype:** build the trait pass and the interpretation table with fallbacks for 14 parts first (cut Saw, Bounce, Tractor), so every pair works on day 1. Then add the same 10 signatures. They need only 2 special systems: faction flip and an entity used as a projectile.
