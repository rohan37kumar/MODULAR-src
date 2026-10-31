# Research: Lila Games and AI inside games

*This file was produced by a research subagent on 2026-10-29. Some points are the agent's inference and are marked as such.*

## 1. Lila Games (high confidence it's the right company)
- **LILA Games Pvt Ltd**, Bengaluru. Their Game Designer job post says: "LILA builds AI games… experiences that only work because AI is at their core." Unrelated companies with similar names: Lila Sciences, LILA World.
- **Shipped or in progress:** **LILA BLACK / Project B.L.A.C.K.**, a mobile F2P PvPvE extraction shooter built in Unity, with a social hub ("The Realm") and loot you lose on death. In development since 2020 with no global launch yet. A TapTap test build review (Feb 2025) scored it 7.5/10, praising the tension and criticising the controls, lag and matchmaking. More projects are "revealed soon". Job posts mention "a new mobile F2P shooter" and design across "midcore, RPG, roguelike".
- **Funding:** about $12.8–19M in total. A $2.8M seed (BITKRAFT, Galaxy, Sequoia Surge), then a $10M Series A in March 2022 led by Rainfall with KRAFTON, Sequoia, BITKRAFT and Galaxy.
- **Leadership:**
  - **Joseph Kim**, CEO. *Very likely the "JK" interviewer (inference).* Former CPO at SEGA, SVP Games at NBCUniversal, and studio lead at FunPlus. Runs GameMakers. Calls himself an "AI maximalist".
  - **Avinash Pandey**, CTO.
  - **Paul Leydon**, co-founder and lead designer (FunPlus, MZ).
  - Tarun and Arshnoor were not found publicly.
- **Kim's AI vision** is practical and LiveOps-focused: predictive LTV, churn modelling, offer personalisation, real-time dynamic difficulty, economy balancing, and AI agents that run events and battle passes. In his words, "The real unlock isn't the technology. It's orchestration."
- **What they value in designers:** deep mobile F2P knowledge (loops, economy, retention), AI used throughout the workflow, shipping fast ("rough version in front of players this week > polishing a doc for a month"), comfort with data, and clear specs. Their culture is "Radical Truth and Debate", "no hype, just results".

## 2. AI inside games, 2024–2026
**What worked**
- **Infinite Craft** (2024): an LLM decides each new combination, and the result is cached globally. That makes results deterministic, means each combination is paid for only once, and creates the viral "First Discovery" moment. *This is the closest analogue to our game.*
- **inZOI Smart Zoi**: a small model runs on the player's machine (RTX cards only).
- About 1 in 5 Steam releases in 2025 disclosed generative AI use.

**What flopped**
- Fortnite's AI Darth Vader was tricked into slurs within hours.
- Where Winds Meet's chatbot NPCs were abused and used to skip quests.
- AI Dungeon had a moderation crisis.
- ARC Raiders had to re-record its AI voice lines.
- Suck Up! is expensive to play on a per-token basis.
- Core gamers punish generative AI they see as cutting corners.

**Practical points**
- Latency is 1–5 s, so never call a model in the frame loop. Call it between waves or while editing the build.
- Caching keeps cost near zero. Cloudflare Workers AI's free tier covers about 100–200 short responses a day.
- Moderation: no free-text input from players. Send enums and numbers to the model and validate the JSON that comes back.
- Determinism: a seed plus a cache keyed by the sorted part IDs.
- Static demo: keep the key in a serverless proxy (Cloudflare Worker or Vercel) and fall back to pre-generated JSON. On-device options:
  - WebLLM (WebGPU): about 335–700MB to download, and it fails on many phones.
  - Chrome Prompt API: desktop only.

## 3. Options for AI in our game
| Option | Feasibility | Notes |
|---|---|---|
| **A. AI names and lore for discovered combos** (Infinite Craft pattern) | Very high, 3–5 h | The rules stay in code and the model writes `{name, flavor, rarity_title}`. Pre-generate 100–300 combos as JSON, and have a Worker plus KV handle new ones with a global "First discovered by…". Fall back to "Unidentified Synergy #47". |
| **B. AI-generated parts or rules inside a safe schema** | Medium, 1 day | Enum and range outputs, clamped by a validator. Pre-generate and curate the pool offline. Risks are balance and dull results. |
| **C. AI "rival captain" who designs counter-ships** | Medium-high, 0.5–1 day | Reads a summary of your build and returns a ship as grid JSON plus a taunt. Players can see and read the AI's choices. The agent's top pick for fun per hour. |
| **D. AI that adapts the run** | High | A heuristic difficulty director is enough. Mostly invisible to players; matches Kim's LiveOps thesis. |

The agent recommended A + C, with B pre-generated and curated, behind one Cloudflare Worker with KV caching and rate limits, and fully playable offline from bundled JSON. The writeup should separate the AI used to build the game from the AI used as a mechanic.

## Sources
https://lilagames.com · https://lilagames.com/inside-lila/ · https://careers.bitkraft.vc/companies/lila-games/jobs/25983200-game-designer · https://www.foundit.in/job/lead-level-designer-lila-bengaluru-bangalore-47567420 · https://india.entrepreneur.com/news-and-trends/mobile-game-development-startup-lila-games-raises-10/422356 · https://www.thewrap.com/project-black-mobile-shooter-lila · https://www.bitkraft.vc/portfolio/lila-games/ · https://www.taptap.io/es/post/10512178 · https://unity.com/resources/joe-kim-podcast · https://www.globalgamesforum.com/news-media/predictions-for-mobile-games-in-2026 · https://pcgamer.com/this-browser-based-endless-crafting-game-starts-you-off-with-fire-and-water-but-it-quickly-escalates-to-god-the-big-bang-and-yin-yoda · https://www.nvidia.com/en-gb/geforce/news/nvidia-ace-naraka-bladepoint-inzoi-launch-this-month/ · https://www.tomshardware.com/video-games/pc-gaming/1-in-5-steam-games-released-in-2025-use-generative-ai-up-nearly-700-percent-year-on-year-7-818-titles-disclose-genai-asset-usage-7-percent-of-entire-steam-library · https://pcgamer.com/games/battle-royale/fortnite-added-an-ai-powered-darth-vader-and-surprise-players-immediately-tricked-him-into-saying-slurs · https://www.pcgamesn.com/where-winds-meet/reception-ai-chatbots · https://help.aidungeon.io/faq/openai-and-filters · https://www.screenhub.com.au/news/games/arc-raiders-ai-voice-actors-replaced-2695984/ · https://developers.cloudflare.com/workers-ai/platform/pricing/ · https://pinggy.io/blog/run_llm_in_browser_webgpu/
