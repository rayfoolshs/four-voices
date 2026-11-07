# Extending Four Voices

Everything is data-first. Most changes are a new object in `data/`, not a new
component.

After any change:

```bash
npm test
npm start
```

Then check the browser console for errors before trusting a visual change.

---

## 1. Add a fifth voice

### Step 1 — the data

Append an object to `VOICES` in `data/poets.js`. The shape is:

```js
{
  id: "cope",                       // URL-safe, unique
  name: "Wendy Cope",
  dates: "b. 1945",
  place: "Erith, Kent",
  epithet: "The joke with a stone in it.",
  accent: "#9cbfa8",                // any CSS colour
  initials: "WC",
  meterChips: ["iambic", "sonnet", "plain rhyme"],

  rhythm: {
    headline: "Strict form, rueful voice",
    summary: "Two or three sentences on how the line moves.",
    bullets: ["**Bold lead.** Explanation.", "..."],
    hear: "One instruction for reading it aloud.",
  },

  roots: {
    headline: "Short line",
    summary: "Two or three sentences on diction and root stock.",
    items: [
      { word: "kettle", lang: "oe", note: "Why this word matters." },
      // lang must exist in data/roots.js LANGS
    ],
    takeaway: "One sentence to carry into a draft.",
  },

  pastiche: {
    title: "Original title",
    lines: ["Original line one,", "original line two."],
    note: "Say clearly that this is original, in the manner of the poet.",
  },

  practice: [
    { title: "Exercise name", text: "One concrete instruction." },
    // four is the house style
  ],

  profile: {
    avgSyll: 10, syllVar: 2.5, regularity: 0.65,
    rhymeDensity: 0.55, enjambment: 0.4, caesura: 0.4,
    alliteration: 0.5, repetition: 0.2, latinate: 0.18,
    germanic: 0.7, mono: 0.6, punct: 0.6,
  },
}
```

All twelve profile keys are required. Missing keys produce `NaN` distances.

### Step 2 — UI touches

Nothing is hard-coded to four voices in the rendering path:

- `renderVoices()` maps `VOICES`;
- `renderLens()` maps `VOICES`;
- `openVoice()` looks up `VOICE_BY_ID`;
- `buildEchoes()` maps `VOICES`;
- the drawer index says “Voice N of 4” — update that string in `openVoice()` if
  you add a fifth.

Also add a hint to `VOICE_LANG_HINT` in `app.js` if the new poet leans on a root
language:

```js
const VOICE_LANG_HINT = {
  oe: "Heaney · Bilston",
  // ...
  la: "Gorman · the pulpit · Cope",
};
```

### Step 3 — the hero count

`index.html` has a decorative `<span class="hero-count">04</span>` and the
principles copy says “four”. Change both if the number changes.

### Step 4 — verify

```bash
npm test
```

The test *“each sample echoes its own voice first”* only covers the four built-in
samples. If you add a sample for the new voice, extend that test’s `expected`
array.

---

## 2. Add words to the root hoard

`data/roots.js`:

```js
// word: [languageId, rootForm, gloss, optionalNote]
export const LEXICON = {
  // ...
  threshold: ["oe", "þerscold", "threshold, doorsill"],
  window: ["on", "vindauga", "wind-eye"],
};
```

Rules:

- `languageId` must be a key of `LANGS` (`oe`, `on`, `ga`, `la`, `gr`, `fr`,
  `he`, `ar`).
- Lowercase the key. Lookup cleans punctuation and case, but the lexicon is
  matched literally after cleaning.
- Keep glosses short. They appear in the Roots view and in coach reports.
- Mark uncertainty in the note rather than inventing precision.

Counts in the Roots view update automatically from `Object.keys(LEXICON).length`
and the per-language count.

### Suffix inference

Words not in the hoard fall back to `SUFFIX_HINTS`:

```js
[/(tion|sion|ment|ance|ence|ity|ous|ate|ive|ary|ory|al|ic|ify|ize|ise)$/, "la", "Latinate ending"],
```

Add a hint only when it is broadly true. The UI marks inferred entries, but a bad
hint still distorts the census.

### Add a language

1. Add a `LANGS` entry with `label`, `short`, `color`, `years`, `blurb`.
2. Add vocabulary.
3. Add a filter chip automatically (the Roots view maps `LANGS`).
4. Update `VOICE_LANG_HINT` if relevant.
5. Check contrast: the colour is used for dots, bars and badges.

---

## 3. Add a coach intent

`engine/coach.js` is a dispatcher of regex branches. To add an intent:

### Step 1 — write a report function

```js
function imageryReport(a) {
  // Read from the analysis object; never re-parse the draft.
  const abstract = ...;
  return `**Imagery** — ...\n\n- ...`;
}
```

Return markdown. Keep it under ~200 words. Use the draft's real numbers and
quote at least one line when possible.

