# Build Notes

A log of the decisions and the mistakes, kept because both are useful when the
engine is extended later.

---

## Shape of the build

1. **Foundation** — a zero-dependency project (`package.json`, static server),
   then the two data files: the root-language lexicon and the four voice
   profiles.
2. **Ear** — `engine/phonetics.js`: syllables, stress, rhyme keys, a working
   word-hoard.
3. **Reading** — `engine/analysis.js`: line scansion, sound devices, root census,
   affinity scoring, diagnostics.
4. **Voice** — `engine/coach.js`: deterministic, draft-aware replies.
5. **Room** — `index.html`, `styles.css`, `app.js`: four views, a voice drawer,
   a live read-out, chat, local persistence, an optional model.
6. **Proof** — a `node:test` suite, then a browser pass for console errors and
   layout.
7. **Paper** — this documentation set.

---

## Decisions

### No framework, no build

The app is one draft and one conversation. A framework would have added a build
step, a dependency tree and a hydration model for no benefit. Plain ES modules
mean every behaviour is inspectable and the project can sit untouched for a year
and still run.

The cost is manual DOM rendering and manual escaping. Both are contained in
`app.js` and small enough to audit.

### Analysis is pure and separate

Nothing under `engine/` touches the DOM. That made it possible to test the whole
reading with `node:test` before the interface existed, and it keeps the coach
from silently re-parsing the poem.

### Approximate, and honest about it

A real scansion engine needs a pronouncing dictionary (CMUdict or similar) and a
stress model. Shipping one would have meant a megabyte of data and a build step.
Instead the engine uses:

- a hand-set dictionary of a few hundred common words;
- spelling rules for syllables and stress;
- explicit “mixed” labels when the evidence is weak;
- visible caveats in the UI and README.

This is a deliberate trade: the tool is a prompt for the ear, not a grade.

### Rhyme as sound families, not phonetics

A full rhyme engine needs phonemes. The compromise is a key of
`vowel class + normalised tail`, with special handling for silent *e*, magic *e*,
syllabic `-le`, soft *c/g*, and a list of common irregulars. It is good enough to
find `love / above`, to separate `love / move`, and to notice `stone / home` as a
slant. It will be wrong about dialect and stress shift. The UI says so.

### Profiles are targets, not portraits

The four affinity profiles are twelve numbers set by ear, then calibrated against
the built-in samples. They are not derived from corpus statistics. The scoring is
transparent (`ARCHITECTURE.md`), and the app shows the two nearest features rather
than a single unexplained percentage.

### The coach is deterministic by default

A local, rule-based coach has three advantages: it works offline, it is
reproducible, and it cannot invent a quotation. The trade-off is that it cannot
surprise you. Live-model mode is opt-in and clearly labelled; when it fails, the
offline coach takes over with a visible note.

### Original pastiche, not quotation

Each voice drawer includes a short poem written **in the manner of** the poet.
This avoids reproducing copyrighted work, gives the scansion engine a clean
demonstration, and models the intended use: borrow the rhythm, write your own
words.

### Local first

Draft, chat, lens and settings live in `localStorage`. There is no backend and no
analytics. The only outbound request is the optional model call, and the key is
kept in the browser.

---

## What testing caught

The first engine run looked plausible and was wrong in several interesting ways.
These are worth remembering.

### 1. Every poem had 100% rhyme

`rhymeDensity` counted every rhyme *letter*, including families of one. That made
every line “rhyming” and pushed every draft toward Dylan/Bilston.

**Fix:** count only lines in families of two or more. The four samples then
separated cleanly.

### 2. Silent *e* broke the rhyme keys

`stone` hashed as `EH`, `home` as `EH`, because the last vowel group in the
spelling is the silent *e*.

**Fix:** drop a silent final *e* before finding the vowel group, but preserve the
soft `c`/`g` information (`once` → `ons`, `voice` → `vois`, `age` → `aj`), then
apply “magic *e*” lengthening (`a → EY`, `o → OW`, …) for words without an
irregular override.

### 3. `-le` collapsed every family

`table`, `little` and `people` all became `UHl`.

**Fix:** keep the consonant before `-le` in the key (`UHbl`, `UHtl`, `UHpl`). Now
`table / cable` rhyme and `table / little` do not.

### 4. Foot labels were overconfident

A loose accentual line was labelled “dactylic” on a 0.5 share. That reads as a
false claim.

**Fix:** if the winning grouping's top share is below `0.52`, label the line
**mixed** and show beats instead. Accentual verse is now described as accentual.

### 5. The Heaney sample echoed Bilston

