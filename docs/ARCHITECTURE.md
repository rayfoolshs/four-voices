# Architecture

Four Voices is a static single-page app with a small, pure-JavaScript analysis
engine. There is no framework, no bundler and no runtime dependency. The server
exists only because ES modules cannot be loaded from `file://`.

---

## Data flow

```text
                    ┌──────────────────────────────┐
                    │  textarea #draft             │
                    │  (debounced 150 ms)          │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │  analyzePoem(text)           │
                    │  engine/analysis.js          │
                    └──────────────┬───────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼────────┐        ┌────────▼────────┐        ┌────────▼────────┐
│ renderStats()  │        │ renderReadout() │        │ coachReply()    │
│ stat strip     │        │ scan/sound/     │        │ engine/coach.js │
│                │        │ roots/echoes    │        │ or llmReply()   │
└────────────────┘        └─────────────────┘        └─────────────────┘
                                                              │
                                                     ┌────────▼────────┐
                                                     │ chat log        │
                                                     │ chips, lens     │
                                                     └─────────────────┘
```

The analysis is computed once per draft change and shared by the read-out and
the coach. Nothing re-parses the poem independently.

---

## Modules

| File | Responsibility | Pure? |
|---|---|---|
| `data/roots.js` | Language metadata, 455-word etymology lexicon, suffix inference | yes |
| `data/poets.js` | Four voices: prose, pastiches, exercises, affinity profiles | yes |
| `engine/phonetics.js` | Syllable counts, stress patterns, rhyme keys, rhyme families | yes |
| `engine/analysis.js` | Line scansion, sound devices, root census, affinity scoring | yes |
| `engine/coach.js` | Intent routing and draft-aware reply construction | yes |
| `app.js` | DOM rendering, state, events, persistence, optional LLM | no |
| `server.mjs` | Static file server with path containment and MIME types | no |

Everything under `engine/` and `data/` is importable in Node and covered by
tests. `app.js` is the only browser-bound layer.

---

## Analysis pipeline

### 1. Line model

`analyzePoem(text)` splits on newlines, drops blank lines, and tracks stanza
indices. Each line becomes:

```js
{
  index, number, stanza,
  text, words,
  syllables, pattern, patternStr, beats,
  foot, footNoun, feet, regularity,
  lastWord, rhymeKey, rhymeLetter,
  hardStop, softStop, enjambed,
  caesura: { present, at, words, mark },
  alliteration: [[wordA, wordB], ...],
  assonance: [{ sound, words }, ...]
}
```

### 2. Syllables

Three layers, in order:

1. **Dictionary** — common words with hand-set stress patterns (`DICT`).
2. **Inflection stripping** — plurals, `-ed`, `-ing`, `-ly`, `-ness`, `-ment`,
   `-less`, `-ful`, comparatives. The base is measured, then a beat is added only
   where English actually adds one (`wanted` = 2, `walked` = 1).
3. **Spelling heuristics** — vowel groups, silent final *e*, syllabic `-le`,
   `-ed`/`-es` rules, `ia/io` hiatus.

### 3. Stress

Dictionary first. Otherwise:

- suffix rules for `-tion`, `-ity`, `-ic`, `-ical`, `-ious`, `-ous`, `-al`,
  final `-y` (offset from the end);
- prefix shift for `be-`, `de-`, `re-`, `pre-`, `pro-`, `ex-`, `con-`, `dis-`,
  and similar;
- default first-syllable stress.

### 4. Feet

The engine scores two groupings of the stress pattern:

- **duple** — pairs (`01` iamb, `10` trochee, `11` spondee, `00` pyrrhic);
- **triple** — triples (`001` anapest, `100` dactyl, `010` amphibrach).

Each grouping is scored by `topShare × coverage`, where coverage is the share of
syllables actually grouped. The higher score wins. If the winning share is below
`0.52`, the line is labelled **mixed** rather than pretending to a foot. This
matters for accentual verse: a line with four strong beats and irregular slack
is not “dactylic”, it is loose.

### 5. Caesura and enjambment

- **Caesura**: first internal `, ; : — –` or a full stop followed by more text.
  The engine records the character index and the number of words before it.
- **Hard stop**: line ends with `. ! ? …` (or a closing quote/bracket).
- **Soft stop**: line ends with `, ; : — –`.
- **Enjambed**: neither. The enjambment rate counts full runs as 1 and soft
  stops as 0.5.

### 6. Rhyme keys

A rhyme key is `VOWEL_CLASS + normalised_tail`. Examples:

| Word | Key | Notes |
|---|---|---|
| `night` | `AYt` | `igh` override, `gh` dropped |
| `stone` | `OWn` | silent *e* + magic *e* lengthening |
| `home` | `OWm` | near-rhyme with `stone`, not exact |
| `love` | `UHv` | irregular override |
| `above` | `UHv` | same family |
| `table` | `UHbl` | syllabic `-le` keeps the preceding consonant |
| `once` | `UHns` | soft `c` preserved before dropped *e* |
| `heart` | `AARt` | r-coloured override |

`slantRhyme(a, b)` is true when the vowel classes match and the tails differ by
at most one consonant. End-rhyme density counts only lines in families of two or
more.

### 7. Roots

Every content word of length ≥ 3 that is not a function word is looked up in
`LEXICON`. Misses are tested against suffix hints (`-tion` → Latinate, `-ness` →
Old English, `-ology` → Greek, …) and marked `inferred`.

