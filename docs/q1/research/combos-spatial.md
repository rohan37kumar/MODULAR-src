# Ideation: spatial and geometric parts and combos ("HULLCRAFT" lens)

*Subagent ideation, 2026-10-29. Raw input for our synthesis, not decisions.*

## Grid conventions (proposed)
- **Facing:** a part faces away from the cockpit along the side where it touched. The Wrench can rotate it in 90° steps. A Mirror is diagonal (`/` or `\`).
- **Neighbour:** one of the 4 orthogonal cells.
- **Route:** the straight run of ship cells in front of a weapon. A shot travels along the route, and each part on it transforms the shot. After the last part the shot auto-aims.

## Base parts (16)
| # | Part | Alone | Look | Connection rule |
|---|---|---|---|---|
| 1 | Pulse Cannon | Bolts at the nearest enemy in a 120° arc | Yellow square + barrel | Faces; routes |
| 2 | Beam Lance | Continuous laser, 90° arc | Thin red rectangle | Faces; routes |
| 3 | Bomb Bay | 2-cell blast at the densest crowd every 3s | Orange square + black circle | Container: takes a payload from a neighbour whose front faces it |
| 4 | Arc Coil | Zaps 3 enemies within 150px | Cyan circle + ring | Any neighbour; links to coils up to 3 cells away |
| 5 | Ram Spike | Contact damage × speed | White triangle | Outward face only |
| 6 | Flail Anchor | Ball on a 4-cell tether | Grey ring, line, circle | Container: takes a payload from any neighbour |
| 7 | Mirror | Scatters enemy bullets | Silver square with a diagonal | On a route: splits half straight, half turned 90° |
| 8 | Lens | Weak glint ray | Pale-blue circle | On a route: fuses 3 shots into 1 piercing ×4; beams get ×2 |
| 9 | Prism | Glint fan every 2s | White triangle + 3 lines | On a route: 3-way fan at 60% each |
| 10 | Relay | Catches enemy bullets and throws them back | Grey diamond | On a route: retargets to a different enemy, +1 copy |
| 11 | Magnet | Pickup radius ×2 | Purple U | On a route: shots orbit the ship (max 16), released within 100px of an enemy |
| 12 | Thruster | +Speed | Orange rectangle + flame | Exhaust is a backward projectile that routes. Off-centre placement causes torque |
| 13 | Armor Plate | −40% damage on its cell | Dark square with rivets | Counts toward shapes |
| 14 | Shield Arc | Blocks a 90° arc; 3s recharge | Blue arc | Faces; passes blocked bullets backward along its route |
| 15 | Capacitor | +10% fire rate | Yellow rectangle with bars | Affects the weapon in front of it |
| 16 | Repair Cross | 1 HP / 5s, +20% per neighbour | Green plus | Any neighbour |

## Combos (28)
★ = jackpot (3+ parts) · ☺ = joke combo that is secretly OP

| Combo | Ingredients + arrangement | On screen | Surprise | Wow | Cost |
|---|---|---|---|---|---|
| Split Beam | Beam → Mirror | Laser bends 90° and a weaker branch carries on straight | Light obeys the hull | 3 | S |
| Hall of Mirrors | Beam → 2–3 staggered Mirrors | Zigzag beam mesh | Each mirror doubles the branches | 4 | S |
| Slug Fusion | Pulse → Lens | 3 bolts become 1 fat piercing slug | Fewer bullets, more kills | 3 | S |
| Trident | Beam → Prism | 3-pronged laser | Good first discovery | 2 | S |
| Relay Volley | Pulse → Relay → Relay | 1 → 2 → 4 bolts passed between enemies | Copy operator | 4 | S |
| Gravity Sling | Pulse → Magnet | Bolts orbit as a ring, then unload at point-blank range | Role inversion | 4 | S |
| Gauss Spine ★ | Pulse → 3 Magnets in a line | Bolts are accelerated into a screen-wide coilgun line | Three magnets do the opposite of one | 5 | M |
| Resonator Cavity ★ | 2 facing Mirrors + a Beam into the gap | The gap glows and fires a huge pulse out both ends every 4s | Laser physics | 5 | M |
| Storm Seed | Arc Coil touching a Bomb Bay | Bombs land as lightning pylons for 4s | Container inherits its payload | 4 | M |
| Orbital Necklace | Magnet + Bomb Bay | Bombs orbit as a ring of mines | Bombs that never drop | 3 | S |
| Comet Tail | Bomb Bay in a Thruster's exhaust | Running away lays a minefield | Role inversion | 4 | S |
| Afterburner Lance | Lens in a Thruster's exhaust | The exhaust focuses into a long blue lance | Role inversion | 4 | S |
| Pinwheel Drive ☺ | 2 opposing off-centre Thrusters | Ship spins like a top; beams mow 360° | Joke, secretly OP | 5 | S |
| The Big Stick ☺ | ≥5 parts in a 1-wide line | The plank swings; tip damage = tip speed | Joke, secretly OP; role inversion | 4 | S |
| Disco Ball ☺★ | Lens with 4 Mirrors in a cross | 8 rotating rays | Joke, secretly OP | 5 | M |
| Parabolic Dish | Lens behind a Shield Arc | Blocked bullets focus into one shot | Defense becomes offense | 4 | S |
| Bell Hull | Armor Plates in a closed loop | Each hit rings out as a shockwave | Getting hit is good | 4 | M |
| Faraday Cage ★ | Arc Coil loop around a weapon | The weapon's shots chain lightning | Enclosure passes on the element | 4 | M |
| Conductor Spine | Arc Coil at the end of a line of ≥4 | Lightning runs down the spine; 3× range from the tip | Shape as a wire | 3 | S |
| Storm Chain | Flail + Arc Coil | The tether is a lightning whip | The line between parts is the weapon | 4 | S |
| Gravity Morningstar | Flail + Magnet | The ball is a gravity well | Herding enemies | 3 | S |
| Meat Grinder | Magnet + Ram Spike facing the same way | Pulls enemies onto the spike | Role inversion | 3 | S |
| Battering Prow | ≥3 Ram Spikes in front + a Thruster | The front edge glows at speed and knocks enemies into others | The outline is the weapon | 4 | M |
| Shaped Charge | Bomb facing the cockpit with a Plate between | Internal blast: −1 HP, ×6 damage outward cone | Self-risk paired with mitigation | 4 | M |
| Twin Lock | The same weapon mirrored across the axis | Helix braid, +50% damage | Symmetry pays | 2 | S |
| Lonely Sentry | Weapon on a tip, ≥3 cells from the core | +60% range and crits | Edge vs core | 2 | S |
| Mandala ★ | Ship symmetric on both axes, ≥8 parts | Ship-shaped rings of light pulse outward | The ship's shape is the projectile | 5 | M |
| Breech Loader | Capacitor behind a weapon | Every 5th shot is ×3 | First discovery | 2 | S |

## Rule engine (6 rules produce about 75% of the combos)
1. **Routing:** each part has an `onPass(shot)` transform, and a Mirror branches the route into a tree. Enemy bullets that hit parts also call `onPass`.
2. **Exhaust is a weapon:** thruster flame routes like any gun.
3. **Containers:** Bomb Bay and Flail take a payload from a neighbour, and copies inherit the modifiers on its route.
4. **Shape tags:** after each attach or Wrench, flood fill and line scans tag the ship with `Line(n)`, `Loop`, `Cross`, `Mirror-sym`, `Quad-sym`, `Tip` and `Core`. A part + tag pair maps to a behaviour.
5. **Facing pairs:** two same-type parts facing each other create a "cavity" with a per-type effect.
6. **Rigid-body physics:** thruster torque around the centre of mass; contact damage = cell speed.

Special code is still needed for Gauss Spine, Resonator, Mandala, Shaped Charge and Storm Chain. Disco Ball needs one flag.

## The agent's 2-day pick (10)
- **Routing:** Split Beam, Hall of Mirrors, Slug Fusion, Relay Volley, Gravity Sling.
- **Enemy bullets through `onPass`:** Parabolic Dish.
- **Exhaust:** Afterburner Lance.
- **Physics:** Pinwheel Drive, The Big Stick.
- **Showpiece:** Resonator Cavity.

The three core systems cost about 0.5 day for routing, 1 h for enemy-bullet hooks and 2 h for physics.

---

## Revision: many-to-many synergies (after the user's constraint)
**Principle: any adjacency is generic, and a specific arrangement is a signature.**
- Any two parts that touch always interact. Every part gives one *trait* to its neighbours and receives theirs in a consistent, visible way.
- A signature needs a specific partner *plus* a spatial condition (route, facing, line, loop, cross, symmetry). It replaces the generic effect for that pair and hits about 3–5× harder.
- Generic traits are small (about 15–25%), tinted and visible. Up to 4 per part, and duplicates don't stack.

**Generic rules**
- **G1 Infusion:** a part that produces output (shots, beam, bomb, lightning, contact, ball, exhaust, arc, glint) carries every neighbour's trait.
- **G2 Reactive burst:** a passive part releases its neighbours' traits as a small burst on its own event (Plate when hit, Magnet on pickup, Capacitor every 5s ×2, Repair on each tick at 50%, Mirror and Relay on each bullet).
- **G3 Routing:** unchanged.

| Part | Trait given (infusion / burst) | Signature partners → codex |
|---|---|---|
| Pulse Cannon | *Bolt*: +1 side bolt / 4-bolt ring | Lens (Slug Fusion), Relay (Relay Volley), Magnet (Gravity Sling, Gauss Spine), Capacitor (Breech Loader) |
| Beam Lance | *Sear*: burning line / laser flash | Mirror (Split Beam, Hall of Mirrors, Resonator), Prism (Trident), Capacitor |
| Bomb Bay | *Blast*: explosion on hit / small explosion | Arc Coil (Storm Seed), Magnet (Orbital Necklace), Thruster (Comet Tail), Plate (Shaped Charge) |
| Arc Coil | *Shock*: +1 chain / zaps 2 enemies | Bomb (Storm Seed), Flail (Storm Chain), Coil loop (Faraday Cage), Line (Conductor Spine), Repair (**Defibrillator**, new) |
| Ram Spike | *Edge*: +pierce and crits / shard spray | Magnet (Meat Grinder), Thruster (Battering Prow) |
| Flail Anchor | *Swing*: knockback / shove ring | Arc Coil (Storm Chain), Magnet (Gravity Morningstar) |
| Mirror | *Bounce*: ricochet once / reflect bullets | Beam, Mirror (Resonator), Lens (Disco Ball) |
| Lens | *Focus*: +damage / focused ray | Pulse, Thruster (Afterburner), Shield (Parabolic Dish), Mirror ×4 (Disco Ball) |
| Prism | *Split*: +2 shards / rainbow fan | Beam (Trident) |
| Relay | *Pass*: retarget on kill / throws bullets | Pulse (Relay Volley) |
| Magnet | *Pull*: curve to crowds / gravity tug | Pulse, Magnet line, Bomb, Flail, Spike |
| Thruster | *Heat*: burn over time / flame puff | Lens, Bomb, Thruster pair (Pinwheel), Spike |
| Armor Plate | *Mass*: bigger, slower, knockback / shockwave | Plate loop (Bell Hull), line (Big Stick), Bomb (Shaped Charge) |
| Shield Arc | *Guard*: deletes enemy bullets / bubble | Lens (Parabolic Dish) |
| Capacitor | *Charge*: every 5th ×3 / doubles a burst | Pulse or Beam in front (Breech Loader) |
| Repair Cross | *Mend*: kills drop heal motes / tiny heal | Arc Coil (Defibrillator) |

**Defibrillator (new):** Repair Cross touching an Arc Coil. Every heal tick pulses lightning through the linked coil network, so healing becomes a damage clock (role inversion). Wow 4, cost S.

**Non-signature examples:** Bomb + Repair (bomb kills sprinkle heal motes) · Spike + Prism (rams spray rainbow shards) · Plate + Coil (attackers get zapped) · Mirror + Thruster (reflected bullets leave burning trails) · Capacitor + Shield (bubble every 5s).

**Matrix summary:** 136 unordered pairs. 24 are signatures (about 18%) and 112 are generic, so no pair does nothing. Every part has at least 1 signature. The hubs are Magnet, Lens, Thruster, Bomb and Coil (4–5 each). Pattern signatures that need no specific partner sit on top: Twin Lock, Lonely Sentry, Mandala, Conductor Spine, Big Stick.

**Cost:** the generic layer is about half a day (16 trait definitions plus `applyTraits(output)` and `onEvent → bursts`). The prototype keeps the same 10 signatures and adds traits only for the 9 parts they use.
