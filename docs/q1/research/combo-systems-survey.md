# Research: how other games make combos surprising

*This file was produced by a research subagent on 2026-10-29, mostly from community wikis. LocalThunk's Balatro joker guidelines came only from search snippets.*

## 1. Taxonomy of surprise mechanisms
| # | Mechanism | Examples | Why it surprises |
|---|---|---|---|
| 1 | **Role inversion**: a utility or defense item becomes the weapon | Gungeon *Telefrag*, *Empty Vessels*; RoR2 N'kuhana's Opinion (heals fire skulls); VS Soul Eater | Players file each item under one verb, and the combo swaps it |
| 2 | **Behaviour / shape transfer** | Isaac Tech X + Brimstone (a ring of beam); Gungeon *Battle Mode* (orbiting bombs); VS La Borra | You recognise both parents in the child |
| 3 | **Scale explosion** (counts multiply) | Brimstone + Tammy's Head; Epic Fetus + Brimstone; Balatro Blueprint + Brainstorm | Players expect addition and get multiplication |
| 4 | **Payload loading** | Gungeon *Outer Limits*; Tech X + Ipecac; Mom's Knife + Brimstone | The carrier was never read as a container |
| 5 | **Proc cascade** (triggers trigger triggers) | RoR2 Ukulele ↔ ATG; Gasoline + Wisp; Balatro retriggers | One hit avalanches. RoR2 damps it with proc coefficients |
| 6 | **State priming, then detonation** | Magicka Wet + Lightning; Hades *Merciful End*; BotW chemistry | The setup looks inert until the second part arrives |
| 7 | **Self-risk turned into an asset** | Isaac Pyromaniac + Dr. Fetus; Gungeon *Crestfallen Soul*; Nova Drift Ataraxia | The feared item becomes the engine |
| 8 | **Environmental chain reaction** | Spelunky Tiki trap → frog → rock → shopkeeper; BotW lightning and metal | A causal story the player can retell |
| 9 | **Joke combo that is actually OP** (and the joke that does nothing) | Gungeon *Just In Case* (fires the word "ROCKET"); *Elephant in the Room*; *Green Thumb* "does nothing" | A pun taken literally |
| 10 | **Hidden category completion** | Isaac transformations (3 of a set); Balatro secret hands; Brotato set bonuses | "I unlocked a secret", which maps onto our "??" codex |
| 11 | **Semantic "of course!" logic** | Infinite Craft (LLM result cached globally, "First Discovery"); Scribblenauts adjectives; Gungeon *Like Shooting Fish* | Surprising, but feels inevitable in hindsight |

