// A deliberately small, dependency-free English phonetics engine.
// It is an approximation, not a dictionary: good enough to hear a draft,
// wrong often enough that you should always trust your own ear first.

const DICT = {
  // articles, prepositions, conjunctions, pronouns, auxiliaries (usually unstressed)
  a: "0", an: "0", the: "0", and: "0", or: "0", but: "0", nor: "0", so: "0",
  of: "0", in: "0", on: "0", at: "0", to: "0", for: "0", from: "0", with: "0",
  by: "0", as: "0", is: "0", was: "0", were: "0", are: "0", be: "0", been: "0",
  am: "0", do: "0", does: "0", did: "0", has: "0", have: "0", had: "0",
  my: "0", your: "0", his: "0", her: "0", its: "0", our: "0", their: "0",
  me: "0", him: "0", us: "0", them: "0", you: "0", he: "0", she: "0", we: "0",
  they: "0", it: "0", i: "1", this: "1", that: "0", these: "1", those: "1",
  than: "0", then: "1", there: "0", here: "1", when: "0", where: "0", while: "0",
  if: "0", because: "01", though: "1", although: "01", until: "01", unless: "01",
  not: "1", no: "1", yes: "1", all: "1", some: "1", any: "10", none: "1",
  can: "0", could: "1", would: "1", should: "1", will: "1", shall: "1", may: "1",
  might: "1", must: "1", just: "1", very: "10", too: "1", also: "10",

  // common polysyllables with settled stress
  into: "10", upon: "01", about: "01", above: "01", across: "01", after: "10",
  again: "01", against: "01", ago: "01", along: "01", among: "01", around: "01",
  away: "01", become: "01", before: "01", begin: "01", behind: "01", below: "01",
  beneath: "01", beside: "01", between: "01", beyond: "01", without: "01",
  within: "01", enough: "01", perhaps: "01", today: "01", tonight: "01",
  tomorrow: "010", alive: "01", alone: "01", afraid: "01", asleep: "01",
  awake: "01", forget: "01", forgive: "01", allow: "01", appear: "01",
  arrive: "01", attend: "01", attack: "01", collect: "01", compare: "01",
  complete: "01", concern: "01", confirm: "01", connect: "01", consider: "010",
  continue: "010", decide: "01", declare: "01", defend: "01", delay: "01",
  demand: "01", deny: "01", depend: "01", describe: "01", deserve: "01",
  destroy: "01", develop: "010", divide: "01", employ: "01", enjoy: "01",
  explain: "01", explore: "01", express: "01", extend: "01", imagine: "010",
  include: "01", increase: "01", indeed: "01", inform: "01", invite: "01",
  maintain: "01", mistake: "01", obtain: "01", occur: "01", oppose: "01",
  perform: "01", prefer: "01", prepare: "01", pretend: "01", prevent: "01",
  produce: "01", propose: "01", protect: "01", provide: "01", receive: "01",
  recall: "01", refer: "01", regard: "01", reject: "01", relate: "01",
  relax: "01", release: "01", remain: "01", remember: "010", remove: "01",
  repair: "01", repeat: "01", replace: "01", reply: "01", report: "01",
  request: "01", require: "010", resign: "01", resist: "01", respect: "01",
  respond: "01", return: "01", reveal: "01", succeed: "01", support: "01",
  suppose: "01", survive: "01", suspect: "01", toward: "01", create: "01",
  creates: "01", created: "010", creating: "010",

  // nouns, adjectives, adverbs
  river: "10", water: "10", father: "10", mother: "10", brother: "10",
  sister: "10", morning: "10", evening: "100", summer: "10", winter: "10",
  autumn: "10", season: "10", reason: "10", person: "10", country: "10",
  city: "10", body: "10", money: "10", honey: "10", heavy: "10", happy: "10",
  holy: "10", only: "10", many: "10", every: "10", little: "10", middle: "10",
  table: "10", simple: "10", people: "10", single: "10", double: "10",
  trouble: "10", gentle: "10", settle: "10", battle: "10", cattle: "10",
  kettle: "10", letter: "10", better: "10", under: "10", other: "10",
  another: "010", together: "010", garden: "10", certain: "10", mountain: "10",
  fountain: "10", nation: "10", station: "10", vision: "10", passion: "10",
  question: "10", ocean: "10", ancient: "10", patient: "10", science: "10",
  conscience: "10", quiet: "10", flower: "10", power: "10", tower: "10",
  heaven: "10", seven: "10", given: "10", even: "10", eleven: "010",
  woman: "10", women: "10", children: "10", listen: "10", often: "10",
  beautiful: "100", possible: "100", terrible: "100", difficult: "100",
  wonderful: "100", powerful: "100", important: "010", universe: "100",
  yesterday: "100", holiday: "100", poetry: "100", poem: "10", poet: "10",
  rhythm: "10", idea: "010", fuel: "10", jewel: "10", camel: "10",
  business: "10", different: "100", interesting: "1000", family: "100",
  memory: "100", history: "100", story: "10", naked: "10", wicked: "10",
  blessed: "10", learned: "10", sacred: "10", silent: "10", distant: "10",
  instant: "10", constant: "10", present: "10", moment: "10", spirit: "10",
  image: "10", ballad: "10", couplet: "10", quatrain: "10", sonnet: "10",
  sestina: "010", villanelle: "001", refrain: "01", meter: "10", metre: "10",
  syllable: "100", syllables: "100", caesura: "010", enjambment: "010",
  alliteration: "00010", assonance: "100", consonance: "100", metaphor: "100",
  imagery: "100", stanza: "10", iamb: "10", iambic: "010", trochee: "10",
  anapest: "100", dactyl: "10", spondee: "01", poetic: "010",
};