### Step 2 — add a branch

Place more specific patterns *above* general ones:

```js
if (/image|metaphor|figurative|concrete/.test(t)) {
  return {
    text: imageryReport(a),
    chips: ["Scan my meter", "Critique this"],
  };
}
```

Order matters: `rhyme with stone` must be matched before the general `rhyme`
branch; `line 3` before `critique`.

### Step 3 — localise the chips

Chips are labels sent back through `sendChat()`, so they must be phrases the
dispatcher understands. Reuse existing ones where possible.

### Step 4 — test it

Add a case to `tests/engine.test.mjs`:

```js
const reply = coachReply({ text: "talk about the imagery", analysis: a });
assert.match(reply.text, /Imagery/);
```

### Using the lens

`lensVoice(lens)` returns the active voice object or `null`. Add one line of
lens-specific advice rather than rewriting the whole report:

```js
if (lens) out += `\n\n${firstName(lens)} would ask: ${lens.practice[0].text}`;
```

---

## 4. Tune the affinity scoring

Two places:

- **Targets** — `profile` in each voice in `data/poets.js`.
- **Scales and weights** — `FEATURES` in `engine/analysis.js`.

```js
const FEATURES = [
  { key: "avgSyll", scale: 7, weight: 1.2 },
  { key: "rhymeDensity", scale: 0.55, weight: 1.2 },
  // ...
];
```

`scale` is the distance that counts as “one unit wrong”. `weight` is how much
that feature matters. A feature with a huge weight and a tight scale will dominate.

### Method

1. Change one target or weight.
2. Run `npm test`. The four samples must still top their own voice.
3. Run the app with a draft you know well. Does the closest ear still make sense?
4. If not, inspect the per-feature distances (temporarily log them in
   `buildEchoes`).

Avoid tuning until every sample scores 90+. The profiles are sketches; the
explanations matter more than the number.

---

## 5. Add a read-out tab

1. Add a button to `.segmented` in `index.html`:
   ```html
   <button class="seg" data-tab="form" role="tab">Form</button>
   ```
2. Update the CSS grid:
   ```css
   .segmented { grid-template-columns: repeat(5, 1fr); }
   ```
3. Add a renderer in `app.js` and route to it:
   ```js
   if (state.tab === "form") renderForm(a);
   else if (state.tab === "scan") ...
   ```
4. Reuse `.summary-row`, `.block-title`, `.scan-note` and `.device` for
   consistency.
5. Give empty states a sentence, not a shrug.

---

## 6. Change the look

All visual decisions are tokens at the top of `styles.css`:

```css
:root {
  --bg: #100e0c;
  --panel: #191510;
  --text: #f0e8db;
  --gold: #e0b45c;
  --serif: "Iowan Old Style", ...;
  --sans: ...;
  --mono: ...;
}
```

Guidelines:

- Keep one accent colour. The four voice colours are for identity, not chrome.
- Poems use `--serif`; machinery (counts, patterns, labels) uses `--mono`;
  controls use `--sans`.
- Test at 1440, 1024, 820 and 390 CSS pixels.
- Preserve `:focus-visible` and `prefers-reduced-motion`.

Full notes: [`DESIGN.md`](DESIGN.md).

---

## 7. Add a starter sample

`data/poets.js`:

```js
export const SAMPLES = [
  // ...
  {
    label: "Short label",        // shown on the pill
    text: `Line one.
Line two.`,
  },
];
```

Samples are loaded into the editor. They do not need to belong to a voice, but if
they do, extend the affinity test.

---

## 8. Extend the live-model prompt

The system prompt lives in `llmReply()` in `app.js`. Keep these invariants:

- the machine reading is evidence, not gospel;
- the draft is included, truncated to a sane length;
- the model may not invent quotations or reproduce copyrighted poems;
- one experiment at a time, two lines maximum for a rewrite.

If you add a new analysis field, add it to `analysisContext()` so the model can
see it.

---

## 9. Testing checklist

Before calling a change done:

- [ ] `npm test` passes.
- [ ] `node --check app.js` passes.
- [ ] No console errors on load, on Workshop, on Roots, on opening each drawer.
- [ ] Type in the editor; the read-out updates within ~200 ms.
- [ ] Send “scan my meter”, “find my roots”, “who do I sound like?”, “analyse
      line 2”, “rhyme with stone”.
- [ ] Switch every read-out tab with an empty draft and with a full draft.
- [ ] Set a lens, reload: the lens persists.
- [ ] Clear the draft, reload: the draft is empty, the app does not throw.
- [ ] Open Settings; save without a key and with live mode off.
- [ ] Keyboard: `Esc`, `⌘/Ctrl+Enter`, `1`–`4`.
- [ ] Resize to 390 px: panes stack, composer remains usable.
