// The workshop coach. Deterministic, draft-aware, and deliberately opinionated.
// If a live model is configured in the UI, this module is bypassed for chat,
// but its analysis is still fed to the model as evidence.
import { VOICE_BY_ID, VOICES } from "../data/poets.js";
import { lookup, LANGS } from "../data/roots.js";
import { rhymeFamily, rhymeVowel, RHYME_WORDS, cleanWord, isFunctionWord } from "./phonetics.js";

const firstName = (voice) => voice.name.split(" ")[0];

const pct = (x) => `${Math.round(x * 100)}%`;
const one = (x) => x.toFixed(1);

function scanBlock(a, limit = 10) {
  return a.lines
    .filter((l) => l.words.length)
    .slice(0, limit)
    .map(
      (l) =>
        `${String(l.number).padStart(2)}  ${l.patternStr.padEnd(24)} ${String(
          l.syllables
        ).padStart(2)} syll  ${String(l.beats).padStart(1)} beats  ${l.foot}`
    )
    .join("\n");
}

function quote(line) {
  return `*"${line.text.trim()}"*`;
}

function rootLines(a, max = 5) {
  const buckets = Object.entries(a.roots.wordsByLang)
    .sort((x, y) => y[1].length - x[1].length)
    .slice(0, 3);
  const out = [];
  for (const [lang, words] of buckets) {
    const meta = LANGS[lang];
    const sample = words.slice(0, 3).map((w) => `**${w.word}** (${w.root})`);
    out.push(`- **${meta.label}** ${pct(a.roots.shares[lang] || 0)} — ${sample.join(", ")}`);
  }
  return out.join("\n");
}

function topEcho(a) {
  return a.echoes[0] || { id: "heaney", name: "Seamus Heaney", score: 0, reasons: [] };
}

function lensVoice(lens) {
  return lens && VOICE_BY_ID[lens] ? VOICE_BY_ID[lens] : null;
}

