# Research: reference games (modular salvage shooter + horde pressure)

*This file was produced by a research subagent on 2026-10-29.*

## 1. Captain Forever family
- **Loop:** you start as a bare cockpit, shoot an enemy's core so its parts float free, and snap them onto your ship with the mouse like magnets. There is no editor, so you build while under fire.
- **Physics:** parts hang off the structure, and losing the core means everything floats free. Placement is physically simulated: unbalanced thrusters spin the ship. Parts are "tissue paper".
- **Detaching:** players strip down to escape or to steal a bigger hull. Experts snipe connectors to harvest parts intact.
- **Difficulty:** colour-tiered ships (green, yellow, orange, red, blue, purple, white, then rainbow bosses), so power reads at a glance. You are never the biggest ship.
- **Captain Successor:** adds boosters, sniper, rams, torpedoes, repair parts and girders, so building takes strategy rather than just getting bigger.
- **Loved:** the colour hierarchy, the gamble of stripping down to steal, and how building and progression are the same system.
- **Hated:**
  - Clunky real-time mouse building with no pause.
  - Thin onboarding, luck-driven balance and no clear goal.
  - In Remix: difficulty spikes, grind, no mid-run save, and a "lack of a sense of progression and reward".
- **What it means for us:** keep the salvage fantasy but remove the friction of fumbling with the mouse, and add the meta layer it never had.
- Sources: https://games.jayisgames.com/review/captain-forever.php · https://farbs.itch.io/captainforeverio · https://www.gamedeveloper.com/game-platforms/analysis-forever-fun---i-captain-forever-i-s-game-design-choices · https://opencritic.com/game/2814/captain-forever-remix

## 2. Vampire Survivors
- **Evolutions:** a max-level weapon plus its paired passive evolves when you open a boss chest, usually from minute 10. The chest's slot-reel "payoff moment" is the only part shaped by the developer's gambling-industry background. Unions merge weapons into one.
- **Built in Phaser**, the same engine as ours.
- **Discovery:** recipes are never explained; players find them by accident or on wikis.
- **Collection:** "?" slots for things not found yet, and the total keeps growing.
- **Meta:**
  - Gold buys PowerUps, which can be refunded for free.
  - Long achievement lists unlock characters, weapons and stages.
  - Runs are capped at 30 minutes, and some gold always banks.
  - Dying near a chest or an unlock feels like a slot-machine "two cherries".
- Sources: https://vampire.survivors.wiki/w/Evolution · https://vampire.survivors.wiki/w/Collection · https://gamedeveloper.com/design/vampire-survivors-development-sounds-like-an-open-source-fueled-fever-dream · https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613

## 3. Similar games
| Game | Steal | Avoid |
|---|---|---|
| **Nova Drift** (closest; ~96% positive) | Gear picks define the build and mods modify it. Super Mods unlock from prerequisite pairs as hidden recipes. Mods move from straight upgrades to trade-offs. Rerolls drop from enemies. | Unintuitive momentum; walls of 150+ mod text |
| **Reassembly** | Block grammar where shape and joints matter; saved templates | "Cumbersome brick" handling and hard-to-aim fixed guns, so auto-aim the turrets |
| **Cosmoteer** | Visible power lines; volatile parts that explode and take neighbouring parts with them | Crew and logistics depth |
| **Brotato** | Short waves with a shop between them, so building happens outside the action; set bonuses | Stat-sheet maths mid-run |
| **Backpack Hero / Battles** | Adjacency stars: each item shows which neighbouring cells it buffs, so placement is the puzzle | Slow inventory Tetris during real-time combat |
| **Balatro** | Additive sources feeding a few multiplicative ones; a visible score climb as each part triggers; powerful effects with harsh drawbacks; nothing is always the right pick; a collection grid with win stickers | Opaque niche effects |
| **Magic Survival** | The starting class sets only your opening spell; one revive ad per run | Forced ads and IAP added after launch |
| **Survivor.io** | One-finger auto-aim; fast "zero to hero"; a boss every ~5 minutes | Gacha gear wall; late-game grind |

Sources: https://vaporlens.app/app/858210/nova_drift/stats/details · https://www.mejoress.com/nova-drift-super-mods-unlock-stats/ · https://www.gog.com/game/reassembly · https://casualgameguides.com/walkthroughs/backpack-battles/backpack-layout-item-positioning · https://lr.sudovanilla.org/r/balatro/comments/1czo9g0/guidelines_for_joker_design · https://naavik.co/deep-dives/survivorio-archeros-footsteps/

## 4. Day-1 hooks
- **First-run pacing:** show the core fantasy within 60 seconds (kill something, bolt on its gun). The first combo should land at about minute 3–5 of run 1.
- **Codex of combos:** "?" silhouettes plus partial hints ("needs something that burns") to seed the next run.
- **Near miss on the end screen:** "Unlock 4/5", "40 s from the boss", and gold that always banks. Hades' principle was "every run counts". Keep unlocks sideways (new parts and pilots) rather than raw power.
- **Daily seed:** cheap to build if the RNG is seedable. Slay the Spire's Daily Climb runs modifiers on a shared seed.
- **Retention benchmarks (GameAnalytics, all mobile genres):**
  - 2025: top-25% D1 ≈ 26–28%; median D7 ≈ 3.4–3.9%; top-25% D7 ≈ 7–8%.
  - 2026: median D1 ≈ 22%, P75 ≈ 30%, top 10% ≈ 40%; median D7 < 4%; D30 ≈ 0.7–0.8%.
  - Survivor.io D1 was in the mid-40s and Archero's close to 80% at launch (2022 data.ai figures via Naavik).
  - **Suggested targets:** D1 ≥ 35%, D7 ≥ 10%. Also track runs per session, time to first combo, and the share of players who discover at least one combo on day 1.
- Sources: https://investgame.net/wp-content/uploads/2025/02/2025-GameAnalytics-Mobile-Gaming-Benchmarks.pdf · https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game · https://www.tomsguide.com/features/hades-exclusive-interview-supergiant · https://saschb2b.github.io/game-mechanics/games/slay-the-spire/daily-climb

## 5. Monetization
- **Vampire Survivors mobile:** free, with optional ads for one revive per run or bonus gold. Players received them well. DLC at $1.99.
- **Brotato:** $4.99 premium, plus a free Android tier with ads and a VIP unlock.
- **Balatro:** $9.99 premium plus Apple Arcade; about $9.2M on mobile (AppMagic estimate).
- **Survivor.io:** $75M in two months, ~$500k a day from ads, over $500M lifetime IAP, and a battle pass within weeks. Players complained of a pay-to-win wall.
- **Recommended model:**
  - A free web demo, then premium or a one-time "full ship yard" unlock.
  - Cosmetic hull skins, paint and trails, plus cheap content packs.
  - Opt-in ads only: one revive per run, or double salvage at the end.
  - A battle pass, if any, cosmetic and generous on the free track.
  - **Never sell parts or power**, because buyable combos kill the discovery fantasy.
- Sources: https://www.pocketgamer.biz/vampire-survivors-surprise-launches-to-mobile/ · https://toucharcade.com/2023/03/28/top-down-roguelite-shooter-brotato-is-out-now-on-ios-and-android-as-a-premium-release/ · https://appleinsider.com/articles/24/09/26/balatro-deals-itself-into-the-app-store-and-apple-arcade/amp · https://mobilegamer.biz/two-months-in-survivor-io-passes-75m-from-37m-downloads/

## Gaps
- Some Fandom and press pages were blocked.
- No published D7 was found for any survivor-like.
- Survivor.io's sentiment data comes from weak sources.
