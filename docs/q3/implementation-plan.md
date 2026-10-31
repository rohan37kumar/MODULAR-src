# Q3 Production Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (Native; the user's standing choice). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** produce the Q3 answer (the Forge Uplink spec) as `q3-final.docx` (repo root), with two embedded wireframes, ready for the user's final edit in Word.

**Architecture:** the markdown source `docs/q3/q3-draft.md` is written to the design. The wireframes are HTML/SVG files rendered to PNG at 2× with headless Edge. The docx is built from the markdown by the Q2 builder (docx-js), extended for one boxed note, then checked via a Word → PDF → PNG render.

**Tech stack:** Markdown; HTML/SVG; headless Edge (`msedge --headless=new --screenshot --force-device-scale-factor=2`); Node + `docx@9.5.1` (already installed in the scratchpad `docxbuild/`); Word COM for the PDF export; PyMuPDF for page images.

**Spec:** `docs/q3/design.md` (approved 2026-11-01). Intent source: `docs/q3/user-input.md` (never edited).

## Global constraints

- Body ~2,000–2,500 words. Sources and the AI disclosure come after the body.
- First person, in the user's voice. Opinionated and plain, with no generic filler.
- Every number in the rules and Forge sections matches `q1-game/src` (the engine values in design §5.2).
- Wireframes are **strictly as built**: dashed routes with one arrowhead per exit and gold outlines with no names. Greyscale, portrait phone frame, numbered callouts.
- The fiction names and player-facing kinds match the game: Forge Uplink, Carrier, Xeno Archive, Blueprint, GUN / SHOT CHANGER / BOOSTER.
- No git; the user handles it.
- The deadline is Mon 2 Nov. The user edits the .docx directly after handover.

## Review focus

1. **Numbers drifting from the engine** (e.g. "173 dps" written as "170", or "half" for the Mirror) → the final check greps every number in the draft against design §5.2.
2. **Wireframes showing unbuilt UI** (combo names, fanned routes, output previews) → the visual check in Tasks 2 and 3 compares against design §10 line by line.
3. **Rationale claims about Vampire Survivors and Survivor.io evolutions that aren't true** → Task 1 checks each claim on a source page before drafting.
4. **The docx losing the boxed note, captions or image aspect ratios** → Task 5 measures the inline shapes in Word and inspects every page.
5. **Generic AI prose** (stacked hedges, "enhances engagement" with no mechanism) → the Task 6 reviewer flags any sentence without a mechanism or number.

---

### Task 1: Verify the rationale's sources

**Files:** notes go into Task 4's Sources section; no other file.

- [ ] **Step 1:** Check the Vampire Survivors evolution requirements (a max-level weapon + its paired passive, from a chest after 10:00, or the exact current rule) on a wiki page. Record the URL and the exact wording.
- [ ] **Step 2:** Check the Survivor.io evolution rule (a maxed skill + its matching supporting item). Record the URL.
- [ ] **Step 3:** Check the Noita wand mechanics (spells cast in order; modifiers change the next spell; shuffle). Record the URL.
- [ ] **Done when:** each rationale claim has a checked URL, or it is reworded to what the source actually says.

### Task 2: Wireframe 1, the Forge Uplink workbench (background agent, verified by the main thread)

**Files:** create `docs/q3/wireframes/wf1-forge.html` and `docs/q3/wireframes/wf1-forge.png`.

- [ ] **Step 1:** Build the HTML/SVG to design §10 (Wireframe 1): the phone frame at 390×844 logical, the callouts column, and the "Same parts, other order" inset with the two number lines exactly as specified. Canvas 1200 px wide; height set by the content.
- [ ] **Step 2:** Render: `msedge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1200,<H> --screenshot=<png> file:///<html>`.
- [ ] **Step 3:** The main thread views the PNG and checks every §10 element and callout. There's no combo name anywhere, and each route has one arrowhead per exit (two on the Mirror gun).
- [ ] **Done when:** the PNG matches §10 with no unbuilt UI, and the text is legible at 6.25 in wide.

### Task 3: Wireframe 2, the in-flight combo moment (same agent as Task 2, verified by the main thread)

**Files:** create `docs/q3/wireframes/wf2-combo.html` and `docs/q3/wireframes/wf2-combo.png`.

- [ ] **Step 1:** Build to design §10 (Wireframe 2): the banner texts verbatim ("XENO ARCHIVE · NEW ENTRY", "SPLIT BEAM", the quip from `signatures.ts`), "XENO ARCHIVE 1/21", "Blueprint unlocked: Mirror", and 7 callouts.
- [ ] **Step 2:** Render as in Task 2.
- [ ] **Step 3:** The main thread checks it against §10.
- [ ] **Done when:** as for Task 2.

### Task 4: Draft `docs/q3/q3-draft.md`

**Files:** create `docs/q3/q3-draft.md`.

- [ ] **Step 1:** Write the sections in the order and word budgets of design §4. Use the §5.2 numbers verbatim and the §6 curation items verbatim in meaning. Mark the boxed note with a `> ` blockquote, starting `> **Curation note: where the AI text was wrong**`.
- [ ] **Step 2:** Embed the wireframes as `![Wireframe 1: …](wireframes/wf1-forge.png)` in section 4 and `![Wireframe 2: …](wireframes/wf2-combo.png)` in section 5.
- [ ] **Step 3:** Word count: body (title to "Sources") is 2,000–2,500. Run `awk '/^## Sources/{exit} {print}' q3-draft.md | wc -w`.
- [ ] **Step 4:** Number check: every number in section 3 appears in design §5.2 or the code. Grep the digits and compare.
- [ ] **Done when:** the count is in range, every number checks out, and every section of design §4 is present.

### Task 5: Build and verify `q3-final.docx` (repo root)

**Files:** modify the scratchpad `docxbuild/build.js` (generalise the input and output file names; add the blockquote → shaded, bordered box); create `q3-final.docx` (repo root).

- [ ] **Step 1:** Extend the builder: `node build.js <dir> <md-name> <out.docx>`. The Q2 call must still produce an identical structure (rebuild Q2 and confirm it is still 7 pages with 2 inline shapes).
- [ ] **Step 2:** Build the Q3 docx.
- [ ] **Step 3:** Word COM: the page count, the inline-shape sizes (6.25 in wide, aspect ratio equal to the PNG), and a PDF export.
- [ ] **Step 4:** Render the pages with PyMuPDF and view every page: the box, captions, headings, bullets and links.
- [ ] **Done when:** every page looks clean and the images are exact.

### Task 6: Final review

- [ ] **Step 1:** Dispatch a fresh reviewer agent with the draft, design.md and `q1-game/src`. Ask for (a) any claim that contradicts the code, (b) any brief requirement not met, and (c) sentences that read as generic AI. Give it the code, not my conclusions.
- [ ] **Step 2:** Fix the confirmed issues, then rebuild the docx (repeat Task 5, Steps 2–4).
- [ ] **Step 3:** Hand over to the user: the docx path, the word count, and the list of calls to check while editing.