The sample averaged 7.8 syllables a line; Bilston's target is 9.5, Heaney's 10.5.
The engine was right about the numbers and wrong about the ear.

**Fix:** this was not a formula bug. The sample was too short and too even. The
pastiche was expanded and the scoring was recalibrated (see below). The lesson:
affinity is only as good as the draft it reads.

### 6. The Dylan sample did not rhyme

The original four lines ended `rain / name / stone / home` — two non-rhymes. The
engine correctly reported 0% rhyme, which made the “Dylan” demo contradict
itself.

**Fix:** changed line 2 to end `train` (exact rhyme with `rain`) and kept
`stone / home` as an intentional near-rhyme, which the read-out now explains.

### 7. Punctuation dominated the distance

The `punct` feature had a tight scale (0.8) and a large weight (0.5). A Dylan
sample with commas in every line was punished so hard that Bilston overtook it.

**Fix:** scale `1.5`, weight `0.25`. Punctuation still matters, but it no longer
outvotes meter and rhyme.

### 8. Gorman's pastiche wasn't Gorman

The first version had 10-syllable lines — short for a poet whose signature is the
long breath-line. The model was being asked to recognise a voice the demo did not
perform.

**Fix:** rewrote the pastiche with 13–16 syllable lines, a late tricolon and a
harder turn. The sample now scores Gorman first.

### 9. `stories` counted as one syllable

The `-es` reduction fired on `-ies`.

**Fix:** exempt `-ies` from the plural reduction and `-ied` from the past-tense
reduction. `stories` = 2, `studied` = 2.

### 10. The drawer's click listener ate itself

`openVoice()` attached a delegated listener with `{ once: true }`. The first click
anywhere in the drawer — including on plain text — removed the listener, so the
footer buttons stopped working.

**Fix:** one permanent delegated listener on `#voiceDrawer`, bound at startup.
Buttons carry their own `data-` payloads, so no closure is needed.

### 11. Init order crashed with a saved chat

`runAnalysis(true)` called `renderChat()` before the first-run greeting was
seeded, so `state.chat` could be `null`.

**Fix:** analyse first, seed the chat, then render. `renderChat()` assumes an
array.

### 12. Invalid markup inside language cards

The root-language cards were `<button>` elements containing `<p>`, which is not
valid button content.

**Fix:** changed the blurb to a styled `<span>`.

---

## Calibration notes

The affinity scores were tuned against the four built-in samples with one rule:
**each sample must put its own voice first, and the reasons must make sense.**

Current results:

| Draft | Closest | Score |
|---|---|---:|
| Heaney pastiche | Heaney | 61 |
| Gorman sample | Gorman | 61 |
| Dylan sample | Dylan | 64 |
| Bilston sample | Bilston | 70 |

Scores are deliberately not pushed toward 100. A 60 means “recognisable family
resemblance”, not “this is the poet”. The UI frames it as a resemblance.

Two tuning changes mattered most:

- lowering Dylan's `repetition` target from 0.45 to 0.30, because a single
  four-line stanza rarely contains anaphora;
- raising the `punct` scale and lowering its weight, so commas cannot outvote
  the meter.

---

## Verification

- `npm test` — 10 tests pass.
- `node --check` on every browser and engine module.
- Browser pass at `http://localhost:4173`:
  - landing page renders;
  - Workshop renders editor, read-out and coach with no console errors;
  - sample loaded on first run;
  - stat strip and scan agree (`5 lines`, `7.8 syll/line`, `4.0 beats`,
    `0% rhyme` for the Heaney sample).

What was not exhaustively verified:

- Every drawer at every breakpoint.
- Screen-reader traversal of the drawer.
- Safari/Firefox rendering of `color-mix()` and `100dvh` (both are supported in
  current versions, but the layout has not been visually checked there).
- Live-model mode against a real endpoint (the code path is guarded and falls
  back, but no key was used).

---

## If the work continues

1. **A focus trap for the drawer** and return focus to the card that opened it.
2. **A pronouncing dictionary option** (CMUdict) behind a toggle, for users who
   want stricter scansion.
3. **Expand the stress dictionary** rather than adding more suffix rules; the
   current rules are at the point of diminishing returns.
4. **A light theme** using the same tokens (paper, ink, one red-gold).
5. **Export** — print stylesheet and “copy as plain text” for the read-out.
6. **Multiple drafts** with a small local library, instead of one page.
7. **More voices** — the data shape already supports it; the hard part is writing
   an honest profile and an original pastiche.
8. **Corpus calibration** — if profiles are ever derived from real poems, keep
   the target values and the explanations visible.

The engine should stay small enough to read in one sitting. That constraint has
been more valuable than any feature.