function suggestRhymes(word, limit = 7) {
  const w = cleanWord(word);
  if (!w) return [];
  const exact = rhymeFamily(w);
  if (exact.length) return exact.slice(0, limit);
  const vowel = rhymeVowel(w);
  return RHYME_WORDS.filter((x) => rhymeVowel(x) === vowel && x !== w)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Individual reports
// ---------------------------------------------------------------------------

function scanReport(a) {
  const feet = a.features ? one(a.features.regularity) : "0";
  const loose = a.lines
    .filter((l) => l.words.length && l.regularity < 0.5)
    .slice(0, 2);

  let out = `**The scan** — ${a.totals.lines} lines, ${a.totals.words} words, ${one(
    a.totals.avgSyllables
  )} syllables a line.\n\n`;
  out += "```\n" + scanBlock(a) + "\n```\n\n";
  out += `The beat holds together about **${Math.round(
    a.features.regularity * 100
  )}%** of the time. `;
  if (a.features.regularity > 0.65) {
    out += "That is metrically confident — you can afford one deliberate break.";
  } else if (a.features.regularity > 0.45) {
    out += "Loose, accentual, more drum than metronome. That is a legitimate music.";
  } else {
    out += "The stress is scattered. If you want a pulse, pick a beat count per line and keep it for four lines.";
  }

  if (loose.length) {
    out += `\n\nLine ${loose
      .map((l) => l.number)
      .join(" and ")} ${loose.length > 1 ? "are" : "is"} the loosest. Read ${
      loose.length > 1 ? "them" : "it"
    } aloud and tap: if the stumble is expressive, keep it; if it is accidental, even out one foot.`;
  }
  return out;
}

function rhymeReport(a) {
  const last = a.lines.filter((l) => l.lastWord).slice(-1)[0];
  const families = Object.entries(a.rhyme.families).filter(([, g]) => g.length >= 2);

  let out = `**Rhyme** — scheme \`${a.rhyme.scheme || "—"}\`, density ${pct(
    a.rhyme.density
  )}.\n\n`;

  if (!a.rhyme.density) {
    out +=
      "No end-rhyme yet. That is a choice, not a fault — Heaney and Gorman often work without it. If you want one, start with the line you care about most and rhyme *outward* from it, not toward it.";
  } else {
    out += families
      .map(([letter, group]) => {
        const words = group.map((l) => l.lastWord).join(" / ");
        return `- **${letter}** — ${words} *(lines ${group.map((l) => l.number).join(", ")})*`;
      })
      .join("\n");
  }

  if (a.rhyme.slants.length) {
    out += `\n\nNear-rhymes: ${a.rhyme.slants
      .slice(0, 3)
      .map((s) => `**${s.a}/${s.b}** (lines ${s.lines.join(" & ")})`)
      .join("; ")}. A slant is a door, not a mistake — just decide which one it is.`;
  }

  if (last) {
    const suggestions = suggestRhymes(last.lastWord);
    if (suggestions.length) {
      out += `\n\nIf you want a rhyme for **${last.lastWord}** (line ${last.number}): ${suggestions
        .map((s) => `*${s}*`)
        .join(", ")}.`;
    }
  }
  return out;
}

function rootsReport(a, lens) {
  const r = a.roots;
  let out = `**The root-hoard** — ${r.classified} classified content words, ${pct(
    r.coverage
  )} coverage.\n\n`;
  out += `${pct(r.germanic)} Germanic (Old English, Norse, Gaelic) · ${pct(
    r.latinate
  )} Latinate/Greek · ${pct(r.french)} Norman French.\n\n`;
  out += rootLines(a);

  if (r.dominant) {
    const meta = LANGS[r.dominant];
    out += `\n\nYour draft's centre of gravity is **${meta.label}**. ${meta.blurb}`;
  }
  if (lens) {
    out += `\n\n${firstName(lens)}'s habit: ${lens.roots.takeaway}`;
  } else if (r.latinate > 0.4) {
    out +=
      "\n\nThat is a civic, public register. If it starts to float, anchor one abstraction to a physical object.";
  } else if (r.germanic > 0.7) {
    out +=
      "\n\nThat is ground-level diction — short, physical, hard to fake. It will carry weight if the images are precise.";
  }
  if (r.unclassified > r.classified) {
    out +=
      "\n\nMany words sit outside the hoard, so treat the percentages as a sketch rather than a verdict.";
  }
  return out;
}

function echoReport(a) {
  const top = topEcho(a);
  const voice = VOICE_BY_ID[top.id];
  const bars = a.echoes
    .map((e) => `${VOICE_BY_ID[e.id].name.split(" ")[0]} ${e.score}`)
    .join(" · ");

  let out = `**Echoes** — ${bars}\n\n`;
  out += `Closest ear: **${voice.name}** (${top.score}/100). ${voice.epithet}\n\n`;
  if (top.reasons.length) {
    out += top.reasons.map((r) => `- ${r}`).join("\n");
  }
  out += `\n\nThat is a resemblance, not a verdict. You are allowed to sound like nobody.`;
  return out;
}

function strongestNote(a) {
  const s = a.strongest;
  if (!s) return "";
  const bits = [];
  if (s.alliteration.length) {
    bits.push(
      `alliteration: ${s.alliteration
        .slice(0, 2)
        .map(([x, y]) => `*${x} ${y}*`)
        .join(", ")}`
    );
  }
  if (s.assonance.length) {
    bits.push(`assonance on **${s.assonance[0].sound}** (${s.assonance[0].words.join(", ")})`);
  }
  if (s.caesura.present) bits.push("a mid-line pause");
  if (s.regularity > 0.65) bits.push(`${s.foot} footing`);
  return `Line ${s.number} is doing the most sonic work — ${bits.join("; ") || "clean, uncluttered movement"}.\n\n${quote(s)}`;
}

function critiqueReport(a, lens) {
  const features = a.features;
  const voice = lens || VOICE_BY_ID[topEcho(a).id];
  const weak = [...a.echoes].sort((x, y) => x.score - y.score)[0];
  const flags = a.flags;

  let out = `**What is already working.**\n\n${strongestNote(a)}\n\n`;

  out += `**What is carrying too much weight.**\n\n`;
  if (flags.length) {
    out += flags.slice(0, 2).map((f) => `- ${f.text}`).join("\n");
  } else {
    out += `- Nothing is breaking. That itself is a question: where is the risk? A draft this even may need one line that refuses to behave.`;
  }

  out += `\n\n**The read.** ${one(a.totals.avgSyllables)} syllables a line, ${pct(
    a.rhyme.density
  )} rhyme, ${pct(features.caesura)} of lines paused mid-way, ${pct(
    features.enjambment
  )} running past the break. `;
  out += `It is nearest **${voice.name}** in temperature and nearest **${
    VOICE_BY_ID[weak.id]?.name || weak.name
  }** in its avoidances.\n\n`;

  const practice = voice.practice[0];
  out += `**One experiment, through ${firstName(voice)}.** ${practice.text}\n\n`;
  out += `**A question to keep in your pocket.** ${
    voice.id === "heaney"
      ? "Which line can be replaced by an object?"
      : voice.id === "gorman"
      ? "Which line is the argument turning on — and does the break land there?"
      : voice.id === "dylan"
      ? "Which line is doing the work of the chorus?"
      : "Which line is pretending not to feel anything?"
  }`;
  return out;
}

function lineReport(a, number, lens) {
  const line = a.lines.find((l) => l.number === number);
  if (!line) {
    return `There is no line ${number} in the draft — it has ${a.totals.lines} lines.`;
  }

  const rhymesWith = a.lines.filter(
    (l) => l.number !== line.number && l.lastWord && l.rhymeKey === line.rhymeKey
  );

  let out = `**Line ${line.number}**\n\n${quote(line)}\n\n`;
  out += `\`${line.patternStr}\` — ${line.syllables} syllables, ${
    line.beats
  } beats, **${line.foot}**${line.caesura.present ? ", with a mid-line pause" : ""}.\n\n`;

  if (rhymesWith.length) {
    out += `It rhymes with line ${rhymesWith.map((l) => l.number).join(", ")} (**${line.lastWord}**).\n\n`;
  } else if (line.lastWord) {
    out += `It does not rhyme with anything yet (**${line.lastWord}**).\n\n`;
  }

  const experiments = [];
  if (line.beats >= 6) {
    experiments.push(
      "You have six or more beats. Find the one function word the line can live without — *the*, *that*, *of*, *and* — and cut it. If the line still stands, it was leaning."
    );
  }
  if (!line.caesura.present && line.syllables >= 10) {
    const content = line.words.filter((w) => !isFunctionWord(w));
    const mid =
      content[Math.floor(content.length / 2)] ||
      line.words[Math.floor(line.words.length / 2)];
    experiments.push(
      `No mid-line pause. Try a comma or dash after **${mid}** and hear whether the line gains a room.`
    );
  }
  if (lens) {
    experiments.push(`${firstName(lens)} would ask: ${lens.practice[0].text}`);
  }
  if (!experiments.length) {
    experiments.push(
      "The line is already compact. Change one word for a stranger, older synonym and see if the temperature drops."
    );
  }

  out += experiments.map((e) => `- ${e}`).join("\n");
  return out;
}

function exerciseReport(a, lens) {
  const voice = lens || VOICE_BY_ID[topEcho(a).id];
  const drills = [...voice.practice];
  const f = a.features;

  let targeted;
  if (f && f.caesura < 0.2) {
    targeted = {
      title: "The hinge",
      text: "Take four of your own lines and put a caesura in each one — a comma, a dash, a full stop — where the thought changes direction. Then remove the two that feel decorative.",
    };
  } else if (f && f.repetition < 0.2) {
    targeted = {
      title: "The return",
      text: "Choose one phrase from your draft and repeat it at the start of three lines, changing only what follows. Let the repetition do the arguing.",
    };
  } else if (f && f.rhymeDensity > 0.4) {
    targeted = {
      title: "Break the rhyme",
      text: "Take your most rhymed stanza and replace one rhyme with a flat, true sentence that does not rhyme. See whether the stanza gains authority.",
    };
  } else {
    targeted = {
      title: "The turn",
      text: "Rewrite the last two lines so the poem turns against itself. Not a summary — a refusal.",
    };
  }

  let out = `**Two exercises, through ${voice.name}.**\n\n`;
  out += drills
    .slice(0, 2)
    .map((p, i) => `${i + 1}. **${p.title}.** ${p.text}`)
    .join("\n\n");
  out += `\n\n**And one for this draft.** **${targeted.title}.** ${targeted.text}`;
  return out;
}

function performanceReport(a) {
  const lines = a.lines.filter((l) => l.words.length);
  const breathy = lines.filter((l) => l.syllables > 16);
  const pauses = lines.filter((l) => l.caesura.present);
  const enjambed = lines.filter((l) => l.enjambed);

  let out = `**Reading it aloud.**\n\n`;
  out += `- ${a.totals.lines} lines, ${one(
    a.totals.avgSyllables
  )} syllables a line. At a comfortable pace that is roughly ${Math.max(
    1,
    Math.round(a.totals.syllables / 220)
  )} minute${a.totals.syllables > 330 ? "s" : ""}.\n`;
  out += `- ${pauses.length} line${pauses.length === 1 ? "" : "s"} already contain a mid-line pause. Use them: breathe there, do not rush through.\n`;
  out += `- ${enjambed.length} line${enjambed.length === 1 ? "" : "s"} run past the break. Keep the voice moving across the gap; the line break is not always a breath.\n`;
  if (breathy.length) {
    out += `- Line${breathy.length > 1 ? "s" : ""} ${breathy
      .map((l) => l.number)
      .join(", ")} ${breathy.length > 1 ? "are" : "is"} long for one breath. Either mark a caesura or accept that the voice will fracture — sometimes that is the point.\n`;
  }
  out += `\nTry it once standing, once sitting, once almost too quietly. The poem will tell you which one it wants.`;
  return out;
}

function titleReport(a) {
  const s = a.strongest;
  if (!s) return "I need a few lines before I can suggest a title.";
  const content = s.words.filter((w) => w.length > 3).slice(0, 4);
  const w1 = content[0] || "Draft";
  const w2 = content[1] || "Weather";
  const w3 = content[2] || "Light";
  const options = [
    `The ${w1} of ${w2}`,
    `${w1}, ${w2}`,
    `Notes on ${w3}`,
    `A Small ${w1}`,
    `${w1} in ${w2}`,
  ];
  return `**Title possibilities** (all disposable):\n\n${options
    .map((o) => `- *${o}*`)
    .join("\n")}\n\nThe best title usually does one job the poem cannot do for itself — name the occasion, or turn the key in the lock at the end.`;
}

function tightenReport(a) {
  const active = a.lines.filter((l) => l.words.length);
  if (!active.length) return "Nothing to tighten yet.";
  const mean = a.totals.avgSyllables;
  const long = active.filter((l) => l.syllables > mean + 3).slice(0, 3);
  let out = `**Tightening.** Average line: ${one(mean)} syllables.\n\n`;
  if (!long.length) {
    out += "No line is wildly over the average. The draft is already compressed. The next move is probably a cut of a whole line, not a trim of words.";
    return out;
  }
  out += long
    .map(
      (l) =>
        `- Line ${l.number} (${l.syllables} syllables): ${quote(
          l
        )} — look for the one abstraction the poem can live without.`
    )
    .join("\n");
  out += `\n\nRead each line without its last three words. If the meaning survives, the words were scaffolding.`;
  return out;
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

const GREETINGS = /^(hi|hey|hello|yo|good (morning|evening|afternoon))\b/;
const HELP = /help|what can you|how do i use|commands|options/;

export function coachReply({ text = "", analysis, lens = null, history = [] }) {
  const a = analysis;
  const input = String(text || "").trim();
  const t = input.toLowerCase();
  const voice = lensVoice(lens);
  const variant = (history.length + (a?.text.length || 0)) % 2;

  if (!a || !a.features) {
    return {
      text:
        "I have no draft to read yet. Paste a few lines into the editor — or press **Sample** and I will start from there.\n\nIf you are staring at a blank page: write one line about a room you know, one line about the weather outside it, and one line that is a lie. Then ask me again.",
      chips: ["Give me an exercise", "What can you do?"],
    };
  }

  // rhyme with X
  const rhymeAsk = t.match(/rhyme (?:with|for) ["'\u201c]?([a-z'-]+)/);
  if (rhymeAsk) {
    const word = cleanWord(rhymeAsk[1]);
    const suggestions = suggestRhymes(word, 10);
    if (!suggestions.length) {
      return {
        text: `I do not have a good family for **${word}** in the hoard. Try a slant: keep the vowel, change one consonant at the end. *${word}* / *${word.slice(0, -1)}* is a start.`,
        chips: ["Scan my meter", "Who do I sound like?"],
      };
    }
    return {
      text: `Rhymes for **${word}** (approximate sound families):\n\n${suggestions
        .map((s) => `- ${s}`)
        .join("\n")}\n\nPick the one that is *least* clever. In a poem, an obvious rhyme is often the honest one.`,
      chips: [`Analyse line ${a.lines[a.lines.length - 1]?.number || 1}`, "Tighten this"],
    };
  }

  // line N
  const lineAsk = t.match(/line\s+(\d+)/);
  if (lineAsk) {
    const n = Number(lineAsk[1]);
    return {
      text: lineReport(a, n, voice),
      chips: ["Scan my meter", "Find my roots", "Give me an exercise"],
    };
  }

  if (/who do i sound like|who does this sound like|influence|echo|which poet/.test(t)) {
    return {
      text: echoReport(a),
      chips: ["Open the closest voice", "Scan my meter", "Critique this"],
    };
  }

  if (/root|etymolog|ancient|origin|language|diction|word-hoard/.test(t)) {
    return {
      text: rootsReport(a, voice),
      chips: ["Who do I sound like?", "Tighten this", "Give me an exercise"],
    };
  }

  if (/rhyme|rhym/.test(t)) {
    return {
      text: rhymeReport(a),
      chips: ["Scan my meter", "Critique this", "Give me an exercise"],
    };
  }

  if (/scan|meter|metre|rhythm|stress|beat|syllab|metrical/.test(t)) {
    return {
      text: scanReport(a),
      chips: ["Read it aloud", "Tighten this", "Critique this"],
    };
  }

  if (/read aloud|perform|breath|voice|deliver|stage/.test(t)) {
    return {
      text: performanceReport(a),
      chips: ["Scan my meter", "Critique this", "Give me an exercise"],
    };
  }

  if (/title/.test(t)) {
    return {
      text: titleReport(a),
      chips: ["Critique this", "Who do I sound like?"],
    };
  }

  if (/tighten|shorten|trim|cut|long line|too long|wordy/.test(t)) {
    return {
      text: tightenReport(a),
      chips: ["Scan my meter", "Give me an exercise", "Critique this"],
    };
  }

  if (/exercise|prompt|stuck|block|start|idea|drill|practice/.test(t)) {
    return {
      text: exerciseReport(a, voice),
      chips: ["Scan my meter", "Find my roots", "Critique this"],
    };
  }

  if (/critique|feedback|review|improve|revise|thoughts|how is|what do you think|workshop|better/.test(t)) {
    return {
      text: critiqueReport(a, voice),
      chips: ["Analyse line 1", "Tighten this", "Who do I sound like?"],
    };
  }

  if (GREETINGS.test(t)) {
    return {
      text: `Hello. I am reading **${a.totals.lines} line${
        a.totals.lines === 1 ? "" : "s"
      }** — ${one(a.totals.avgSyllables)} syllables a line, nearest **${
        topEcho(a).name
      }** in temperature.\n\nI can scan the meter, map the rhymes, dig into the roots of your words, or tell you who you are echoing. Or just ask me to be blunt.`,
      chips: ["Critique this", "Scan my meter", "Find my roots"],
    };
  }

  if (HELP.test(t)) {
    return {
      text:
        "Four ways in:\n\n- **Scan** — beats, syllables, feet, caesurae, line by line.\n- **Sound** — rhyme scheme, alliteration, assonance, repetition.\n- **Roots** — which older languages your diction is made of.\n- **Echoes** — which of the four voices you are closest to, and why.\n\nThen ask for a **critique**, an **exercise**, a **line reading** (*analyse line 3*), a **rhyme** (*rhyme with stone*), or a **title**. Set a lens (Heaney, Gorman, Dylan, Bilston) to have the advice come through that poet's ear.",
      chips: ["Critique this", "Who do I sound like?", "Give me an exercise"],
    };
  }

  // Lens-specific free text
  if (voice) {
    return {
      text: `Reading this through **${voice.name}**: ${voice.rhythm.summary}\n\nYour draft averages ${one(
        a.totals.avgSyllables
      )} syllables a line; ${firstName(voice)} sits around ${one(
        voice.profile.avgSyll
      )}. ${voice.rhythm.hear}\n\n**One move.** ${voice.practice[variant].text}`,
      chips: ["Critique this", "Scan my meter", "Find my roots"],
    };
  }

  // Fallback: three real observations plus a question.
  const s = a.strongest;
  const flags = a.flags.length ? a.flags[0].text : "No obvious structural fault — which means the next gain is imaginative, not technical.";
  return {
    text: `Here is what I notice first.\n\n- **Line ${s ? s.number : 1}** carries the most sound: ${
      s ? quote(s) : "the draft is still short."
    }\n- **${one(a.totals.avgSyllables)} syllables a line**, ${pct(
      a.rhyme.density
    )} rhyme, and an echo of **${topEcho(a).name}**.\n- ${flags}\n\n**A question.** ${
      a.rhyme.density > 0.3
        ? "Which rhyme is doing real work, and which one is just closing a door?"
        : "Where does the poem turn? Mark that line and make the break happen there."
    }\n\nAsk me to *scan it*, *critique it*, *find the roots*, or *set a lens* and I will go deeper.`,
    chips: ["Critique this", "Scan my meter", "Find my roots", "Who do I sound like?"],
  };
}

export const COACH_CHIPS = [
  "Critique this",
  "Scan my meter",
  "Find my roots",
  "Who do I sound like?",
  "Read it aloud",
  "Tighten this",
  "Give me an exercise",
];
