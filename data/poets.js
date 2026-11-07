// The four voices: rhythm signatures, root languages, original pastiche, practice.
// NOTE: every "pastiche" here is original writing in the manner of the poet,
// not a quotation. It exists so you can hear the metrical signature.

export const VOICES = [
  {
    id: "heaney",
    name: "Seamus Heaney",
    dates: "1939–2013",
    place: "Bellaghy, County Derry",
    epithet: "The spade, the soil, the word.",
    accent: "#c08a4a",
    initials: "SH",
    meterChips: ["4–5 stresses", "8–12 syllables", "caesura", "hard alliteration"],
    rhythm: {
      headline: "Loose iambic, weighted with monosyllables",
      summary:
        "Heaney's line is a tool with mud on it. He counts beats more than feet, packs the line with short physical words, and lets a caesura fall where the spade hits. Alliteration is not decoration — it is the sound of two hard things touching.",
      bullets: [
        "**Beat over foot.** Four or five stresses a line, with unstressed syllables crowded into the gaps.",
        "**The caesura as a tool-mark.** A comma, a dash, a full stop mid-line: the place where the work pauses.",
        "**Monosyllables carry the weight.** *clay*, *cold*, *sod*, *hand* — plain words struck together.",
        "**Enjambment with resistance.** The sentence pulls against the break like roots against a blade.",
        "**Hard consonants in company.** d, g, b, k — digging, cutting, lifting.",
      ],
      hear: "Read the pastiche aloud and tap once per stress. You should feel four or five taps, not a metronome.",
    },
    roots: {
      headline: "Old English ground, Norse weather, Irish mud",
      summary:
        "Heaney's diction is a core sample. The bedrock is Old English — short, physical, monosyllabic. Old Norse supplies the northern weather. Irish dialect words are left deliberately unsmoothed, so the poem sounds like the place it comes from.",
      items: [
        { word: "loam", lang: "oe", note: "lām — clay, mud. The ground itself." },
        { word: "clabber", lang: "ga", note: "clábar — mud, puddle. Dialect kept, not translated." },
        { word: "scraw", lang: "ga", note: "scráth — a sod or strip of turf." },
        { word: "brae", lang: "on", note: "brá — brow, hillside. Norse slope." },
        { word: "ghost", lang: "oe", note: "gāst — spirit, breath. Older and stranger than 'spirit'." },
        { word: "word", lang: "oe", note: "word — speech, command. The poem's own material." },
      ],
      takeaway: "When a line goes abstract, Heaney reaches for a tool, a body part, or the name of the ground.",
    },
    pastiche: {
      title: "The Spade",
      lines: [
        "The spade goes down through a seam of loam",
        "and turns a cold tongue in the earth's mouth.",
        "My father's hands are in the handle's grain —",
        "a smell of clay, a shiver of small stones,",
        "the whole field breathing under the blade.",
      ],
      note: "Original, in the manner of Heaney: five stresses, a mid-line pause, and the hard d/g/b consonants doing the digging.",
    },
    practice: [
      {
        title: "Dig one line",
        text: "Choose an object a parent or grandparent used. Describe it in four monosyllables and one long word. Put a caesura where the tool strikes.",
      },
      {
        title: "Sound the consonants",
        text: "Write a line about work where every stressed word begins with d, g, b or k. Then remove one of them so the line can breathe.",
      },
      {
        title: "Root it",
        text: "Take three abstract words in your draft and replace each with an Old English physical equivalent — or with an object that does the same job.",
      },
      {
        title: "Place-name poem",
        text: "Six lines made only of place-names and what happened there. No adjectives. Let the names carry the history.",
      },
    ],
    profile: {
      avgSyll: 10.5,
      syllVar: 3.2,
      regularity: 0.55,
      rhymeDensity: 0.15,
      enjambment: 0.55,
      caesura: 0.5,
      alliteration: 1.0,
      repetition: 0.12,
      latinate: 0.12,
      germanic: 0.8,
      mono: 0.62,
      punct: 0.55,
    },
  },

  {
    id: "gorman",
    name: "Amanda Gorman",
    dates: "b. 1998",
    place: "Los Angeles, California",
    epithet: "The breath, the room, the we.",
    accent: "#e0b13c",
    initials: "AG",
    meterChips: ["12–20 syllables", "anaphora", "tricolon", "civic register"],
    rhythm: {
      headline: "Civic long line — breath as architecture",
      summary:
        "Gorman writes for the breath and the room. Her line is long, deliberate, built to be spoken while a crowd breathes with it. Anaphora is the engine; the line break is the moment the argument turns, not the moment the sentence ends.",
      bullets: [
        "**Anaphora as scaffolding.** *We have not…*, *We will…* — repetition is structure, not filler.",
        "**Long lines, three stresses deep.** Twelve to twenty syllables, often three heavy beats, delivered in one breath.",
        "**Tricolon.** Things arrive in threes; the third one lands.",
        "**Abstraction colliding with image.** *justice* next to *a bridge*, *grief* next to *a door*.",
        "**The public 'we'.** The poem is a speech the reader is already standing inside.",
      ],
      hear: "Mark every breath, not every foot. Where you run out of air is where the line should break.",
    },
    roots: {
      headline: "Latin civics, Greek form, scriptural cadence",
      summary:
        "Her grandeur is Latinate: justice, liberty, republic, dignity. Her sense of form is Greek: rhythm, lyric, metaphor. And underneath the public address runs a scriptural cadence — the prophetic *and the people shall*.",
      items: [
        { word: "justice", lang: "la", note: "iustitia — the root of the civic register." },
        { word: "liberty", lang: "la", note: "libertas — freedom as a public condition." },
        { word: "dignity", lang: "la", note: "dignitas — worth, rank, the right to be seen." },
        { word: "democracy", lang: "gr", note: "dēmokratia — rule of the people." },
        { word: "rhythm", lang: "gr", note: "rhythmos — measured flow. The body's argument." },
        { word: "jubilee", lang: "he", note: "yovel — the year of release. A prophetic word for repair." },
      ],
      takeaway: "Latinate nouns give the poem its public weight; plain images keep it from floating away.",
    },
    pastiche: {
      title: "The Sentence",
      lines: [
        "We have not come this far across the dark to fold the map.",
        "We have not carried every name this far to lose the door.",
        "We are the sentence that the silence kept against its teeth —",
        "a country learning how to say its name out loud.",
        "And if the name is broken, we will break the silence",
        "into syllables of light and hand them back.",
      ],
      note: "Original, in the manner of Gorman: anaphora, long breath-lines, a tricolon arriving late, abstraction held by an image.",
    },
    practice: [
      {
        title: "The litany",
        text: "Write five sentences beginning *We have not…*. Cut the weakest. Break the rest where the argument turns, not where the sentence ends.",
      },
      {
        title: "Tricolon drill",
        text: "Take one plain statement and give it two siblings — one smaller, one larger. Let the third one carry the emotion.",
      },
      {
        title: "Civic image",
        text: "Put one abstraction and one ordinary object in the same line. Do not explain the join. *Justice* and *a bus stop*.",
      },
      {
        title: "Stand and breathe",
        text: "Read it standing. Mark every breath. Cut one word per breath without losing the sense.",
      },
    ],
    profile: {
      avgSyll: 15.5,
      syllVar: 4.5,
      regularity: 0.5,
      rhymeDensity: 0.12,
      enjambment: 0.35,
      caesura: 0.5,
      alliteration: 0.5,
      repetition: 0.9,
      latinate: 0.3,
      germanic: 0.52,
      mono: 0.5,
      punct: 0.9,
    },
  },

  {
    id: "dylan",
    name: "Bob Dylan",
    dates: "b. 1941",
    place: "Duluth, Minnesota",
    epithet: "The train, the hymn, the refusal.",
    accent: "#7f9bb5",
    initials: "BD",
    meterChips: ["fourteener", "rhymed couplets", "internal rhyme", "King James"],
    rhythm: {
      headline: "Fourteener and blues shuffle",
      summary:
        "Dylan's engine is the old ballad line: fourteen syllables, seven beats, rhymed couplets, and a voice that arrives a half-beat late. He can make a sentence walk like a freight train and stop it on a dime.",
      bullets: [
        "**Fourteener.** Seven stresses a line, often split 4 + 3 — the meter of ballads, hymns and nursery rhymes.",
        "**Rhyme as propulsion.** Couplets and abcb; the rhyme is the next station, not the destination.",
        "**Internal rhyme and catalogue.** The line rhymes inside itself and keeps moving.",
        "**Biblical cadence.** *And it shall come to pass* — King James rhythm under the blues.",
        "**The refusal.** One line that breaks the pattern to say what the pattern cannot.",
      ],
      hear: "Sing it. Where you run out of breath is a line break; where the rhyme lands is a station.",
    },
    roots: {
      headline: "Scripture, ballad, vernacular",
      summary:
        "The King James Bible is the ground bass: jubilee, prophet, sabbath, amen. Old English ballad words keep the line walking. American vernacular keeps it honest. And the legal-religious Latin of the pulpit surfaces whenever the song wants authority.",
      items: [
        { word: "jubilee", lang: "he", note: "yovel — release, the trumpet year." },
        { word: "prophet", lang: "he", note: "navi — the one who speaks for another." },
        { word: "amen", lang: "he", note: "so be it. The end-stop of the hymn." },
        { word: "sabbath", lang: "he", note: "shabbat — rest. The seventh day as structure." },
        { word: "highway", lang: "oe", note: "hēah + weg — the old road word, still walking." },
        { word: "rain", lang: "oe", note: "regn — weather as refrain." },
      ],
      takeaway: "The rhyme is the engine, the scripture is the chassis, and one plainspoken line keeps it from becoming a sermon.",
    },
    pastiche: {
      title: "Midnight Freight",
      lines: [
        "The whistle blew at midnight and the highway hummed with rain,",
        "I stood beneath the station light and counted out the train.",
        "The days come up like freight trains, the nights go down like stone,",
        "and every road I travelled on keeps calling me back home.",
      ],
      note: "Original, in the manner of Dylan: fourteener couplets, a biblical-prophetic sweep, and a plain last line that refuses to be fancy.",
    },
    practice: [
      {
        title: "Headline to fourteener",
        text: "Take one news headline and make it a rhymed couplet of seven beats per line. Keep the grammar of the street.",
      },
      {
        title: "List song",
        text: "Ten lines of things seen from a bus, rhymed abcb, with one line that refuses to rhyme at all.",
      },
      {
        title: "Steal a cadence",
        text: "Take the rhythm of a hymn you know and put your own street, town and weather inside it.",
      },
      {
        title: "The refusal",
        text: "Write a strict rhymed stanza. Then replace the last line with a flat sentence that tells the truth and does not rhyme.",
      },
    ],
    profile: {
      avgSyll: 13,
      syllVar: 3.3,
      regularity: 0.6,
      rhymeDensity: 0.65,
      enjambment: 0.35,
      caesura: 0.3,
      alliteration: 0.7,
      repetition: 0.3,
      latinate: 0.1,
      germanic: 0.72,
      mono: 0.66,
      punct: 0.4,
    },
  },

  {
    id: "bilston",
    name: "Brian Bilston",
    dates: "Contemporary",
    place: "England",
    epithet: "Plain speech in strict clothes.",
    accent: "#c06a5a",
    initials: "BB",
    meterChips: ["iambic tetrameter", "sonnet", "exact rhyme", "deadpan"],
    rhythm: {
      headline: "Plain speech in strict clothes",
      summary:
        "Bilston's trick is a collision: strict form, plain speech. A sonnet about a dishwasher. A villanelle about a group chat. The meter is immaculate, the diction is supermarket, and the joke is that the form takes the feeling seriously.",
      bullets: [
        "**Form as straight man.** Sonnet, sestina, villanelle — the stricter the box, the funnier the thing inside.",
        "**Plain diction, exact rhyme.** No word you wouldn't text; no rhyme that isn't true.",
        "**Enjambment for the punchline.** The line break withholds the gag for half a second.",
        "**Deadpan tone.** The poem never winks; the reader does.",
        "**The title is part of the poem.** Often the setup, rarely the label.",
      ],
      hear: "Tap the beat lightly. If you can hear the form clicking and the voice shrugging, you have it.",
    },
    roots: {
      headline: "Anglo-Saxon consonants, Latin only for the joke",
      summary:
        "He keeps the plain Old English words and lets the Norman French and Latin in only when pomposity is the point. The comedy lives in the gap between the register of the form and the register of the sentence.",
      items: [
        { word: "kettle", lang: "oe", note: "cetel — the domestic monosyllable." },
        { word: "agree", lang: "fr", note: "agreer — the language of terms and conditions." },
        { word: "perpetuity", lang: "la", note: "perpetuitas — imported for comic pomposity." },
        { word: "soul", lang: "oe", note: "sāwol — the plain word doing the real work." },
        { word: "wireless", lang: "oe", note: "wīr + lēas — an old word for a new thing." },
        { word: "tea", lang: "fr", note: "thé — the borrowed comfort." },
      ],
      takeaway: "Let the form be grand and the words be small. The friction between them is the poem.",
    },
    pastiche: {
      title: "Terms and Conditions",
      lines: [
        "I read the terms and clicked agree,",
        "a thing I did not read,",
        "and now my soul belongs to them",
        "in perpetuity.",
        "I did not know I had a soul",
        "to give away for free;",
        "I only wanted fifteen minutes",
        "of wireless, and tea.",
      ],
      note: "Original, in the manner of Bilston: strict quatrains, exact-ish rhyme, deadpan tone, and a Latinate word used as a punchline.",
    },
    practice: [
      {
        title: "Appliance sonnet",
        text: "Fourteen lines on a household object. Strict iambic pentameter, real feeling, and no puns in the rhyme. The form carries the joke.",
      },
      {
        title: "Villanelle of the group chat",
        text: "Two refrains, one of which is a message you would actually send. Keep the meter and let the banality do the work.",
      },
      {
        title: "The deadpan list",
        text: "A poem that is only a to-do list, with one line that is not. Do not flag the line.",
      },
      {
        title: "End plain",
        text: "Revise a draft so that the last line is the plainest word in the poem. No summary, no flourish.",
      },
    ],
    profile: {
      avgSyll: 9.5,
      syllVar: 2.2,
      regularity: 0.72,
      rhymeDensity: 0.6,
      enjambment: 0.42,
      caesura: 0.32,
      alliteration: 0.45,
      repetition: 0.18,
      latinate: 0.16,
      germanic: 0.72,
      mono: 0.6,
      punct: 0.5,
    },
  },
];

export const VOICE_BY_ID = Object.fromEntries(VOICES.map((v) => [v.id, v]));

// Starter drafts so the workshop is never empty on first visit.
export const SAMPLES = [
  {
    label: "A spade in the hall",
    text: `The spade still stands in the hall,
its handle worn to the shape of a hand
that is not mine. I lift it once.
The blade is cold as a word
kept too long in the mouth.`,
  },
  {
    label: "We have not",
    text: `We have not come this far across the dark to fold the map.
We have not carried every name this far to lose the door.
We are the sentence that the silence kept against its teeth —
a country learning how to say its name out loud.`,
  },
  {
    label: "Midnight train",
    text: `The whistle blew at midnight and the highway hummed with rain,
I stood beneath the station light and counted out the train.
The days come up like freight trains, the nights go down like stone,
and every road I travelled on keeps calling me back home.`,
  },
  {
    label: "Terms and conditions",
    text: `I read the terms and clicked agree,
a thing I did not read,
and now my soul belongs to them
in perpetuity.`,
  },
];
