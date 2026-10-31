# Research: Noita wand and spell system → ship-part combos

*This file was produced by a research subagent on 2026-10-29. The design patterns in §3 are the agent's own synthesis of the wiki and community material, not the developers' stated intent.*

## 1. How the system works
- A wand is a small program: a row of spells cast left to right. The wand's stats are Spells/Cast, Cast Delay, Recharge, Mana Max, Mana Charge, Capacity and Spread. Players almost always avoid shuffle wands.
- Spells move between three piles: Deck, Hand and Discard. A plain projectile ends a draw, a modifier draws one more spell and changes what fires next, and a multicast draws N spells and fires them together. Spells change a shared "shot state" rather than each other directly.
- Trigger, Timer and Expiration spells are projectiles that carry the next spell as a payload. The payload fires on hit, after a time, or when the projectile expires.
- Every spell costs mana. If there isn't enough, the spell is skipped silently.
- Always Cast spells are added to every cast for free.
- Wrapping: a draw that runs past the end of the deck refills the deck from the discard pile and keeps going. This is behind many of the exploits.

## 2. Famous combos
| Combo | Why it's exciting |
|---|---|
| Spark Bolt w/ Trigger + several Chainsaws + Damage Plus | Melee hits delivered as a ranged warhead; a single modifier boosts every saw |
| Chainsaw + Double Cast + Spark Bolt | Chainsaw sets cast delay to 0, making a machine gun; the side effect matters more than the damage |
| Ping-Pong Path + Luminous Drill | Turns a short-range drill into a long-range weapon |
| Freeze Charge + Tentacle | Instant kill on frozen enemies: one status effect primes another |
| Homing + slow projectiles | Homing is strongest on slow shots ("speed class" matching) |
| Accelerating + Heavy + Rotate Towards Foes + Bouncing Burst | Several mild modifiers add up to a runaway build |
| Fireball Orbit + Triplicate Bolt | Two spells produce 12 orbiting fireballs |
| Divide By 10 → 10 → 4 → 2 | Up to 800 copies; chained copy operators multiply each other |
| Add Trigger + modifiers | Modifiers are copied for free; players break the rules on purpose |
| Piercing + Trigger + Homing | A "very angry bee" that releases its payload on every hit |
| Explosive builds + Explosion Immunity | Turns a wand that would kill you into the strongest one you have |

## 3. Patterns that produce emergence
1. **Downstream modification**: modifiers apply to whatever follows them, so order matters.
2. **Payload containers**: one part carries another and releases it on hit, on a timer, or on expiry.
3. **Per-instance inheritance**: every copy keeps the whole modifier stack, so effects multiply.
4. **Copy operators**: parts whose only job is to duplicate other parts.
5. **Dual-use parts**: a side effect turns a weak part into a keystone.
6. **Rule exceptions**: some parts cancel or ignore a general rule.
7. **Topology**: position, including the edges and wrapping, changes the result.
8. **Self-risk paired with a mitigating part**.
9. **Budget constraint**: mana and capacity force trade-offs.
10. **A world that reacts**: materials and physics add a second layer of combos.

## 4. How players discover combos
Players find combos by experimenting at the Holy Mountain against test dummies, through community tools and wikis (the Noita Wand Simulator, Spell Synergy guide), and by accident (blowing themselves up). A discovery sticks in memory when the player built it, the payoff is huge and visible, it feels like breaking the game, and it can be shared as a recipe of 3–4 ingredients.

## 5. Pitfalls for new players
Shuffle hides cause and effect. Running out of mana fails silently. Placement rules are invisible. Iteration is slow because wands can only be edited at the Holy Mountain. Self-damage punishes experiments. There are hundreds of spells and the screen gets visually noisy.

## 6. Proposed translations into ship parts
1. **Lens**: a modifier in front of a muzzle that changes shots passing through, chained in order (Prism splits, Focus pierces, Heat ignites, Mirror doubles a laser).
2. **Warhead Bay**: whatever weapon sits in its rear socket becomes its payload (Bay + Gun = cluster bomb). Fuses: Impact, Timer, Proximity.
3. **Manifold**: multicast. Fires every weapon touching it at once, and Lenses on the Manifold apply to all of them.
4. **Echo Coil**: copies the weapon it points at ×3 at −30% damage. Echo pointing at Echo multiplies, with a cap and heat.
5. **Saw Arm**: a weak blade that resets the reload of weapons next to it.
6. **Gravity Ring**: makes a neighbouring weapon's shots orbit the ship as a shield. Adding a Seeker Lens sends them after enemies.
7. **Seeker Lens**: strong on slow shots, weak on fast bullets.
8. **Loop Conduit**: Lenses inside a closed loop apply twice, but reload doubles.
9. **Reactor budget with visible failure**: unpowered parts grey out and spark.
10. **Blast Plating**: lets explosive parts sit next to the cockpit without hurting it.
11. **Rule-breakers**: Phase Emitter (ignores Lenses, double range) and Grounding Spike (your electrical shots can't hurt you).
12. **Readability**: a live firing preview while building, arrows showing which parts affect which, and a "Combo Discovered!" codex.

## Sources
- https://noita.wiki.gg/wiki/Guide_To_Wand_Mechanics
- https://noita.wiki.gg/wiki/Expert_Guide:_Draw
- https://noita.wiki.gg/wiki/Wands
- https://noita.wiki.gg/wiki/Spells
- https://noita.wiki.gg/wiki/Add_Trigger
- https://noita.wiki.gg/wiki/Chainsaw
- https://noita.wiki.gg/wiki/Guide:_Spell_Synergy
- https://noita.wiki.gg/wiki/Guide_To_Homing
- https://noita.wiki.gg/wiki/Expert_Guide:_Divide_By_Spells
- https://noita.wiki.gg/wiki/Tool:_Noita_Wand_Simulator
- https://noita.fandom.com/wiki/Divide_By
- https://steamcommunity.com/app/881100/discussions/0/2958293022028902453
- https://steamcommunity.com/app/881100/discussions/0/1742264052620035496
- https://steamcommunity.com/app/881100/discussions/0/1630791709840179377
- https://next.lemm.ee/post/33353181
- https://lemmy.nekusoul.de/post/583122/2080508