## 2. Hand-authored vs systemic vs hybrid
| | Explicit recipes (Gungeon, VS, Hades, Backpack Battles) | Emergent rules (Isaac, RoR2, BotW, Spelunky) |
|---|---|---|
| Discovery | Finite and collectible | Endless, but no list to chase |
| Readability | Named and guaranteed | Can be opaque (McMillen calls missing descriptions Isaac's biggest flaw) |
| Dev cost | Linear per combo, art and code each | Cheap rules, but n² testing and override bugs |
| Feel | Can feel scarce | Can feel degenerate, which players love |

**Hybrids, which are exactly our many-to-many principle:**
- **Balatro:** jokers synergise with *general keywords and stats*, not specific jokers (LocalThunk). Named outcomes come from a **classifier over the board state** (the poker hand), and secret hands stay hidden until produced.
- **Isaac:** thousands of unnamed interactions from layered tear modifiers with priority overrides, plus about 15 named Transformations recognised by **a counter of 3 items from a tagged set**.
- **Gungeon:** general bullet modifiers stack on any gun. Named synergies are often **one key item + any one of a set**, so one codex entry has many recipes. Lich's Eye Bullets is a wildcard that counts as every synergy partner.
- **Nova Drift:** super mods unlock from prerequisite pairs and then **enter the draft pool** rather than appearing instantly.
- **Hades:** duo boons are named pairs that *amplify a general interaction* (Merciful End = deflect detonates Doom).
- **Magicka:** one element queue governs everything, and named Magicks are sequences inside the same input space, so players can find them by accident.

**How games recognise a combo found through general rules:**
1. A tag-pattern detector run when the state changes.
2. A "key + any-of" registry.
3. Prerequisite unlock, then offer.
4. A cached first result (Infinite Craft).

**What this implies for our game:**
- Give every part tags.
- Generic adjacency rules read tags and stay modest and quantitative.
- **Signature combos are detectors over tag patterns on the grid**, run on bolt-on and when the Wrench closes. They should be qualitative: a new behaviour or silhouette.
- Allow any-of slots, so one codex entry has many recipes.
- Keep a few secret entries that reveal themselves only on their first trigger.
- Consider a rare wildcard part.

## 3. Readability at the moment a combo fires
- **Gungeon:** a light-blue arrow above the player plus the synergy name. In the Ammonomicon, partners are outlined in blue.
- **Isaac:** a transformation changes the character's appearance, so it stays readable afterwards.
- **Backpack Battles:** a line links the ingredients before they combine.
- **Balatro:** sequential causality. Each card or joker steps forward in turn, the sound escalates, and flames build around the score. You watch the Rube Goldberg machine run.
- **Hades and Nova Drift:** the named reward is offered as a choice before it's used.
- **RoR2:** each proc has a distinct visual effect.

**Conventions to adopt:**
- Announce the name once, with a stinger sound and a short time-slow.
- Give each signature a unique silhouette that persists.
- Play cascades in sequence.
- Draw a linking line between the participating cells.
- *(Optional, which conflicts with the current "no hints" decision:)* preview partial matches on the Wrench screen.

## 4. Top 15 surprising combos
1. Brimstone + Tammy's Head → 10 beams in all directions → scale explosion.
2. Pyromaniac + Dr. Fetus / Ipecac → your own explosions heal you → self-risk to asset.
3. Epic Fetus + Brimstone → each explosion emits 10 beams → payload + scale.
4. Tech X + Ipecac → an explosive laser ring → payload.
5. Lower Case r + Bomb → fires the word "ROCKET" → joke that's OP.
6. Chest Teleporter + Teleporter Prototype → arriving kills the room → role inversion.
7. Mr. Accretion Jr. + Singularity → feed planets to the black hole to nuke the room → loading.
8. Orbital Bullets + Bomb → orbiting contact bombs → behaviour transfer.
9. Machine Fist + RPG → remote-controlled explosive fists → behaviour transfer.
10. Ukulele + ATG → lightning ↔ missiles → proc cascade.
11. N'kuhana's Opinion + heals → heals become damage skulls → role inversion.
12. Santa Water + Attractorb → damage pools drift toward you → behaviour transfer.
13. Blueprint + Brainstorm + a scaling joker → one engine counted several times → positional copy.
14. Ares + Athena → deflecting detonates Doom → state priming.
15. Spelunky trap chain angers the shopkeeper → environmental chain.

## Sources
https://enterthegungeon.wiki.gg/wiki/Synergies · https://enterthegungeon.wiki.gg/wiki/Lich%27s_Eye_Bullets · https://tvtropes.org/pmwiki/pmwiki.php/GameBreaker/EnterTheGungeon · https://bindingofisaacrebirth.wiki.gg/wiki/Brimstone · https://bindingofisaacrebirth.wiki.gg/wiki/Tech_X · https://bindingofisaacrebirth.wiki.gg/wiki/Transformations · https://vice.com/en/article/10-years-after-release-edmund-mcmillen-cant-stop-working-on-binding-of-isaac · https://riskofrain2.wiki.gg/wiki/Proc_Coefficient · https://riskofrain.wiki.gg/wiki/N%27kuhana%27s_Opinion · https://www.carlsguides.com/walkthroughs/magicka/magicks.php · https://twinfinite.net/guides/hades-duo-boons-list-how-work/ · https://www.mejoress.com/nova-drift-super-mods-unlock-stats/ · https://www.pcgamer.com/vampire-survivors-evolve-weapons-evolutions-guide · https://holocure.wiki.gg/wiki/Collabs · https://lr.sudovanilla.org/r/balatro/comments/1czo9g0/guidelines_for_joker_design · https://primagames.com/gaming/all-recipes-crafting-combinations-in-backpack-battles · https://brotato.wiki.spellsandguns.com/Weapons · https://gamesbeat.com/the-legend-of-zelda-breath-of-the-wild-makes-chemistry-just-as-important-as-physics/ · https://gamedeveloper.com/design/how-i-spelunky-i-s-designer-set-out-to-create-complexity-with-simplicity · https://pcgamer.com/this-browser-based-endless-crafting-game-starts-you-off-with-fire-and-water-but-it-quickly-escalates-to-god-the-big-bang-and-yin-yoda
