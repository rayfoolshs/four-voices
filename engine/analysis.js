// The reading engine: scansion, sound, roots, and voice affinity.
import { VOICES } from "../data/poets.js";
import { LANGS, lookup } from "../data/roots.js";
import {
  syllableCount,
  stressPattern,
  rhymeKey,
  rhymeVowel,
  slantRhyme,
  isFunctionWord,
  cleanWord,
} from "./phonetics.js";

const FOOT_NAMES = {
  "01": { noun: "iamb", adj: "iambic" },
  "10": { noun: "trochee", adj: "trochaic" },
  "11": { noun: "spondee", adj: "spondaic" },
  "00": { noun: "pyrrhic", adj: "pyrrhic" },
  "001": { noun: "anapest", adj: "anapestic" },
  "100": { noun: "dactyl", adj: "dactylic" },
  "010": { noun: "amphibrach", adj: "amphibrachic" },
  "000": { noun: "tribrach", adj: "tribrachic" },
  "111": { noun: "molossus", adj: "molossic" },
};

const TERMINAL_HARD = /[.!?\u2026]["'\u201d\u2019)\]]*$/;
const TERMINAL_SOFT = /[,;:\u2014\u2013]["'\u201d\u2019)\]]*$/;
const MID_PAUSE = /[,;:\u2014\u2013]|\.(?=\s+\S)/;

export function patternToString(pattern) {
  return pattern.map((s) => (s ? "/" : "\u00b7")).join("");
}

function tokenise(line) {
  const raw = String(line || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'");
  return (raw.match(/[a-z][a-z'-]*/g) || []).map(cleanWord).filter(Boolean);
}

function scanPattern(pattern) {
  const n = pattern.length;
  if (!n) return { foot: "empty", feet: 0, regularity: 0, grouping: "-", groups: [] };
  if (n === 1) {
    return {
      foot: pattern[0] ? "monosyllabic" : "unstressed",
      feet: 1,
      regularity: 1,
      grouping: "single",
      groups: [String(pattern[0])],
    };
  }

  const build = (size) => {
    const groups = [];
    for (let i = 0; i + size <= n; i += size) groups.push(pattern.slice(i, i + size).join(""));
    const counts = {};
    for (const g of groups) counts[g] = (counts[g] || 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = sorted[0] || ["", 0];
    const coverage = (groups.length * size) / n;
    return {
      groups,
      share: top[1] / (groups.length || 1),
      top: top[0],
      coverage,
    };
  };

  const duple = build(2);
  const triple = build(3);
  const dupleScore = duple.share * duple.coverage;
  const tripleScore = triple.share * triple.coverage;
  const useTriple = tripleScore > dupleScore + 0.06;

  const chosen = useTriple ? triple : duple;
  const info = FOOT_NAMES[chosen.top] || {
    noun: chosen.top ? "irregular" : "unscanned",
    adj: chosen.top ? "irregular" : "unscanned",
  };
  const confident = chosen.share >= 0.52;

  return {
    foot: confident ? info.adj : "mixed",
    footNoun: confident ? info.noun : "mixed",
    feet: chosen.groups.length,
    regularity: Math.min(1, chosen.share),
    grouping: useTriple ? "triple" : "duple",
    groups: chosen.groups,
  };
}

function findCaesura(raw) {
  const match = raw.match(MID_PAUSE);
  if (!match) return { present: false, at: -1, mark: "" };
  const at = match.index;
  const before = raw.slice(0, at).trim();
  const words = tokenise(before).length;
  return { present: true, at, words, mark: match[0] };
}

function alliterationRuns(words) {
  const content = words.filter((w) => !isFunctionWord(w));
  const runs = [];
  for (let i = 0; i < content.length - 1; i++) {
    const a = content[i];
    const b = content[i + 1];
    if (a === b) continue;
    const ca = a.replace(/^ph/, "f")[0];
    const cb = b.replace(/^ph/, "f")[0];
    if (!ca || !cb) continue;
    if (!/[bcdfghjklmnpqrstvwxz]/.test(ca)) continue;
    if (ca === cb) runs.push([a, b]);
  }
  return runs;
}

function assonanceGroups(words) {
  const groups = {};
  for (const w of words) {
    if (isFunctionWord(w) || w.length < 2) continue;
    const v = rhymeVowel(w);
    if (!v) continue;
    (groups[v] ||= []).push(w);
  }
  return Object.entries(groups)
    .filter(([, ws]) => new Set(ws).size >= 3)
    .map(([sound, ws]) => ({ sound, words: [...new Set(ws)] }));
}

function analyseLine(raw, index, stanza) {
  const words = tokenise(raw);
  const pattern = words.flatMap((w) => stressPattern(w));
  const scan = scanPattern(pattern);
  const lastWord = words[words.length - 1] || "";
  const caesura = findCaesura(raw);
  const hardStop = TERMINAL_HARD.test(raw.trim());
  const softStop = !hardStop && TERMINAL_SOFT.test(raw.trim());

  return {
    index,
    number: index + 1,
    stanza,
    text: raw,
    words,
    syllables: pattern.length,
    pattern,
    patternStr: patternToString(pattern),
    foot: scan.foot,
    footNoun: scan.footNoun || scan.foot,
    feet: scan.feet,
    beats: pattern.reduce((a, b) => a + b, 0),
    regularity: scan.regularity,
    lastWord,
    rhymeKey: lastWord ? rhymeKey(lastWord) : "",
    hardStop,
    softStop,
    enjambed: !hardStop && !softStop,
    caesura,
    alliteration: alliterationRuns(words),
    assonance: assonanceGroups(words),
  };
}

function stddev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function buildRhyme(lines) {
  const labels = {};
  let code = 65;
  const schemeLines = [];
  const families = {};

  for (const line of lines) {
    if (!line.lastWord) {
      schemeLines.push("\u00b7");
      continue;
    }
    const key = line.rhymeKey;
    if (!labels[key]) {
      labels[key] = String.fromCharCode(code++);
      families[labels[key]] = [];
    }
    const letter = labels[key];
    line.rhymeLetter = letter;
    families[letter].push(line);
    schemeLines.push(letter);
  }

  const scheme = schemeLines.join("");
  const rhymedLines = lines.filter((l) => l.lastWord);
  const actualGroups = Object.entries(families).filter(([, group]) => group.length >= 2);
  const rhymeDensity = rhymedLines.length
    ? actualGroups.reduce((n, [, group]) => n + group.length, 0) / rhymedLines.length
    : 0;

  // Slant pairs: same vowel, near-miss tail.
  const slants = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      if (!lines[i].lastWord || !lines[j].lastWord) continue;
      if (lines[i].rhymeKey === lines[j].rhymeKey) continue;
      if (slantRhyme(lines[i].lastWord, lines[j].lastWord)) {
        slants.push({
          a: lines[i].lastWord,
          b: lines[j].lastWord,
          lines: [lines[i].number, lines[j].number],
        });
      }
    }
  }

  return { scheme, families, density: rhymeDensity, slants };
}

function buildSound(lines) {
  const active = lines.filter((l) => l.words.length);
  const n = active.length || 1;
  const alliteration = active.flatMap((l) =>
    l.alliteration.map(([a, b]) => ({ line: l.number, pair: [a, b] }))
  );
  const assonance = active.flatMap((l) =>
    l.assonance.map((g) => ({ line: l.number, ...g }))
  );

  // Anaphora: same opening word on consecutive lines.
  const anaphora = [];
  for (let i = 1; i < active.length; i++) {
    const prev = active[i - 1];
    const cur = active[i];
    if (prev.words[0] && prev.words[0] === cur.words[0]) {
      const run = anaphora[anaphora.length - 1];
      if (run && run.end === prev.number) {
        run.end = cur.number;
        run.count++;
      } else {
        anaphora.push({ word: cur.words[0], start: prev.number, end: cur.number, count: 2 });
      }
    }
  }

  // Epistrophe: repeated line-endings.
  const epistrophe = [];
  for (let i = 1; i < active.length; i++) {
    if (active[i - 1].lastWord && active[i - 1].lastWord === active[i].lastWord) {
      epistrophe.push({ word: active[i].lastWord, lines: [active[i - 1].number, active[i].number] });
    }
  }

  const repeatedStarts = anaphora.reduce((n, a) => n + a.count, 0);
  return {
    alliteration,
    alliterationDensity: alliteration.length / n,
    assonance,
    anaphora,
    epistrophe,
    repetition: Math.min(1.4, repeatedStarts / n),
    enjambmentRate:
      active.reduce((n, l) => n + (l.enjambed ? 1 : l.softStop ? 0.5 : 0), 0) / n,
    caesuraRate: active.filter((l) => l.caesura.present).length / n,
  };
}

function buildRoots(lines) {
  const counts = {};
  const wordsByLang = {};
  let total = 0;

  for (const line of lines) {
    for (const word of line.words) {
      if (isFunctionWord(word) || word.length < 3) continue;
      const entry = lookup(word);
      total++;
      if (!entry) continue;
      counts[entry.lang] = (counts[entry.lang] || 0) + 1;
      const bucket = (wordsByLang[entry.lang] ||= []);
      const existing = bucket.find((b) => b.word === word);
      if (existing) {
        existing.count++;
      } else {
        bucket.push({ ...entry, count: 1 });
      }
    }
  }

  const classified = Object.values(counts).reduce((a, b) => a + b, 0);
  const shares = {};
  for (const [lang, count] of Object.entries(counts)) {
    shares[lang] = classified ? count / classified : 0;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0] ? sorted[0][0] : null;

  const sum = (...ids) => ids.reduce((n, id) => n + (counts[id] || 0), 0);

  return {
    counts,
    shares,
    total,
    classified,
    unclassified: total - classified,
    coverage: total ? classified / total : 0,
    dominant,
    latinate: classified ? sum("la", "gr") / classified : 0,
    germanic: classified ? sum("oe", "on", "ga") / classified : 0,
    french: classified ? (counts.fr || 0) / classified : 0,
    wordsByLang,
  };
}

function buildFeatures(lines, sound, rhyme, roots) {
  const active = lines.filter((l) => l.words.length);
  if (!active.length) return null;
  const sylls = active.map((l) => l.syllables);
  const content = active.flatMap((l) => l.words).filter((w) => !isFunctionWord(w));
  const punctuation = active.reduce(
    (n, l) => n + (l.text.match(/[.,!?;:\u2014\u2013]/g) || []).length,
    0
  );

  return {
    avgSyll: sylls.reduce((a, b) => a + b, 0) / active.length,
    syllVar: stddev(sylls),
    regularity: active.reduce((a, l) => a + l.regularity, 0) / active.length,
    rhymeDensity: rhyme.density,
    enjambment: sound.enjambmentRate,
    caesura: sound.caesuraRate,
    alliteration: sound.alliterationDensity,
    repetition: sound.repetition,
    latinate: roots.latinate,
    germanic: roots.germanic,
    mono: content.length
      ? content.filter((w) => syllableCount(w) === 1).length / content.length
      : 0,
    punct: punctuation / active.length,
  };
}

const FEATURES = [
  { key: "avgSyll", scale: 7, weight: 1.2, target: true },
  { key: "syllVar", scale: 4.5, weight: 0.45 },
  { key: "regularity", scale: 0.4, weight: 0.7 },
  { key: "rhymeDensity", scale: 0.55, weight: 1.2 },
  { key: "enjambment", scale: 0.5, weight: 0.5 },
  { key: "caesura", scale: 0.5, weight: 0.45 },
  { key: "alliteration", scale: 1.0, weight: 0.4 },
  { key: "repetition", scale: 0.8, weight: 0.9 },
  { key: "latinate", scale: 0.3, weight: 0.85 },
  { key: "germanic", scale: 0.3, weight: 0.85 },
  { key: "mono", scale: 0.3, weight: 0.5 },
  { key: "punct", scale: 1.5, weight: 0.25 },
];

function reasonFor(voice, feature, value) {
  const target = voice.profile[feature.key];
  const firstName = voice.name.split(" ")[0];
  const fmt = (x) =>
    feature.key === "avgSyll" || feature.key === "punct"
      ? x.toFixed(1)
      : `${Math.round(x * 100)}%`;
  switch (feature.key) {
    case "avgSyll":
      return `${fmt(value)} syllables a line, against ${fmt(target)} for ${firstName}`;
    case "rhymeDensity":
      return value > 0.25
        ? `${fmt(value)} of your lines rhyme — close to ${firstName}'s ${fmt(target)}`
        : `open, unrhymed lines — nearer ${firstName} than the rhymers`;
    case "repetition":
      return value > 0.35
        ? `repetition carries ${fmt(value)} of the draft — ${firstName}'s anaphora habit`
        : `little repeated syntax — ${firstName} leans on it more`;
    case "latinate":
      return `${fmt(value)} Latinate/Greek diction, against ${fmt(target)} for ${firstName}`;
    case "germanic":
      return `${fmt(value)} Germanic root-words — ${firstName}'s ground`
    case "regularity":
      return `the beat holds together ${fmt(value)} of the time`;
    case "caesura":
      return `${fmt(value)} of lines pause mid-way`;
    case "alliteration":
      return `${value.toFixed(1)} alliterative pairings per line`;
    case "enjambment":
      return `${fmt(value)} of lines run past the break`;
    case "mono":
      return `${fmt(value)} monosyllables among the content words`;
    case "punct":
      return `${fmt(value)} marks of punctuation per line`;
    default:
      return "";
  }
}

function buildEchoes(features) {
  if (!features) return VOICES.map((v) => ({ id: v.id, name: v.name, score: 0, reasons: [] }));
  return VOICES.map((voice) => {
    let weighted = 0;
    let totalWeight = 0;
    const distances = [];
    for (const feature of FEATURES) {
      const value = features[feature.key];
      const target = voice.profile[feature.key];
      const d = Math.abs(value - target) / feature.scale;
      weighted += feature.weight * d * d;
      totalWeight += feature.weight;
      distances.push({ ...feature, value, target, d });
    }
    const distance = Math.sqrt(weighted / totalWeight);
    const score = Math.round(100 * Math.exp(-1.35 * distance));
    const closest = distances
      .sort((a, b) => a.weight * a.d - b.weight * b.d)
      .slice(0, 2);
    return {
      id: voice.id,
      name: voice.name,
      score,
      reasons: closest.map((f) => reasonFor(voice, f, f.value)),
    };
  }).sort((a, b) => b.score - a.score);
}

function diagnostics(lines, sound, rhyme, features, roots) {
  const flags = [];
  const active = lines.filter((l) => l.words.length);
  if (!active.length) return flags;

  const veryLong = active.filter((l) => l.syllables > 22);
  if (veryLong.length) {
    flags.push({
      tone: "warn",
      text: `${veryLong.length} line${veryLong.length > 1 ? "s" : ""} run past 22 syllables. Check whether the breath can carry them.`,
    });
  }

  if (features.syllVar < 0.8 && active.length > 3) {
    flags.push({
      tone: "note",
      text: "Every line is nearly the same length. That can be a spell — or a rut. Break one deliberately.",
    });
  }

  if (features.caesura < 0.15 && active.length > 3) {
    flags.push({
      tone: "note",
      text: "Almost no mid-line pauses. A caesura would let the reader stand inside the line.",
    });
  }

  if (features.rhymeDensity > 0.3 && rhyme.slants.length) {
    flags.push({
      tone: "note",
      text: `${rhyme.slants.length} near-rhyme${rhyme.slants.length > 1 ? "s" : ""} (${rhyme.slants
        .slice(0, 2)
        .map((s) => `${s.a}/${s.b}`)
        .join(", ")}). Decide whether each is a mistake or a door.`,
    });
  }

  if (features.repetition > 0.7) {
    flags.push({
      tone: "note",
      text: "Heavy syntactic repetition. Strong as incantation; watch that it does not become a tic.",
    });
  }

  if (features.latinate > 0.42) {
    flags.push({
      tone: "note",
      text: "A very Latinate draft. If it feels airless, swap two abstractions for objects.",
    });
  }

  if (roots.coverage < 0.35) {
    flags.push({
      tone: "muted",
      text: "Many words are outside the root-hoard, so the etymology read-out is partial.",
    });
  }

  return flags.slice(0, 4);
}

function strongestLine(lines) {
  let best = null;
  let bestScore = -1;
  for (const line of lines) {
    if (!line.words.length) continue;
    let score = 0;
    score += Math.min(3, line.alliteration.length) * 1.3;
    score += Math.min(2, line.assonance.length) * 1.1;
    if (line.regularity > 0.65) score += 0.8;
    if (line.caesura.present) score += 0.5;
    if (line.syllables >= 6 && line.syllables <= 14) score += 0.4;
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  }
  return best;
}

export function analyzePoem(text) {
  const rawText = String(text || "").replace(/\r\n/g, "\n");
  const rawLines = rawText.split("\n");
  const lines = [];
  let stanza = 0;

  for (const raw of rawLines) {
    if (!raw.trim()) {
      if (lines.length && lines[lines.length - 1].text.trim()) stanza++;
      continue;
    }
    lines.push(analyseLine(raw, lines.length, stanza));
  }

  const active = lines.filter((l) => l.words.length);
  const rhyme = buildRhyme(lines);
  const sound = buildSound(lines);
  const roots = buildRoots(lines);
  const features = buildFeatures(lines, sound, rhyme, roots);
  const echoes = buildEchoes(features);

  const stanzas = [];
  for (const line of lines) {
    if (!stanzas[line.stanza]) stanzas[line.stanza] = [];
    stanzas[line.stanza].push(line);
  }

  const syllables = active.map((l) => l.syllables);
  const words = active.reduce((n, l) => n + l.words.length, 0);

  return {
    text: rawText,
    lines,
    activeLines: active.length,
    stanzaCount: stanzas.filter(Boolean).length,
    stanzaShapes: stanzas.filter(Boolean).map((s) => s.length),
    totals: {
      lines: active.length,
      words,
      syllables: syllables.reduce((a, b) => a + b, 0),
      avgSyllables: syllables.length
        ? syllables.reduce((a, b) => a + b, 0) / syllables.length
        : 0,
      syllableVar: stddev(syllables),
    },
    rhyme,
    sound,
    roots,
    features,
    echoes,
    flags: diagnostics(lines, sound, rhyme, features, roots),
    strongest: strongestLine(lines),
  };
}

export { FEATURES, FOOT_NAMES };
