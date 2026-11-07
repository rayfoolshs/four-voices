# Four Voices

A local-first poetry workshop that reads your draft through the rhythms and root
languages of **Seamus Heaney**, **Amanda Gorman**, **Bob Dylan** and
**Brian Bilston** — then talks with you about how to make it your own.

No build step. No framework. No account. No server-side anything.

```bash
npm start
# → http://localhost:4173
```

On macOS you can also double-click `start.command`.

---

## What it does

- **Scans your draft** line by line: syllables, beats, feet, regularity,
  caesurae and enjambment.
- **Maps the sound**: rhyme scheme, rhyme families, near-rhymes, alliteration,
  assonance, anaphora.
- **Digs the roots**: classifies your content words by the older language they
  came from — Old English, Old Norse, Irish, Latin, Greek, Norman French,
  Hebrew/Aramaic, Arabic.
- **Names your echoes**: scores your draft against four hand-built stylistic
  profiles and explains the two closest features for each.
- **Coaches you**: an offline, draft-aware coach answers questions about meter,
  rhyme, roots, line revisions, titles, performance and exercises. Optional
  live-model mode for free-form conversation.
- **Teaches the voices**: each poet has a drawer with a rhythm signature, a root
  language note, an original pastiche with live scansion, and four exercises.

---

## The four lenses

| Voice | Rhythm signature | Root weather | Practice |
|---|---|---|---|
| **Seamus Heaney** (1939–2013) | 4–5 stresses, monosyllables, caesura as tool-mark, hard alliteration | Old English ground, Old Norse weather, Irish mud | Dig one line; sound the consonants; replace abstractions with objects |
| **Amanda Gorman** (b. 1998) | Long breath-lines, anaphora, tricolon, public “we” | Latin civics, Greek form, scriptural cadence | Five “We have not…” sentences; tricolon drill; civic image |
| **Bob Dylan** (b. 1941) | Fourteener, rhymed couplets, internal rhyme, King James cadence | Hebrew scripture, Old English ballad, American vernacular | Headline to fourteener; list song; the refusal |
| **Brian Bilston** (contemporary) | Strict form, plain diction, deadpan, enjambment for the punchline | Old English consonants, Latin only for the joke | Appliance sonnet; villanelle of the group chat; end plain |

Each profile is a *reading aid*, not an imitation kit. The pastiches in the app
are original writing in the manner of each poet, not quotations.

---

## The interface

### Voices
Four cards. Open one for:

- the rhythm signature, with a live scan of an original pastiche;
- the root languages the poet leans on, with glossed examples;
- four practice prompts;
- two actions: **read my draft through this voice** (sets the coach lens) and
  **send the pastiche to my draft** (loads it for revision).

### Workshop
Three panes:

1. **Your draft** — a serif writing surface with line, syllable, beat and rhyme
   counts. Four starter samples.
2. **Read-out** — four tabs:
   - **Scan** — pattern per line (`/` beat, `·` slack), syllable count, beat
     count, foot label. Click any line to ask the coach about it.
   - **Sound** — scheme, rhyme families, devices, notices.
   - **Roots** — the draft’s root stock as a stacked bar and word list.
   - **Echoes** — affinity scores and the reasons behind them.
3. **Workshop coach** — a conversation that reads the actual draft. Set a lens
   (Heaney / Gorman / Dylan / Bilston) to have advice come through that ear.

### Roots
A searchable lexicon of **455 words across eight root languages**, with root
forms, glosses and usage notes. Also shows the current draft’s root census.

### Method
What the engine does, what it cannot do, and how your data is handled.

---

## Quick start

Requirements: **Node 18+** (only for the static server; the app itself is plain
HTML/CSS/JS).

```bash
cd /path/to/four-voices
npm start
```

Then open <http://localhost:4173>. To use a different port:

```bash
PORT=8080 npm start
```

You can also serve the folder with any static server, e.g.
`python3 -m http.server 4173`. Opening `index.html` directly with `file://` will
not work because the app uses ES modules.

### Tests

```bash
npm test
```

10 tests cover syllable counting, stress, rhyme families, etymology lookup,
analysis completeness, per-sample voice affinity, empty input, coach intents and
line quoting.

---

## Optional live model

The coach works fully offline. If you want free-form chat, open **Settings**
(the gear) and provide:

- an OpenAI-compatible **API base** (default `https://api.openai.com/v1`),
- a **model** name,
- an **API key**.

The key is stored in this browser’s `localStorage` only. When live mode is on,
the draft, the machine reading and the recent conversation are sent to that
endpoint. Nothing is sent anywhere otherwise.

The system prompt instructs the model to treat the machine reading as evidence,
quote the user’s own lines, change no more than two lines at a time, and never
invent quotations.

---

## Privacy

- No backend, no accounts, no analytics.
- Draft, chat, lens and settings live in `localStorage`:
  `fv.draft`, `fv.chat`, `fv.lens`, `fv.settings`.
- Clearing the draft in the UI removes it from the editor, but the last saved
  value may remain in storage until the next edit. To erase everything, clear
  site data for the origin.
- Live model mode is the only outbound network path, and it is opt-in.

---

## Project map

```text
.
├── index.html              # all views, drawer, settings dialog
├── styles.css              # design tokens + layout + responsive rules
├── app.js                  # state, rendering, chat, settings, persistence
├── server.mjs              # zero-dependency static server
├── start.command           # macOS double-click launcher
├── package.json            # type: module, start/test scripts
├── data/
│   ├── poets.js            # four voices, pastiches, profiles
│   └── roots.js            # language metadata + etymology lexicon
├── engine/
│   ├── phonetics.js        # syllables, stress, rhyme keys
│   ├── analysis.js         # scansion, sound, roots, affinity
│   └── coach.js            # draft-aware reply engine
├── tests/
│   └── engine.test.mjs     # node:test suite
└── docs/
    ├── ARCHITECTURE.md
    ├── VOICES.md
    ├── EXTENDING.md
    ├── DESIGN.md
    └── BUILD-NOTES.md
```

---

## Honest limits

- **Scansion is approximate.** Syllables and stress come from a working
  dictionary plus spelling rules. It is a second ear, not a substitute for
  yours. When the machine and your ear disagree, the ear wins.
- **Rhymes are sound families, not a pronouncing dictionary.** Silent *e*,
  magic *e*, syllabic *-le* and common irregulars are handled; dialect and
  stress-shift are not.
- **Etymology is a hand-built hoard.** 455 words, with suffix guesses for the
  rest. Glosses are simplified and sometimes contested.
- **Affinity is a similarity score, not a verdict.** It compares twelve
  measurable features to four hand-set targets.
- **The offline coach is deterministic.** It routes on intent and reads the
  analysis; it does not “think”. That is a feature for reproducibility and a
  limit for surprise.

---

## On imitation

The four poets are teachers here, not templates. Practising another poet’s
rhythm is old and honourable. Publishing a close imitation as your own voice is
neither. Steal the cadence; keep your own life.

The “pastiche” in each voice drawer is original writing in the manner of that
poet. No copyrighted poem is reproduced.

---

## Keyboard

| Keys | Action |
|---|---|
| `⌘/Ctrl + Enter` | Send a chat message |
| `Esc` | Close drawer or settings |
| `1`–`4` | Voices / Workshop / Roots / Method (when not typing) |

---

## Credits

Built with plain HTML, CSS and ES modules. The engine owes its taste to the
poets, living and dead, whose work taught it what to listen for. The mistakes
are the machine’s.
