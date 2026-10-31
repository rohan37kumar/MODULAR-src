# Q3 Design: the Forge Uplink spec

**Status:** draft for the user's approval · **Date:** 2026-11-01
**Source of intent:** the user's own words, verbatim, in `docs/q3/user-input.md`. Everything not marked *(my call)* is a user decision from the 2026-11-01 brainstorm.
**What this document is:** the design of the *written answer* to Q3, not of new game code. A writer should be able to produce the final submission from this document alone.

---

## 1. Intent

**The brief (verbatim):** *"Scenario: We're building a mobile survivor-like: auto-attacking combat, escalating hordes, and build-defining upgrades the player picks mid-run (think Survivor.io or Vampire Survivors). Design a single, innovative feature for it."* Required: a clear rationale; enough detail to understand the design intent; **one section fully detailed** to show writing skill and the ability to curate AI-generated text; **2–3 key wireframes or screen mockups**. The general note also applies: state sources, assumptions and AI output, and stand out from candidates who "just prompt AI".

**The user's insight (paraphrasing `user-input.md`; the answer must carry this, in the user's voice):**
- Vampire Survivors and Survivor.io pack a real punch, but their in-run upgrades never ask for the player's input, calculation or effort. The upgrades don't work together in a way you have to think about, and the order you pick them in doesn't matter.
- The only real input is *which* card you pick to evolve a weapon. That gives a wow moment only when you first find an evolution. Once you've memorized the evolutions, the game has nothing new to show you on offence (stages aside).
- Noita, one of the user's favourite games, is the counter-example: the order of your spells is what matters most. That much depth doesn't fit an auto-attacker, but *some* player calculation that produces a crazy offensive punch would.
- Every run should have randomness in how pickups can be used, so the player's calculation and effort create a unique offence. Then the wow happens every run, not once.
- The feature is the one the user built for Q1 around exactly this idea: some parts are weapons, some are modifiers, and where and in what order the modifiers sit changes the whole play style of the run.

**Success looks like:** a Lila reviewer finishes it thinking (1) this person found a real hole in the genre, (2) the feature fixes it without breaking what makes survivor-likes fun, (3) the rules are precise enough to build, and (4) it's already playable.

## 2. Decisions (user, 2026-11-01)

| Topic | Decision |
|---|---|
| Framing | Lila didn't specify its game's elements (hero, level-up cards and so on). **Assume MODULAR's elements**: the ship, parts dropped by enemies that weld on, the Forge Uplink, Carriers, the Xeno Archive. State this as an assumption. |
| The single feature | **The Forge Uplink is the gateway; the combo rules are the focus.** The Forge Uplink is the paused moment where accidental welds become deliberate builds. What the player calculates with there are the combo rules. The rules are not background. |
| Fully detailed section | **The combo rules.** |
| Curation evidence | **Yes:** a short boxed curation note after the deep section, listing real corrections where AI text (drafts, the design doc, my own claims) was wrong and the code proved it. |
| Wireframes | **Two:** (1) the Forge Uplink workbench, (2) the in-flight combo moment. |
| Wireframe content | **Strictly as built** (user, after the builder check). The wireframes show only what the game draws today: dashed flowing routes with an arrowhead per exit, and plain gold outlines on discovered combos with no names. The difference between two orders is carried by the callouts and an inset with the numbers, not by invented UI. |
| Wireframe style | **Annotated greyscale wireframes** in portrait phone frames, with numbered callouts. Built in HTML and rendered to PNG (same pipeline as the Q2 charts). |
| Format | **Word document** (a markdown source plus a .docx with the wireframes embedded), the same treatment as Q2. |
| Edit pass | **The user edits the finished .docx directly in Word, as the final step.** I hand over a complete docx. After that the docx is the master; `q3-draft.md` isn't kept in sync. |
| Length | **About 2,000–2,500 words** in the body. Sources and the AI disclosure come after the body and don't count. |
| Deadline | **Mon 2 Nov** (user-confirmed: 7 days from receiving it on Mon 26 Oct). |

## 3. Goals, non-goals, anti-goals