const FUNCTION_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "nor", "so", "of", "in", "on", "at",
  "to", "for", "from", "with", "by", "as", "is", "was", "were", "are", "be",
  "been", "am", "do", "does", "did", "has", "have", "had", "my", "your",
  "his", "her", "its", "our", "their", "me", "him", "us", "them", "you",
  "he", "she", "we", "they", "it", "i", "that", "than", "then", "there",
  "when", "where", "while", "if", "because", "though", "although", "until",
  "unless", "not", "no", "yes", "all", "some", "can", "could", "would",
  "should", "will", "shall", "may", "might", "must", "just", "too", "also",
]);

// Vowel-group -> sound class. Longest patterns win.
const VOWEL_SOUNDS = [
  ["eigh", "EY"], ["igh", "AY"], ["ough", "AO"], ["augh", "AO"],
  ["air", "AIR"], ["are", "AIR"], ["ear", "EER"], ["eer", "EER"], ["ier", "EER"],
  ["ire", "AYR"], ["ore", "OR"], ["oar", "OR"], ["our", "OWER"], ["ure", "YUR"],
  ["ee", "IY"], ["ea", "IY"], ["ie", "IY"], ["ei", "EY"], ["ey", "EY"],
  ["ai", "EY"], ["ay", "EY"], ["oa", "OW"], ["oe", "OW"], ["ow", "OW"],
  ["oo", "UW"], ["ue", "UW"], ["ew", "UW"], ["ui", "UW"],
  ["oi", "OY"], ["oy", "OY"], ["au", "AO"], ["aw", "AO"],
  ["ou", "AW"],
  ["ar", "AAR"], ["er", "ER"], ["ir", "ER"], ["ur", "ER"], ["or", "OR"],
  ["a", "AE"], ["e", "EH"], ["i", "IH"], ["o", "AA"], ["u", "UH"], ["y", "IY"],
].sort((a, b) => b[0].length - a[0].length);