The census reports counts, shares, coverage, a dominant family, and three
aggregates:

```js
latinate = (la + gr) / classified
germanic = (oe + on + ga) / classified
french   = fr / classified
```

### 8. Affinity

Twelve features are extracted:

| Feature | Scale | Weight | Meaning |
|---|---:|---:|---|
| `avgSyll` | 7 | 1.20 | syllables per line |
| `syllVar` | 4.5 | 0.45 | standard deviation of line length |
| `regularity` | 0.40 | 0.70 | mean foot consistency |
| `rhymeDensity` | 0.55 | 1.20 | share of lines in rhyme families |
| `enjambment` | 0.50 | 0.50 | run-on lines |
| `caesura` | 0.50 | 0.45 | mid-line pauses |
| `alliteration` | 1.00 | 0.40 | pairings per line |
| `repetition` | 0.80 | 0.90 | anaphora / repeated openings |
| `latinate` | 0.30 | 0.85 | Latin + Greek share |
| `germanic` | 0.30 | 0.85 | OE + ON + GA share |
| `mono` | 0.30 | 0.50 | monosyllables among content words |
| `punct` | 1.50 | 0.25 | punctuation marks per line |

For each voice:

```text
d_i      = |value_i − target_i| / scale_i
distance = sqrt( Σ(weight_i · d_i²) / Σ(weight_i) )
score    = round(100 · e^(−1.35 · distance))
```

The two features with the smallest weighted distance become the explanation
lines. Scores are sorted descending; the top voice is the “closest ear”.

This is deliberately transparent. Every number in the read-out can be traced
back to a line and a rule.

### 9. Notices

`diagnostics()` adds at most four short observations: very long lines, metrical
monotony, no caesura, near-rhymes, heavy repetition, very Latinate diction, low
root coverage. These are prompts, not corrections.

---

## Coach

`coachReply({ text, analysis, lens, history })` is a deterministic dispatcher.
It returns `{ text, chips }`, where `text` is markdown.

Order of matching:

1. `rhyme with X` / `rhyme for X` → sound-family suggestions.
2. `line N` → line report with scansion and experiments.
3. influence / echo / “who do I sound like”.
4. roots / etymology / ancient / diction.
5. rhyme / rhyming.
6. scan / meter / rhythm / stress / beat / syllable.
7. read aloud / perform / breath / voice.
8. title.
9. tighten / shorten / cut / wordy.
10. exercise / prompt / stuck / idea.
11. critique / feedback / improve / revise / thoughts.
12. greeting.
13. help / commands.
14. lens-only fallback.
15. general fallback: three observations and a question.

Every specific report quotes the draft and uses real counts. `history` is used
only to vary one exercise choice, so replies are stable but not identical.

### Optional live model

`llmReply()` posts to `${base}/chat/completions`. The system prompt contains:

- the coach persona and constraints;
- the draft (up to 6,000 chars);
- a compact JSON reading (lines, syllables, foot, rhyme, roots, echoes, flags);
- the active lens;
- rules: evidence not gospel, quote the user, change at most two lines, no
  invented quotations, no copyrighted reproduction.

The last 10 messages are sent as conversation history. Failures fall back to the
offline coach with a visible note. The API key never leaves the browser except
to the endpoint the user configured.

---

## State and persistence

`app.js` holds one `state` object:

```js
{
  view, tab, lens, draft, analysis, chat, settings,
  rootFilter, rootQuery, busy
}
```

Persisted keys:

| Key | Contents |
|---|---|
| `fv.draft` | current draft text |
| `fv.chat` | array of `{ role, text, chips }` |
| `fv.lens` | active voice id or `null` |
| `fv.settings` | `{ useLive, base, model, key }` |

All storage access is wrapped in `try/catch` so private mode and quota errors
degrade gracefully.

---

## Server

`server.mjs` is ~50 lines:

- maps `/` to `index.html`;
- resolves the request path and rejects anything outside the project root
  (`resolve` + `startsWith(root + sep)`);
- serves a small MIME table;
- sends `Cache-Control: no-cache` so edits are visible on reload;
- listens on `PORT` or `4173`.

No directory listing, no range requests, no compression, no TLS. It is a
development server for a local app.

---

## Rendering

- All views are in `index.html`; only one has `.is-active` at a time.
- `renderVoices`, `renderRoots`, `renderReadout` and `renderChat` rebuild their
  subtrees with template strings. There is no virtual DOM.
- User and draft content is escaped through `esc()` before interpolation.
- Coach markdown is rendered by a deliberately small renderer: fenced code,
  paragraphs, bullet and numbered lists, bold, italic, inline code. It escapes
  first, then applies markup.
- Event handling is mostly delegated at stable containers (`#voiceGrid`,
  `#readoutBody`, `#voiceDrawer`, `#chips`), which keeps re-renders cheap.

---

## Why no framework

The whole state is one draft plus one conversation. A framework would add a
build step, a dependency tree and a hydration model for no benefit. Plain
modules keep the project inspectable: every behaviour is a function you can read
in one sitting.

---

## Related documents

- [`VOICES.md`](VOICES.md) — the four poets and their profiles.
- [`EXTENDING.md`](EXTENDING.md) — add a voice, words, intents or tabs.
- [`DESIGN.md`](DESIGN.md) — visual system and layout.
- [`BUILD-NOTES.md`](BUILD-NOTES.md) — decisions and bugs found while building.
