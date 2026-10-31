# Q2 context: everything behind the answer

This one file holds everything about Q2: the brief, the decisions, the thesis, the evidence, what was corrected, and what's still open. The answer itself is `q2-draft.md`, and the charts are in `charts/`.

Last updated 2026-10-31.

---

## 1. The brief

The question, verbatim:

> *"Pick a mobile free-to-play genre or sub-genre that you believe no one has truly cracked yet, or one that is overdue for reinvention. Explain why you think it hasn't worked so far, and what it would actually take to build a breakout hit there."*

The brief also warns that a generic AI answer "demonstrates a lack of critical thinking." AI use is allowed but must be disclosed: sources, assumptions, and where AI output was used.

So the answer must do three things:

- **Name** a narrow genre.
- **Diagnose** why it hasn't worked, with evidence.
- **Prescribe** specific design and business moves.

## 2. Decisions made (and by whom)

| Decision | Choice | Who |
|---|---|---|
| Genre | **Real-time PvP lane battlers** (the Clash Royale genre), picked from a 22-genre shortlist | User |
| Thesis | **A:** CR's revenue engine (card levels) is what players hate, and CR can't remove it without cutting its own income. A breakout needs fixed power in ranked. | User picked from 3 options |
| Launch plan | **C:** disclosed AI rivals to solve the cold start, with creators as a channel | User |
| Format | Google Doc / Word style, headings, charts, source links | User |
| Length | Started at ~2 pages. **Now 1,200+ words, and the user does not want cuts.** | User |
| Title | Simple: "Why nobody has cracked the lane battler" | User |
| References to the hiring studio | **None.** No CEO name, no studio project names | User |
| Charts | Both: CR revenue line, and the 2×2 gap map | User |
| Play sessions | Not before the draft. Play notes can be added later (see `play-notes.md` in the project) | User |
| Cut for length | The Rush Royale line in §2c was removed | Claude, early draft |

**Fallback genres** if the user ever switches, the other tier-A picks from the shortlist:

- AI companion as a game
- Cricket
- CCGs after Snap and Pocket
- Co-op PvE horde shooter
- Friendslop on mobile

## 3. The argument in brief

1. **Demand is real.** CR has more than $4.9B lifetime revenue. In 2025 it went from $12M to $68M a month, mostly because lapsed players returned.
2. **Why it's uncracked:**
   - **(a) The treadmill is the business.** Each level adds +10% stats, so a level gap reads as pay-to-win. CR's crashes followed new power layers, and its boom followed friction removal.
   - **(b) Challengers copied the treadmill onto thin ladders.** Rumble earned well per player and still fell 92%. The correction: liquidity amplifies a weak core; it doesn't cause one.
   - **(c) Challengers added complexity**, so players couldn't read why they lost.
3. **What it would take:**
   - **(1)** Fixed power in ranked, from a weekly pool everyone can use.
   - **(2)** Sell identity, not strength, and sell it deep: cosmetic rarity, high-end cosmetics, sidegrades, consumables and clans.
   - **(3)** Stay legible.
   - **(4)** Disclosed AI rivals, phased out as the player base grows, plus creator ghosts.
4. **Risks and tests:**
   - Spending depth: kill the project if it stays at Snap's level.
   - Decay: needs a fast content cadence.
   - A weak core: test it with AI-only cohorts.

**Why CR can't follow:** it can copy cosmetics overnight, but not fixed power without cutting its own revenue. That is the challenger's moat.

## 4. Key evidence (verified)

### Clash Royale
- **Balance rule** (Stefan Engblom, GDC 2017): each level adds +10% HP and damage "so all interactions remain the same." Levels change outcomes, not matchups.
- **Power-layer crashes:**
  - Level 15 (Jun 2023): players had been told 14 was the cap; boycotts followed.
  - Level 16 + Heroes (24 Nov 2025).
  - James Back (Supercell design lead), Gamescom Dev, 24 Aug 2026, checked on mobilegamer.biz: **"At the end of last year, we killed Clash Royale."**
  - Jun 2026: Supercell promised no more card levels.
- **The 2025 revival** came from:
  - Friction removal in Mar–Apr 2025: no chest timers, keys or Season Shop.
  - Magic Items, which let players choose which cards to upgrade.
  - Evolutions handed out broadly.
  - Creators: Jynxzi, and CRL finals viewers going from 142K to 698K.
  - Merge Tactics (late Jun 2025) was secondary.
- **Revenue, AppMagic net estimates (net basis inferred):**

  | Month | Net revenue |
  |---|---|
  | Feb 2025 | $12M |
  | May 2025 | $27.7M |
  | Jul 2025 | $45.8M |
  | Aug 2025 | >$63M |
  | Sep 2025 | $67.8M (peak) |
  | Jan 2026 | $26M |

  - That is −62% from Sep to Jan.
  - The 2025 total was $646.8M gross, up 149%.
  - Gross series: Sep $98.4M, Jan 2026 $37M.
- **Players (Udonis/AppMagic MAU, the only player source now used):** Jun 2025 52.4M → Sep 65.4M → Dec 75.3M (2025 high) → Jan 2026 74.2M → Jun 2026 65.6M. Players held up Sep → Jan while revenue fell 62%. The "96.2M peak" is an all-time figure (the page says the player base topped out in 2018), not the 2025 high.
- **Ranked drifted away from fixed power:** capped at Level 11 in Apr 2023 (Mega Draft), Level 15 until May 2026, then Level 16.

