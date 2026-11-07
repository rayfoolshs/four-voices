# Design Notes

The interface should feel like a reading room, not a dashboard: warm ink, paper
text, one gold line, and a lot of quiet.

---

## Principles

1. **The poem is the loudest thing on the page.** Chrome stays dark and thin;
   the draft is large, serif and unboxed.
2. **One accent.** Gold (`--gold`) marks attention: the active tab, a beat, a
   link, a coach's margin rule. The four voice colours are identities, not
   decoration.
3. **Two voices in the type.** Serif for poems, prose and names. Sans for
   controls and labels. Mono for counts, scansion, roots and code.
4. **Machinery should look like machinery.** The read-out is deliberately plain:
   tables, bars, patterns. It should not pretend to be a poem.
5. **Honesty in the microcopy.** “Approximate, and happy to be argued with.”
   The interface never claims more precision than the engine has.

---

## Palette

Defined in `:root` in `styles.css`.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#100e0c` | page ground |
| `--bg-2` | `#14110e` | workshop panes |
| `--panel` | `#191510` | cards, read-out |
| `--panel-2` | `#211b15` | user bubbles, raised fields |
| `--panel-3` | `#272017` | meter tracks, chips |
| `--line` | `#332b22` | strong borders |
| `--line-soft` | `#261f18` | dividers |
| `--text` | `#f0e8db` | primary text |
| `--muted` | `#a99b88` | prose, secondary |
| `--faint` | `#74695a` | labels, hints |
| `--dim` | `#4d453a` | disabled, fine print |
| `--gold` | `#e0b45c` | accent |
| `--gold-2` | `#f0cd88` | accent hover |

Voice accents:

| Voice | Colour |
|---|---|
| Heaney | `#c08a4a` — peat / turned earth |
| Gorman | `#e0b13c` — public gold |
| Dylan | `#7f9bb5` — steel / freight |
| Bilston | `#c06a5a` — brick / deadpan |

Root language colours live in `data/roots.js` and are used for bars, dots and
badges. They are deliberately desaturated so eight of them can sit together.

---

## Type

```css
--serif: "Iowan Old Style", "Palatino Linotype", Palatino,
         "Book Antiqua", "URW Palladio L", Georgia, serif;
--sans:  -apple-system, BlinkMacSystemFont, "Segoe UI", Inter,
         "Helvetica Neue", Arial, sans-serif;
--mono:  "SFMono-Regular", ui-monospace, "SF Mono", Menlo,
         Consolas, monospace;
```

No web fonts are loaded. The stack is chosen to feel bookish on macOS and
acceptable everywhere else.

### Scale

| Role | Size | Family |
|---|---|---|
| Hero | `clamp(40px, 6.6vw, 82px)` | serif, 1.02 line-height, −0.025em |
| Section title | `clamp(38px, 6vw, 70px)` | serif |
| Drawer name | `clamp(32px, 4vw, 46px)` | serif |
| Pane title | 20px | serif |
| Card name | `clamp(24px, 2.4vw, 32px)` | serif |
| Draft | `clamp(17px, 1.35vw, 20px)`, line-height 2 | serif |
| Body | 13–14.5px | sans or serif depending on context |
| Label | 9–11px, 0.14–0.22em tracking, uppercase | sans |
| Scansion | 10.5–12.5px, 0.13em tracking | mono |

The draft's line-height of `2` is intentional: it gives the eye room to hear the
line break.

---

## Layout

### Views

- **Voices** — hero + 2×2 card grid + three principles.
- **Workshop** — three columns on wide screens:
  `minmax(340px, 1.12fr) | minmax(300px, 0.9fr) | minmax(330px, 1fr)`.
  Each pane scrolls independently; the composer is pinned to the bottom of the
  coach pane.
- **Roots** — census strip, language cards, search/filter, result grid.
- **Method** — a single 72ch prose column.

### Breakpoints