// Words whose spelling lies about their vowel. Value is the vowel class.
const VOWEL_OVERRIDES = {
  love: "UH", glove: "UH", dove: "UH", above: "UH", shove: "UH", have: "AE",
  move: "UW", prove: "UW", approve: "UW", groove: "UW",
  come: "UH", some: "UH", none: "UH", one: "UH", once: "UH",
  done: "UH", son: "UH", ton: "UH", won: "UH", month: "UH",
  gone: "AO", shone: "OW",
  said: "EH", again: "EY", against: "EH", friend: "EH", bread: "EH",
  dead: "EH", head: "EH", dread: "EH", breath: "EH", death: "EH",
  heart: "AAR", hearth: "AAR", earth: "ER", learn: "ER", heard: "ER",
  word: "ER", work: "ER", world: "ER", worth: "ER", worm: "ER",
  blood: "UH", flood: "UH", good: "UH", wood: "UH", could: "UH",
  should: "UH", would: "UH", book: "UH", look: "UH", foot: "UH",
  food: "UW", mood: "UW", roof: "UW", proof: "UW",
  though: "OW", dough: "OW", through: "UW", rough: "UH", tough: "UH",
  cough: "AO", trough: "AO", laugh: "AE", laughter: "AE",
  night: "AY", light: "AY", right: "AY", might: "AY", sight: "AY",
  tight: "AY", white: "AY", write: "AY", flight: "AY", bright: "AY",
  eye: "AY", eyes: "AY", buy: "AY", guy: "AY", high: "AY", sigh: "AY",
  time: "AY", mind: "AY", find: "AY", kind: "AY", blind: "AY", wind: "IH",
  live: "IH", give: "IH", sieve: "IH", women: "IH",
  been: "IH", people: "IY", key: "IY", quay: "IY",
  wolf: "UH", woman: "UH", suit: "UW", juice: "UW", build: "IH",
  give: "IH", forgive: "IH", live: "IH", sieve: "IH", lose: "UW", whose: "UW",
  choose: "UW", here: "EER", mere: "EER", sphere: "EER", pure: "YUR", cure: "YUR",
  wire: "AYR", tire: "AYR", hire: "AYR", desire: "AYR", entire: "AYR", sire: "AYR",
  care: "AIR", bare: "AIR", dare: "AIR", fare: "AIR", hare: "AIR", mare: "AIR",
  rare: "AIR", share: "AIR", spare: "AIR", stare: "AIR", bear: "AIR", pear: "AIR",
  wear: "AIR", swear: "AIR", tear: "AIR", poor: "OR",
  choir: "AYR", fire: "AYR", hour: "OWER", our: "OWER", flower: "OWER",
  power: "OWER", tower: "OWER", shower: "OWER",
  city: "IH", pretty: "IH", busy: "IH", myth: "IH", rhythm: "IH",
  soul: "OW", bowl: "OW", owe: "OW", sew: "OW",
  four: "OR", pour: "OR", court: "OR", course: "OR",
  are: "AAR", were: "ER", where: "AIR", there: "AIR", their: "AIR",
  they: "EY", eight: "EY", great: "EY", break: "EY", steak: "EY",
  water: "AO", daughter: "AO", caught: "AO", taught: "AO",
  shoe: "UW", canoe: "UW", view: "UW", new: "UW", knew: "UW",
  you: "UW", your: "OR", yours: "OR", young: "UH", country: "UH",
  double: "UH", trouble: "UH", touch: "UH", cousin: "UH", rough: "UH",
  tough: "UH", thought: "AO", bought: "AO", brought: "AO",
  now: "AW", how: "AW", cow: "AW", allow: "AW", wow: "AW", owl: "AW",
};

const TAIL_MAP = [
  [/ph/g, "f"], [/ck/g, "k"], [/gh/g, ""], [/x/g, "ks"], [/qu/g, "kw"],
  [/c(?=[eiy])/g, "s"], [/c/g, "k"], [/z/g, "s"],
];

export function cleanWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z'-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export function isFunctionWord(word) {
  return FUNCTION_WORDS.has(cleanWord(word));
}

// ---------------------------------------------------------------------------
// Syllables
// ---------------------------------------------------------------------------

function vowelGroups(word) {
  return word.match(/[aeiouy]+/g) || [];
}