### Challengers
- **Warcraft Rumble:**
  - D30 revenue per download was $7.55, against Marvel Snap's $3.41 (Naavik).
  - Monthly revenue went from $24.6M to $2M in year 1, −92% (pocketgamer.biz/AppMagic).
  - Lifetime about $64M (as of Nov 2024).
  - Described as "RTS-lite", with "new mechanic after new mechanic."
  - Cross-region matching complaints.
- **Squad Busters:**
  - 31M installs in launch week, about $68M lifetime.
  - Supercell: "too few players connected with it deeply enough."
  - Katkoff: "difficult to improve at and easy to give up on."
  - Closes 14 Dec 2026.
- **Others:**
  - Clash Mini was killed in Mar 2024, then revived as Merge Tactics.
  - Force Arena closed in 2019.
  - Rush Royale is about $500M (publisher figure, no head-to-head clash). Cut from the essay and, on 2026-10-31, from chart 2.

### Counter-arguments answered
- **"Marvel Snap shows fixed power can't earn."**
  - Snap's ceiling was a shallow money sink: about 250 cards at about $12 each, and players got what they wanted for "less than $100/yr" (Deconstructor of Fun).
  - When Snap then sold card access, it drew the same revolt.
  - That's why ranked must use a pool everyone can use.
- **Legends of Runeterra:** fixed power and generous card access, but it "cost significantly more to develop and support than it generates." This is the kill-criterion risk.
- **"Cosmetics can't produce big spenders."**
  - League of Legends sells $435 bundles aimed at players "willing to spend $200 a month."
  - Pokémon TCG Pocket made $1.6B in 18 months with functionally identical rare cards. But it decays fast: −51% in its second half-year.
- **Honor of Kings:** don't call it purely cosmetic. Chinese skins have carried small stat bonuses.

### AI rivals and the law
- **Bots today are mostly hidden** (Snap). Fortnite and Battlefield 6 disclose theirs.
- **Riot:** scripted co-op-vs-AI games don't improve players' PvP results.
- **Shipped human-like AI:** Tencent Juewu, Sony GT Sophy, Forza Drivatar. Imitation-learned matchmaking bots train in days (arXiv 2501.00078).
- **Law:**
  - **EU AI Act Art. 50**, applying since 2 Aug 2026: AI must identify itself when it interacts with people.
  - **Skillz v. Papaya:** a $420M verdict in Apr 2026, plus $719M disgorgement in Jul 2026. The court held that "fair" can imply human opponents.
- **Creators bring installs, not retention.** Squad Busters' open creator codes didn't save it.

## 5. Corrections made during the work (don't repeat these errors)

- **Revenue figures:**
  - "Mar 2025 $20.9M" and "Jun 2025 $51.4M" weren't on the cited AppMagic page.
  - The 2023–24 monthly "$20–29M" is unverified.
  - There's no monthly data for Feb–Sep 2026.
  - "Revenue down ~80%" didn't hold up. Use −62% (Sep → Jan).
- **Player decline:** neither "−13%" nor "−32%" is used. −32% compared against the all-time peak. squrs (34M → 56M) was dropped because it disagreed with Udonis (65.4M in Sep 2025).
- **Rumble lifetime:** "$74M" is wrong. It's about $64M.
- **Quotes:**
  - "Don't ever take your community by surprise" (Emilia Russell) was not found at its source. Don't use it.
  - "We were wrong" on Squad Busters is a news headline. Supercell's actual line is "we had got it wrong," and it was about the launch approach.
- **Causes:**
  - The CR revival was mainly friction removal, not Merge Tactics.
  - Paananen's Feb 2026 apology was about crediting creators, not about Level 16.
- **No source found:** the "Feb–Mar 2026 rollbacks" have no source. Don't claim specific rollback dates.
- **Rule for third-party figures:** they're estimates, so always name the provider and say gross or net.

## 6. Files

| File | Role |
|---|---|
| `q2-draft.md` | **The answer.** About 1,330 words, with assumptions, 29 sources and the AI disclosure |
| `charts/chart1-cr-revenue.png` | Chart 1: CR monthly net revenue, Feb 2025 – Jan 2026, annotated |
| `charts/chart2-gap-map.png` | Chart 2: 2×2 gap map (power for sale vs fixed power × real-time vs indirect) |
| `charts/*.html` | Chart sources. Edit one, then open it in Chrome and screenshot it at 2× |

The draft links charts as `charts/...`, so keep that folder next to `q2-draft.md`.

The full research files (`lane-battlers-research.md`, `genre-shortlist.md`, `q2-outline.md`, `play-notes.md`) stay in the project directory. This file summarizes them.

## 7. Still open

- **You:** read the draft through before submitting. The AI disclosure says "I reviewed the final text."
- **Optional:** play Squad Busters before 14 Dec 2026 and add a line or two of first-hand notes. Any play you do should also be mentioned in the AI disclosure.
- **When pasting into Google Docs or Word:** insert the two PNGs by hand at the chart lines.