| Width | Behaviour |
|---|---|
| > 1180px | three workshop panes side by side, full viewport height |
| ≤ 1180px | editor + read-out side by side; coach spans both columns below |
| ≤ 820px | single column everywhere; drawer pads in; voice grid 1-up |
| ≤ 520px | stats strip hidden; sample buttons and actions stack; results 1-up |

The workshop uses `100dvh` rather than `100vh` so mobile browser chrome does not
clip the composer.

### The drawer

`width: min(760px, 94vw)`, slides from the right, scrim behind. It is the only
place where a voice is allowed to become a full editorial spread.

### The settings dialog

`width: min(520px, 92vw)`, centred, one column. It is intentionally boring: keys
and a switch, no flourish.

---

## Components

### Voice card

- 1px border, 14px radius, a 2px accent bar on the left.
- Radial accent wash in the top-right corner.
- Lift by 3px on hover; the arrow slides 4px.
- The whole card is a button (`role="button"`, `tabindex="0"`), with keyboard
  activation for Enter/Space.

### Scansion row

```
 1   ·/··/··/··/   11s   4b   iambic
```

- Number in mono, dim.
- Pattern: `/` in gold, `·` in `#5c5346`. The contrast is the point: stress is
  visible at a glance without reading the counts.
- Foot label de-emphasised and italic when `mixed`.
- The whole row is a button; clicking asks the coach about that line.

### Bars

- Rhyme density, device frequency, root stock and affinity all use the same
  4–12px bar with a squared-off fill.
- Root stock is a single stacked bar, not a pie: shares are easier to compare on
  a line.
- Affinity uses each voice's accent colour, so the identity carries from card to
  bar.

### Chat

- Coach messages: no bubble, a 2px gold left rule, 13px text. This makes them
  read like margin notes.
- User messages: right-aligned, panel-2, asymmetric radius (13 / 13 / 3 / 13).
- Chips below the log, not inside messages, so the latest suggested next moves
  stay reachable.
- Typing indicator is three dots on a muted margin rule.

### Empty states

Always a sentence and a next move. Examples:

- “No draft yet. Paste a few lines into the editor, or load a sample.”
- “Nothing is breaking. Where is the risk?”
- “No rooted words yet. Write a few content words…”

---

## Motion

- View changes: 400ms fade + 8px rise.
- Drawer: 340ms slide with a custom cubic-bezier.
- Messages: 280ms fade + 5px rise.
- Hover lifts: 160–220ms.
- All of it is disabled under `prefers-reduced-motion: reduce`.

No parallax, no scroll-jacking, no spring physics. The app is a reading surface.

---

## Accessibility

- `:focus-visible` is a 2px gold outline with 2px offset.
- Every icon-only button has `aria-label`.
- The chat log is `aria-live="polite"`.
- The drawer and modal are `role="dialog"` with `aria-modal="true"`; `Esc`
  closes both, and body scroll is locked while open.
- Colour is never the only signal: active states also change border, background
  and text weight; root families carry names and abbreviations.
- Text contrast is high for body copy; `--faint` is reserved for labels and
  hints, not for essential instructions.
- The layout works with keyboard alone. `1`–`4` jump between views when focus is
  not in a field; `⌘/Ctrl + Enter` sends.

Known gaps:

- The drawer does not trap focus (it closes on `Esc`, but Tab can leave it).
- The scansion pattern is visual; the same information is available as counts
  and the coach's prose.
- There is no light theme.

---

## Microcopy

The voice is dry, literate and on the reader's side.

- “Approximate, and happy to be argued with.”
- “A slant is a door, not a mistake — decide which.”
- “Nothing is breaking. Where is the risk?”
- “Steal the rhythm, not the life.”
- “The ear wins.”

Avoid: “Unlock your inner poet”, “AI-powered creativity”, exclamation marks,
growth language, and anything that treats the draft as content.

---

## What not to add

- A second accent colour.
- A card grid inside a card.
- A modal for something that can be inline.
- A loading spinner for a synchronous calculation.
- A “generate poem” button. The workshop is for the user's words.