function rawCount(word) {
  const w = word.replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 2) return 1;
  let groups = vowelGroups(w).length;
  if (groups === 0) return 1;
  // silent final e (but not -le, which is syllabic)
  if (/[^aeiouy]e$/.test(w) && groups > 1 && !/[^aeiouy]le$/.test(w)) groups--;
  // syllabic -le (table, little, gentle)
  if (/[^aeiouy]le$/.test(w) && !/[aeiouy]le$/.test(w)) groups++;
  // -ed is only syllabic after t/d
  if (/[^td]ed$/.test(w) && !/ied$/.test(w) && groups > 1) groups--;
  // -es is only syllabic after a sibilant (and -ies always keeps its beat)
  if (/es$/.test(w) && !/ies$/.test(w) && !/(ch|sh|ss|x|z|s)es$/.test(w) && groups > 1) groups--;
  // ia/io hiatus (radio, poem, lion) adds a beat
  if (/(ia|io|eo|ua|uo)$/.test(w) && groups >= 1 && !/tion$/.test(w)) groups++;
  return Math.max(1, groups);
}

export function syllableCount(word) {
  const w = cleanWord(word);
  if (!w) return 0;
  if (DICT[w]) return DICT[w].length;
  if (w.includes("-")) {
    return w.split("-").filter(Boolean).reduce((n, part) => n + syllableCount(part), 0);
  }
  return rawCount(w);
}