**Goals**
1. A rationale that reads as the user's own insight, not a market essay.
2. Rules precise enough that an engineer could implement them, with worked examples using **real numbers from the shipped engine**.
3. A Forge Uplink flow that shows why a pause is right for a mobile survivor-like.
4. Wireframes that make "order changes play style" visible at a glance.
5. Honest disclosure of AI use, with evidence of curation.

**Non-goals**
- Redesigning MODULAR or adding mechanics. The spec describes the feature as designed and built, plus clearly labelled proposals where it says "next".
- Repeating the Q1 writeup (money, metagame, the AI-in-game options, reference tables). Q3 links to Q1 for those.
- Listing all 21 combos or all 20 parts in full. Curate. A compact reference table is allowed only if it serves the rules section.

**Anti-goals (failure even if it's complete)**
- Generic survivor-like platitudes ("increases player agency and replayability") without a mechanism.
- Claims that disagree with the code. Every number in the rules section is checked against `q1-game/src`.
- Hiding that it's the Q1 game. The reuse is a strength (it's playable), stated plainly.
- A wall of rules with no "why". Every rule earns its place by serving the user's insight.

## 4. Structure of the answer (target ~2,300 words)

Title *(my call)*: **"The Forge Uplink: making build order matter in a survivor-like"**. Header lines: the playable link (https://rohan37kumar.github.io/MODULAR-src/) and one sentence saying it's the Q1 prototype.

| # | Section | Words | Content |
|---|---|---|---|
| 0 | Assumption | ~80 | Lila's elements aren't specified, so this spec uses MODULAR's (list them in one line). Everything described is built and playable unless marked "next". |
| 1 | Why this feature | ~350 | The user's insight (§1), argued with mechanics. **Vampire Survivors:** an evolution needs a max-level weapon plus its paired passive, then a chest. Once known, it's a checklist. **Survivor.io** is the same: a maxed skill plus its matching item. **Card picks choose *what*, never *where* or *in what order*.** **Noita:** order is the build, but it's too heavy for an auto-attacker. **The design target:** a light layer of calculation, and because drops are random, a new arrangement problem every run. So the wow repeats. One sentence on why a *pause* fits mobile: you can't do arithmetic while dodging on a phone. |
| 2 | How it fits the loop | ~300 | Fly → kill → parts drop → flying into one welds it where it touched (accidents first) → a Forge Uplink drops (every ~60–90 s, and always from a Carrier) → the game pauses → rearrange, rotate, jettison → accept → the named combo fires and is logged in the Xeno Archive → a Blueprint start lets the next run chase it on purpose. Name the progression: **accident → understanding → intent.** |
| 3 | **The combo rules (fully detailed)** | ~950 | See §5. |
| — | Curation note (boxed) | ~150 | See §6. |
| 4 | The Forge Uplink session | ~350 | See §7. Wireframe 1 sits here. |
| 5 | The in-flight payoff | ~120 | First firing: slow-mo, link line, banner, Archive counter. Wireframe 2 sits here. |
| 6 | Risks and what I'd measure | ~200 | See §8. |
| — | Sources | — | After the body. |
| — | How AI was used | ~150 | After the body. See §9. |

## 5. Section 3: the combo rules (the deep section)

The best writing in the document goes here. It must be exact. **Every number below was checked by running the real engine** (`compileLoadout` in `q1-game/src/core/loadout.ts`, via `vite-node`, 2026-11-01).

### 5.1 Content to cover, in this order

1. **Three kinds of parts, two shapes.**
   - **Weapons** (octagons): Pulse Cannon, Beam Lance, Needle Turret, Cryo Turret, Saw, Bomb Pod, Arc Coil. The cockpit also has a small auto-aimed gun.
   - **Shot changers / modifiers** (octagons): Mirror, Lens, Prism, Hook. The Mimic is an octagon that copies the part type it touches most.
   - **Boosters / nodes** (small squares in the gaps where four octagons meet): Orbit Ring, Echo Coil, Thruster, Magnet, Bulwark Plate, Repair Node, Overclock, Relay.
   - The grid is capped at 7×7 octagons around the cockpit, with 64 node gaps. Every part is hitbox, so size is a cost.
2. **Rule 1: touch.** Every part gives one trait to everything it touches and receives theirs. Octagons touch their 4 edge neighbours and 4 corner nodes; a node touches its 4 octagons. Example traits: a Lens gives +20% damage (Focus); a Bomb Pod makes shots explode on impact (Warhead); a Cryo Turret makes shots slow targets (Chill). **The guarantees:** traits never stack (the same trait twice counts once), never harm, and if a trait has nothing to change on a shot type it falls back to a small boost (+15% damage).
3. **Rule 2: line of fire, in order.** A routed weapon's line is the unbroken run of parts in front of its muzzle. Each shot changer in that run transforms the shot **in the order it's met**. Parts that aren't modifiers are transparent. They never block a shot. A weapon or booster in the line does nothing to it.
   - **Mirror:** the shot splits. One branch goes straight on and one turns 90° (the mirror's `/` or `\` orientation picks the side). **Each branch carries 70%** (so 140% in total, spread over two directions). Branches keep routing, so each one meets the parts beyond it.
   - **Lens:** fuses shots. A bolt gun fires one big piercing slug on every 3rd trigger at ×4 damage and double width. Three or more bolts entering at once fuse into one slug at ×1.33 of their total. A beam becomes half as wide, twice as strong and 1.5× as long.
   - **Prism:** splits each shot into a 30° fan of three at 60% each.
   - **Hook:** where a shot through it lands, the guns *touching* the Hook fire a payload at 60% (max 2 per impact). The payload guns keep firing normally.
   - **Aiming classes:** **fixed** guns (Pulse, Beam) fire along their facing, so you aim by steering (±25° assist). **Turrets** (Needle, Cryo, Saw, the cockpit) use "conduit, then aim": the shot travels the line inside the hull as a glowing conduit, changes at each modifier, and auto-aims from wherever it exits, so a Mirror gives a turret two exits. **Emitters** (Bomb Pod, Arc Coil) need no aim and take touch traits only.
4. **Rule 3: boosters work on the four around them.** A node never sits in a line of fire, so a support part can't block a shot. Examples: one **Overclock** between guns makes every gun it touches fire 3× as often at half damage. **Orbit Ring** and **Echo Coil** nodes give the routed guns they touch the effect they used to give in a line: shots circle the ship before striking, or every shot fires twice (with an overheat ring).
5. **Rule 4: signatures, a naming layer on top.** The rules produce every effect. The recogniser also watches for 21 specific patterns (a pair touching, or a gun whose *first* modifier is a given part, or a three-part Hook pattern). A recognised pattern gets: a name, a first-time announcement, a Xeno Archive card, a Blueprint unlock, **×1.5 strength** and a unique visual flourish. A larger signature replaces a smaller one it contains (Hall of Mirrors ⊃ Split Beam). Six signatures have effects no rule produces (Resonator, Shatterstorm, Jumpstart, Storm Seed, Porcupine, Grand Finale). **Unnamed results are intended:** a Needle Turret behind a Lens fuses darts by rule with no name.
6. **Why "order" works here when it would fail in a menu:** the line is physical and visible. You can see which part a shot meets first, and the Forge draws each route and where it exits (it shows the path and the exits, not the transformed output; be exact about this). Noita's flaw (shuffle and silent failures hiding cause and effect) is removed: no shuffle, every pairing visibly does something, and every named combo is linked on screen the first time it fires.

### 5.2 Worked examples (verified numbers; use these, not round guesses)

Base: Pulse Cannon alone = 10 damage per bolt, 4 bolts/s → **40 dps**, one bolt, no pierce.

**A. Same three parts, two orders (the headline example).** A Pulse Cannon facing up, with a Lens and a Prism in front of it.

| | Pulse → Lens → Prism | Pulse → Prism → Lens |
|---|---|---|
| What comes out | Every 3rd trigger (every 0.75 s), a **30° fan of three** piercing slugs of 43.2 each | **Every trigger (4/s)**, one piercing slug of 23.9 straight ahead |
| Named combo | **Slug Round** (Pulse whose first modifier is a Lens): ×1.5 | None (the first modifier is the Prism) |
| Touch trait on the Pulse | Focus (+20%, from the Lens it touches) | Split (+2 side shards, from the Prism it touches) |
| Sustained damage | **~173 dps** | **~96 dps**, plus side shards |
| How it plays | Heavy, rhythmic volleys that clear a wide arc. Good against packs coming from the front. | A steady stream of piercing slugs down one line. Steer it like a rail gun. |

The point to make: the order changes the *shape* of your offence (burst fan vs steady stream) and whether a named combo fires, not just a number.

**B. A Beam Lance, a Mirror and a Lens.**

| | Beam → Mirror(/) → Lens | Beam → Lens → Mirror(/) |
|---|---|---|
| Branches | Straight branch: lensed (half width, range 220 → 330), **72.5 dps**. Turned branch: a plain beam, **36.2 dps** | Both branches lensed: **50.4 dps each**, range 330 |
| Named combo | **Split Beam**: ×1.5 | None (the first modifier is the Lens) |
| How it plays | One long, thin lance forward plus a short side beam | Two equal focused beams at 90° |

**C. Two Mirrors in a row: Hall of Mirrors.** Beam → Mirror(/) → Mirror(/) gives three beams from one gun: 25.4, 25.4 and 36.2 dps, leaving the hull in different directions. (70% × 70% per twice-split branch, then the Mirror's touch trait and the ×1.5 signature.)

**D. Transparency.** Pulse → Bomb Pod → Lens: the Bomb Pod in the line doesn't block the shot. It *touches* the Pulse, so its bolts get Warhead (Cluster Shell fires), and the Lens beyond still makes Slug Round (the first *modifier* is the Lens). Both signatures are live at once: one 60-damage piercing exploding slug every 3rd trigger.

**E. One booster, four guns.** One Overclock node in the gap between a Pulse, a Needle, a Cryo and the cockpit: every one of them fires 3× as often at half damage, and Overclock touching Cryo is the named **Flash Freeze**.

Use A in full (it's the headline and Wireframe 1 shows it), B in full or as a short table, and C, D and E as one or two sentences each. Keep the section near 950 words.

## 6. The curation note (boxed, ~150 words)

Title *(my call)*: **"Curation note: where the AI text was wrong"**. Three or four items, each one line: the claim, the correction, how it was found. Use only real items:

1. **"Half the shot continues straight"** (the Q1 design doc, AI-drafted) → the code gives *each* branch 70%, so a Mirror is a net +40% spread over two directions, not a 50/50 split. Found by reading `lines.ts`.
2. **"These two orders have similar damage per second"** (Claude's own claim during this brainstorm) → running the engine gave 173 vs 96 dps, because one order also triggers Slug Round and the touch traits differ. Found by running `compileLoadout`.
3. **"Halo: Beam Lance → Orbit Ring (line)"** (the original combo table) → since the square-node change, Orbit Ring is a node, and Halo is an Orbit node *touching* a Beam Lance. Found by reading `recogniser.ts`.
4. **"A gold SLUG ROUND label over the parts"** (Claude's first wireframe spec in this design doc) → the Forge has shown no combo names since the 2026-10-31 playtest; only a gold outline. Found by the builder-check reviewer reading `ForgeScene.ts`.

The user can swap in their own edits. The rule is that every item must be real.

## 7. Section 4: the Forge Uplink session (~350 words)

Facts, all as built:
- **When it drops:** a Forge Uplink pickup roughly every 60–90 s, and every Carrier mini-boss drops one. Uncommon by design, so each one is an event.
- **It opens:** picking it up pauses the game. A **hologram workbench** appears over the frozen, dimmed fight: a glowing blueprint grid with a scan-line sweep and the header "FORGE UPLINK // BONDING FIELD ACTIVE". The first time, a one-line tutorial shows.
- **Actions:** drag to move (desktop: mouse; phone: touch, with the dragged part floating above the finger). Rotate (R, right-click or the ⟳ button; a Mirror toggles `/` and `\`). Jettison (X, or drag to the bin). Accept (Enter or the button).
- **Live flowing routes:** each routed gun's line is drawn as a dashed line in the weapon's colour, with the dashes scrolling outward from the muzzle over a faint solid underlay. It ends in an arrowhead at the exit, so a Mirror shows two arrowheads. It updates live while dragging. Hook tethers are finer dashed lines from the payload gun to its Hook. Routes show the path and the exits, never hidden combos, and not the transformed output.
- **Part card:** tap or hover a part to see a plain-language card in a fixed strip above the buttons. It gives the kind (GUN, SHOT CHANGER or BOOSTER), what it does alone, what it gives what it touches, what it does in line, and a placement tip. A selected node draws spokes to its 4 spots (bright to a part, dotted to an empty spot).
- **Known-combo glow:** the parts of a combo the player has *already discovered* get a plain gold outline. There are no names: the name labels were removed after the 2026-10-31 phone playtest. Undiscovered ones never glow (no hints).
- **Connection rule:** every octagon must link back to the cockpit edge to edge. If a move disconnects anything, those parts are highlighted, Accept is blocked, and the line "Reconnect all parts" shows.
- **Weld feel:** the part lifts with a shadow, snaps in with weld sparks and a clank, rotates with a 90° tween, and spins off-screen when jettisoned.
- **Design reasons to state:** the pause exists because you can't calculate under fire on a phone. It's rare so it doesn't replace the action. Auto-attach between Forges keeps the moment-to-moment game one-thumb.
- **Next (proposal, clearly labelled):** a target session time of about 20 s, measured; and auto-arrange as the fallback if the Forge tests as a chore.

## 8. Section 6: risks and what I'd measure (~200 words)

Reuse the Q1 shipping logic, focused on this feature:
- **Deliberate Forge use:** the share of Forge sessions where the player moves or rotates something rather than just pressing Accept. If it's low, the Forge is a chore → test auto-arrange.
- **Time in the Forge per session:** too long breaks the survivor-like flow.
- **Combos discovered per run, and on D1:** the Q1 target is ≥3 on D1. This is the leading indicator.
- **Readability:** can a new player say *why* a combo fired? If not → stronger link lines and partial hints, even though that breaks the no-hints rule.
- **One dominant arrangement** → rebalance it. Order only matters if more than one order is worth playing.
- **Readability lever (next, not built):** the Forge shows where a shot goes, not what comes out. If players can't predict outcomes, the first fix is an output preview at each exit (fan, slug, beam width), before any hints.

## 9. How AI was used (after the body, ~150 words)

Truthful and specific:
- The feature, the insight and every design decision are the user's (`user-input.md` is the record; the Q1 decisions are logged with dates).
- Claude (Opus, in Claude Code) built MODULAR's code to the user's approved plans, drafted this spec from the user's input and the Q1 design docs, checked every rule against the shipped code and ran the engine for the worked examples, and built the wireframes.
- Point to the curation note as evidence.
- "I reviewed and edited the final text." This becomes true in the user's final edit pass, done directly in the .docx.

## 10. Wireframes (2)

Both are greyscale, in **portrait phone frames** (390 × 844 logical, the phone layout MODULAR supports), with numbered callouts in a side column, plus a caption under each in the document. Built as HTML/SVG, rendered to PNG at 2× with headless Edge, and embedded at full text width with exact aspect ratios (the Q2 pipeline).

**Wireframe 1: the Forge Uplink workbench.**
**Strictly as built** (user decision). Don't draw anything the Forge doesn't draw today.
- The phone frame shows:
  - the dimmed, frozen battle behind;
  - the header "FORGE UPLINK // BONDING FIELD ACTIVE";
  - the blueprint grid with the cockpit at the centre;
  - a Pulse Cannon with a Lens, then a Prism, in front of it;
  - a booster node in a gap, selected, with spokes to its 4 spots;
  - the Pulse's route as a dashed line through Lens → Prism, ending in **one arrowhead** at the exit;
  - a second gun with a Mirror in front, so one route visibly shows **two arrowheads**;
  - a plain **gold outline** on the Pulse and the Lens (Slug Round, already discovered; no name label);
  - a part being dragged (lifted, with a shadow);
  - the part card strip (e.g. "LENS · SHOT CHANGER · octagon / IN LINE: Fuses shots fired into it into one big piercing slug.");
  - the buttons Rotate ⟳, Jettison (bin) and Accept.
- **Inset beside the phone:** "Same parts, other order". A mini grid of Pulse → Prism → Lens: the same straight dashed route and arrowhead, and no gold outline. Under the two grids, one line of numbers each: "Lens first: fan of 3 piercing slugs every 0.75 s · Slug Round ×1.5 · ~173 dps" vs "Prism first: 1 piercing slug every shot · no named combo · ~96 dps". The inset makes the point the screen can't: the routes look alike, but the output doesn't.
- **Callouts:**
  1. Frozen fight.
  2. A drag in progress.
  3. A live route: the path and the exit (two exits after a Mirror).
  4. The gold outline: discovered combos only, no names.
  5. Booster spokes.
  6. The part card.
  7. Rotate, jettison and accept. Accept is blocked while anything is disconnected.
- *(My call)* The frame combines states that happen moments apart (a drag in progress, a selected node, a card showing). The caption says so ("several moments of one session in one frame"), so it isn't read as a single instant.
- Mention honestly in the Forge section: "the Forge shows where a shot goes, not what comes out". A designer would note that an output preview is the obvious next step. Put this in **section 6 (risks)** as a readability lever, not in the wireframe.

**Wireframe 2: the in-flight combo moment.**
- The phone frame shows the ship mid-fight; a Beam Lance with a Mirror in front of it, its beam splitting (one branch straight, one at 90°) through a swarm; a thin linking line between the Beam and Mirror cells; a vignette marking slow-motion; the banner "XENO ARCHIVE · NEW ENTRY / SPLIT BEAM / (the analyst's quip)"; the HUD counter "XENO ARCHIVE 1/21"; a small toast "Blueprint unlocked: Mirror"; and the joystick zone.
- **Callouts:**
  1. The weld: a part you fly into attaches where it touched.
  2. The split beam, with its cause visible on the hull.
  3. The link line between the participating parts.
  4. About 0.5 s of slow-motion and a stinger sound (first time only).
  5. The banner with the name and the quip.
  6. The Archive counter.
  7. The Blueprint unlock ("Blueprint unlocked: Mirror"): this is what makes the next run deliberate.
- As built: later firings of an already-discovered combo only flash a small name tag. Don't show slow-mo for repeats.
- The quip to use (from `signatures.ts`): "Photon path bifurcated at the mirror. One branch obeys physics. The other obeys the hull."

## 11. Sources to cite (verify each before use)

- The Vampire Survivors wiki (evolution requirements) and a Survivor.io evolution guide: for the rationale's mechanical claims. *Check both pages before citing.*
- The Noita wiki (wand mechanics: spell order, modifiers, triggers).
- The Q1 writeup and the live build (internal links).
- No market figures are needed. Keep sources few and real.

## 12. Constraints

- **Voice:** first person, the user's voice, opinionated and plain. Follow the edited-prose standard of the Q1 and Q2 writeups: no filler, no hedging stacks, concrete numbers.
- **Accuracy:** nothing in sections 3 or 4 may contradict `q1-game/src`. Recheck any number added later.
- **Terminology:** keep the in-fiction names (Forge Uplink, Carrier, Xeno Archive, Blueprint) and the player-facing kinds (GUN, SHOT CHANGER, BOOSTER) consistent with the game.
- **No hints rule:** don't describe a hint system as built.
- **Files:** `docs/q3/` holds `design.md`, `implementation-plan.md`, `q3-draft.md` and `wireframes/` (HTML + PNG). The Word file is `q3-final.docx` at the repo root. `user-input.md` is never edited.

## 13. Left to the writer/builder *(my calls unless the user overrides)*

- Exact prose, headings within the structure, and which sentences carry the user's phrasing.
- Wireframe visual details within §10 (layout, grey values, typography).
- Whether example B is a table or two sentences, as long as the numbers stay exact.
- The docx styling (reuse the Q2 builder).