export function syllabify(word) {
  const w = cleanWord(word);
  if (!w) return [];
  const count = syllableCount(w);
  if (count <= 1) return [w];
  // Crude but readable: split before the consonant that precedes a vowel group.
  const parts = [];
  let rest = w;
  while (parts.length < count - 1) {
    const m = rest.match(/^(.*?[aeiouy]+)([^aeiouy]+[aeiouy].*)$/);
    if (!m) break;
    parts.push(m[1]);
    rest = m[2];
  }
  parts.push(rest);
  return parts.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Stress (0 = slack, 1 = beat)
// ---------------------------------------------------------------------------

const SUFFIX_STRESS = [
  [/(tion|sion|cian|tial|cial|cious|tious)$/, 2],
  [/(ity|ety|ify)$/, 3],
  [/(ical|ically)$/, 3],
  [/(ic)$/, 2],
  [/(ious)$/, 3],
  [/(ous)$/, 2],
  [/(al)$/, 2],
  [/y$/, 3],
];

function fallbackStress(word) {
  const n = rawCount(word);
  if (n <= 1) return [1];
  for (const [re, offset] of SUFFIX_STRESS) {
    if (re.test(word) && n - offset >= 0) {
      const idx = n - offset;
      const pat = Array(n).fill(0);
      pat[idx] = 1;
      return pat;
    }
  }
  let idx = 0;
  if (/^(be|de|re|pre|pro|ex|en|em|con|com|dis|ac|ad|ap|at|sur|per|sub|ob|oc|op)/.test(word) && n > 1) {
    idx = 1;
  }
  const pat = Array(n).fill(0);
  pat[idx] = 1;
  return pat;
}

function stripInflection(word) {
  // returns { base, extra, kind } or null
  if (/[^aeiouy]ies$/.test(word)) return { base: word.replace(/ies$/, "y"), extra: 0, kind: "plural" };
  if (/ied$/.test(word)) return { base: word.replace(/ied$/, "y"), extra: 0, kind: "past" };
  if (/ing$/.test(word) && word.length > 4) return { base: word.replace(/ing$/, ""), extra: 1, kind: "ing" };
  if (/[^td]ed$/.test(word) && word.length > 3) return { base: word.replace(/ed$/, ""), extra: 0, kind: "past" };
  if (/(ches|shes|sses|xes|zes|ses)$/.test(word)) return { base: word.replace(/es$/, ""), extra: 1, kind: "plural" };
  if (/s$/.test(word) && !/ss$/.test(word) && word.length > 2) return { base: word.replace(/s$/, ""), extra: 0, kind: "plural" };
  if (/(ly|ness|ment|less|ful)$/.test(word) && word.length > 4) {
    const suffix = word.match(/(ly|ness|ment|less|ful)$/)[0];
    return { base: word.slice(0, -suffix.length), extra: 1, kind: "suffix" };
  }
  if (/(er|est)$/.test(word) && word.length > 4 && /[aeiouy]/.test(word.slice(0, -2))) {
    const suffix = word.match(/(er|est)$/)[0];
    return { base: word.slice(0, -suffix.length), extra: 1, kind: "comparative" };
  }
  return null;
}

export function stressPattern(word) {
  const w = cleanWord(word);
  if (!w) return [];
  if (DICT[w]) return DICT[w].split("").map(Number);
  if (w.includes("-")) {
    return w.split("-").filter(Boolean).flatMap((p) => stressPattern(p));
  }
  const inflection = stripInflection(w);
  if (inflection) {
    const base = stressPattern(inflection.base);
    if (base.length) {
      const extra = inflection.extra;
      return extra ? [...base, ...Array(extra).fill(0)] : base;
    }
  }
  return fallbackStress(w);
}

// ---------------------------------------------------------------------------
// Rhyme
// ---------------------------------------------------------------------------

function lastVowel(word) {
  const vowels = [...word.matchAll(/[aeiouy]+r?/g)];
  if (!vowels.length) return null;
  return vowels[vowels.length - 1];
}

function vowelClass(group) {
  for (const [pattern, sound] of VOWEL_SOUNDS) {
    if (group === pattern) return sound;
  }
  // Prefer real digraphs/trigraphs over a bare first letter.
  for (const [pattern, sound] of VOWEL_SOUNDS) {
    if (pattern.length > 1 && group.startsWith(pattern)) return sound;
  }
  for (const [pattern, sound] of VOWEL_SOUNDS) {
    if (group.startsWith(pattern)) return sound;
  }
  return "AH";
}

function normaliseTail(tail) {
  let t = tail.replace(/e$/, "");
  for (const [re, rep] of TAIL_MAP) t = t.replace(re, rep);
  t = t.replace(/([bcdfgklmnprstvz])\1+/g, "$1");
  return t;
}

export function rhymeKey(word) {
  const w = cleanWord(word);
  if (!w) return "";

  // Syllabic -le: table / cable / little. Keep the consonant so they don't
  // all collapse into one family.
  const syllabicLe = w.match(/([bcdfgklmnprstvz])le$/);
  if (syllabicLe) return "UH" + syllabicLe[1] + "l";

  // Drop a silent final e, but keep the soft c/g information it carried.
  let base = w;
  const silentE = /[^aeiouy]e$/.test(base) && !/[^aeiouy]le$/.test(base);
  if (silentE) {
    base = base.slice(0, -1);
    if (/c$/.test(base)) base = base.slice(0, -1) + "s";
    else if (/g$/.test(base)) base = base.slice(0, -1) + "j";
  }

  const match = lastVowel(base);
  if (!match) return base;
  const override = VOWEL_OVERRIDES[w] || VOWEL_OVERRIDES[base];
  let sound = override || vowelClass(match[0]);
  if (!override && silentE && match[0].length === 1) {
    // magic e: hat -> hate, hop -> hope, bit -> bite
    sound = { a: "EY", e: "IY", i: "AY", o: "OW", u: "UW" }[match[0]] || sound;
  }
  if (/all$/.test(base) || /alk$/.test(base)) sound = "AO";
  const tail = normaliseTail(base.slice(match.index + match[0].length));
  return sound + tail;
}

export function rhymeVowel(word) {
  const key = rhymeKey(word);
  return key.replace(/[^A-Z]/g, "");
}

export function rhymes(a, b) {
  const ka = rhymeKey(a);
  const kb = rhymeKey(b);
  if (!ka || !kb) return false;
  return ka === kb;
}

export function slantRhyme(a, b) {
  if (rhymes(a, b)) return false;
  const va = rhymeVowel(a);
  const vb = rhymeVowel(b);
  if (!va || va !== vb) return false;
  const ta = rhymeKey(a).slice(va.length);
  const tb = rhymeKey(b).slice(vb.length);
  if (!ta || !tb) return false;
  if (ta === tb) return false;
  const longer = Math.max(ta.length, tb.length);
  if (Math.abs(ta.length - tb.length) > 1) return false;
  let diff = 0;
  for (let i = 0; i < longer; i++) if (ta[i] !== tb[i]) diff++;
  return diff <= 1;
}

export function rhymeFamily(word) {
  const key = rhymeKey(word);
  if (!key) return [];
  return RHYME_WORDS.filter((w) => w !== cleanWord(word) && rhymeKey(w) === key);
}

// A working word-hoard for rhyme suggestions and root lookups.
export const RHYME_WORDS = [
  "light", "night", "bright", "white", "flight", "sight", "right", "tight",
  "rain", "pain", "chain", "grain", "plain", "stain", "vein", "again",
  "stone", "bone", "alone", "known", "grown", "thrown", "home", "ghost",
  "road", "load", "code", "abode", "showed", "flowed", "gold", "cold",
  "old", "hold", "told", "fold", "sold", "bold", "wind", "blind", "mind",
  "kind", "find", "behind", "hand", "land", "sand", "band", "stand",
  "brand", "grand", "strand", "heart", "start", "art", "part", "dark",
  "mark", "spark", "shark", "bark", "hard", "guard", "card", "yard",
  "word", "bird", "heard", "third", "world", "curled", "furled", "sword",
  "love", "above", "glove", "dove", "shove", "move", "prove", "groove",
  "blood", "flood", "mud", "bud", "stud", "thud", "wood", "good", "could",
  "should", "would", "stood", "book", "look", "brook", "cook", "hook",
  "fire", "wire", "choir", "higher", "liar", "hour", "flower", "power",
  "tower", "shower", "sea", "free", "tree", "three", "key", "be", "me",
  "we", "she", "thee", "sky", "high", "why", "fly", "cry", "dry", "try",
  "eye", "buy", "guy", "lie", "die", "tie", "time", "climb", "rhyme",
  "name", "same", "flame", "frame", "game", "shame", "came", "claim",
  "day", "way", "say", "stay", "play", "grey", "pray", "away", "today",
  "sleep", "deep", "keep", "weep", "creep", "steep", "sweep", "cheap",
  "dream", "stream", "seem", "beam", "gleam", "team", "cream", "scream",
  "door", "floor", "more", "shore", "before", "war", "score", "four",
  "room", "tomb", "womb", "doom", "gloom", "bloom", "broom", "soon",
  "moon", "June", "tune", "dune", "run", "sun", "done", "one", "none",
  "son", "gun", "fun", "begun", "young", "tongue", "among", "hung",
  "air", "fair", "hair", "care", "there", "where", "bear", "wear",
  "tear", "fear", "hear", "near", "year", "clear", "dear", "appear",
  "earth", "birth", "worth", "death", "breath", "wrath", "path", "bath",
  "house", "mouse", "blouse", "spouse", "cloud", "loud", "proud", "shroud",
  "sound", "ground", "round", "found", "hound", "bound", "wound",
  "voice", "choice", "noise", "poise", "boy", "joy", "toy", "destroy",
  "awake", "break", "make", "take", "shake", "wake", "lake", "snake",
  "true", "blue", "through", "view", "new", "knew", "few", "dew",
  "star", "far", "car", "are", "scar", "guitar", "hollow", "follow",
  "tomorrow", "sorrow", "shadow", "meadow", "window", "pillow", "willow",
  "river", "silver", "shiver", "quiver", "deliver", "winter", "splinter",
  "summer", "drummer", "humour", "rumour", "colour", "mother", "brother",
  "father", "gather", "rather", "water", "daughter", "laughter", "after",
  "morning", "warning", "mourning", "evening", "season", "reason", "treason",
  "garden", "garden", "burden", "certain", "curtain", "mountain", "fountain",
  "question", "station", "nation", "vision", "mission", "passion", "fashion",
  "silence", "violence", "presence", "sentence", "distance", "instance",
  "music", "rhythm", "poem", "open", "closing", "beginning", "ending",
  "work", "word", "world", "wound", "wonder", "wander", "whisper", "thunder",
];
