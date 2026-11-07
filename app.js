import { VOICES, SAMPLES, VOICE_BY_ID } from "./data/poets.js";
import { LANGS, LEXICON, lookup } from "./data/roots.js";
import { analyzePoem } from "./engine/analysis.js";
import { coachReply, COACH_CHIPS } from "./engine/coach.js";

/* --------------------------------------------------------------------------
   Utilities
   -------------------------------------------------------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const one = (n) => Number(n).toFixed(1);
const pct = (x) => `${Math.round((x || 0) * 100)}%`;
const first = (voice) => voice.name.split(" ")[0];

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

const LS = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode / quota */
    }
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VOICE_LANG_HINT = {
  oe: "Heaney · Bilston",
  on: "Heaney",
  ga: "Heaney",
  la: "Gorman · the pulpit",
  gr: "Gorman",
  fr: "Bilston, for the joke",
  he: "Dylan",
  ar: "the trading ports",
};

/* --------------------------------------------------------------------------
   State
   -------------------------------------------------------------------------- */

const DEFAULT_SETTINGS = {
  useLive: false,
  base: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  key: "",
};

const state = {
  view: "voices",
  tab: "scan",
  lens: null,
  draft: LS.get("fv.draft", SAMPLES[0].text),
  analysis: null,
  chat: LS.get("fv.chat", null),
  settings: { ...DEFAULT_SETTINGS, ...LS.get("fv.settings", {}) },
  rootFilter: "all",
  rootQuery: "",
  busy: false,
};

/* --------------------------------------------------------------------------
   Markdown (small, safe, enough for the coach)
   -------------------------------------------------------------------------- */

function inlineMd(text) {
  let x = esc(text);
  x = x.replace(/`([^`]+)`/g, "<code>$1</code>");
  x = x.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  x = x.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return x;
}

function blockMd(text) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length && lines.every((l) => /^-\s+/.test(l))) {
        return `<ul>${lines
          .map((l) => `<li>${inlineMd(l.replace(/^-\s+/, ""))}</li>`)
          .join("")}</ul>`;
      }
      if (lines.length && lines.every((l) => /^\d+\.\s+/.test(l))) {
        return `<ol>${lines
          .map((l) => `<li>${inlineMd(l.replace(/^\d+\.\s+/, ""))}</li>`)
          .join("")}</ol>`;
      }
      return `<p>${inlineMd(block).replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

function mdToHtml(md) {
  const parts = String(md).split("```");
  return parts
    .map((part, i) =>
      i % 2 === 1
        ? `<pre>${esc(part.replace(/^\n/, "").replace(/\n$/, ""))}</pre>`
        : blockMd(part)
    )
    .join("");
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", init);

function init() {
  $("#draft").value = state.draft;
  renderVoices();
  renderSamples();
  renderLens();
  renderRoots();
  bindEvents();
  hydrateSettings();

  const hash = location.hash.replace("#", "");
  const allowed = ["voices", "workshop", "roots", "about"];
  setView(allowed.includes(hash) ? hash : "voices", false);

  runAnalysis();

  if (!Array.isArray(state.chat) || !state.chat.length) {
    const intro = coachReply({
      text: "hello",
      analysis: state.analysis,
      lens: state.lens,
      history: [],
    });
    state.chat = [{ role: "coach", text: intro.text, chips: intro.chips }];
    saveChat();
  }
  renderChat();
}

/* --------------------------------------------------------------------------
   Navigation
   -------------------------------------------------------------------------- */

function setView(view, push = true) {
  state.view = view;
  $$(".nav-btn").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.view === view)
  );
  $$(".view").forEach((v) =>
    v.classList.toggle("is-active", v.id === `view-${view}`)
  );
  if (push && location.hash !== `#${view}`) {
    history.replaceState(null, "", `#${view}`);
  }
  window.scrollTo({ top: 0, behavior: "auto" });
  if (view === "roots") renderRoots();
}

function bindEvents() {
  $$(".nav-btn").forEach((b) =>
    b.addEventListener("click", () => setView(b.dataset.view))
  );
  $$("[data-goto]").forEach((b) =>
    b.addEventListener("click", () => setView(b.dataset.goto))
  );
  window.addEventListener("hashchange", () => {
    const hash = location.hash.replace("#", "");
    if (hash && hash !== state.view) setView(hash, false);
  });

  $("#surpriseBtn").addEventListener("click", () => {
    const id = VOICES[Math.floor(Math.random() * VOICES.length)].id;
    openVoice(id);
  });

  $("#settingsBtn").addEventListener("click", openSettings);
  $("#voiceGrid").addEventListener("click", (e) => {
    const card = e.target.closest("[data-voice]");
    if (card) openVoice(card.dataset.voice);
  });
  $("#voiceGrid").addEventListener("keydown", (e) => {
    const card = e.target.closest("[data-voice]");
    if (card && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openVoice(card.dataset.voice);
    }
  });

  $("#voiceDrawer").addEventListener("click", (e) => {
    if (e.target.closest("[data-close-drawer]")) {
      closeDrawer();
      return;
    }
    const lensBtn = e.target.closest("[data-lens]");
    if (lensBtn) {
      const id = lensBtn.dataset.lens;
      const voice = VOICE_BY_ID[id];
      setLens(id);
      closeDrawer();
      setView("workshop");
      if (voice) toast(`Reading through ${first(voice)}`);
      return;
    }
    const pasteBtn = e.target.closest("[data-use-pastiche]");
    if (pasteBtn) {
      const voice = VOICE_BY_ID[pasteBtn.dataset.usePastiche];
      if (!voice) return;
      setDraft(voice.pastiche.lines.join("\n"));
      closeDrawer();
      setView("workshop");
      toast("Pastiche loaded — keep the rhythm, change the words");
    }
  });

  // Editor
  const draftEl = $("#draft");
  let analysisTimer;
  draftEl.addEventListener("input", () => {
    state.draft = draftEl.value;
    clearTimeout(analysisTimer);
    analysisTimer = setTimeout(() => runAnalysis(), 150);
    LS.set("fv.draft", state.draft);
  });

  $("#copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.draft);
      toast("Draft copied");
    } catch {
      draftEl.select();
      document.execCommand("copy");
      toast("Draft copied");
    }
  });
  $("#clearBtn").addEventListener("click", () => {
    setDraft("");
    draftEl.focus();
    toast("Page cleared");
  });

  // Read-out tabs
  $("#readoutTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".seg");
    if (!btn) return;
    state.tab = btn.dataset.tab;
    $$(".seg").forEach((b) => b.classList.toggle("is-active", b === btn));
    renderReadout();
  });

  // Read-out interactions
  $("#readoutBody").addEventListener("click", (e) => {
    const lineBtn = e.target.closest("[data-line]");
    if (lineBtn) {
      sendChat(`Analyse line ${lineBtn.dataset.line}`);
      return;
    }
    const lensBtn = e.target.closest("[data-lens]");
    if (lensBtn) {
      setLens(lensBtn.dataset.lens || null);
      return;
    }
    const openBtn = e.target.closest("[data-open-voice]");
    if (openBtn) openVoice(openBtn.dataset.openVoice);
  });

  // Lens row
  $("#lensRow").addEventListener("click", (e) => {
    const pill = e.target.closest("[data-lens]");
    if (pill) setLens(pill.dataset.lens || null);
  });

  // Chat
  $("#composer").addEventListener("submit", (e) => {
    e.preventDefault();
    sendChat($("#chatInput").value);
  });
  const chatInput = $("#chatInput");
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
  });
  chatInput.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      sendChat(chatInput.value);
    }
  });
  $("#chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip-btn");
    if (!chip) return;
    const text = chip.dataset.chip;
    if (text === "Open the closest voice") {
      openVoice(state.analysis?.echoes?.[0]?.id || "heaney");
      return;
    }
    sendChat(text);
  });
  $("#clearChatBtn").addEventListener("click", () => {
    const intro = coachReply({
      text: "hello",
      analysis: state.analysis,
      lens: state.lens,
      history: [],
    });
    state.chat = [{ role: "coach", text: intro.text, chips: intro.chips }];
    saveChat();
    renderChat();
    toast("Conversation cleared");
  });

  // Root explorer
  $("#rootSearch").addEventListener("input", (e) => {
    state.rootQuery = e.target.value.trim().toLowerCase();
    renderRootEntries();
  });
  $("#rootFilter").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lang]");
    if (!btn) return;
    state.rootFilter = btn.dataset.lang;
    renderRoots();
  });
  $("#rootLangs").addEventListener("click", (e) => {
    const card = e.target.closest("[data-lang]");
    if (!card) return;
    state.rootFilter = state.rootFilter === card.dataset.lang ? "all" : card.dataset.lang;
    renderRoots();
    $("#rootResults").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Drawer / modal
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-drawer]")) closeDrawer();
    if (e.target.closest("[data-close-modal]")) closeSettings();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDrawer();
      closeSettings();
    }
    const typing =
      /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") ||
      document.activeElement?.isContentEditable;
    if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const map = { 1: "voices", 2: "workshop", 3: "roots", 4: "about" };
      if (map[e.key]) setView(map[e.key]);
    }
  });

  // Settings form
  $("#saveSettings").addEventListener("click", saveSettings);
  $("#useLive").addEventListener("change", (e) => {
    if (e.target.checked && !$("#apiKey").value.trim()) {
      toast("Add an API key first, or leave live chat off");
    }
  });
}

/* --------------------------------------------------------------------------
   Draft + analysis
   -------------------------------------------------------------------------- */

function setDraft(text) {
  state.draft = text;
  $("#draft").value = text;
  LS.set("fv.draft", text);
  runAnalysis();
}

function runAnalysis(initial = false) {
  state.analysis = analyzePoem(state.draft);
  renderStats();
  renderReadout();
  updateCoachSub();
  if (state.view === "roots") renderRoots();
  if (initial) renderChat();
}

function renderStats() {
  const a = state.analysis;
  if (!a) return;
  const strip = $("#statStrip");
  const beats =
    a.activeLines > 0
      ? a.lines.filter((l) => l.words.length).reduce((n, l) => n + l.beats, 0) /
        a.activeLines
      : 0;
  strip.innerHTML = `
    <div><b>${a.totals.lines}</b><span>lines</span></div>
    <div><b>${one(a.totals.avgSyllables)}</b><span>syll/line</span></div>
    <div><b>${one(beats)}</b><span>beats</span></div>
    <div><b>${pct(a.rhyme.density)}</b><span>rhyme</span></div>`;

  $("#draftSub").textContent = a.totals.lines
    ? `${a.stanzaCount} stanza${a.stanzaCount === 1 ? "" : "s"} · ${a.totals.words} words`
    : "a private page";
}

function updateCoachSub() {
  const sub = $("#coachSub");
  if (!sub) return;
  if (state.settings.useLive && state.settings.key) {
    sub.textContent = `live · ${state.settings.model || "model"}`;
  } else if (state.lens && VOICE_BY_ID[state.lens]) {
    sub.textContent = `offline · through ${first(VOICE_BY_ID[state.lens])}`;
  } else {
    sub.textContent = "offline · reads your draft";
  }
}

/* --------------------------------------------------------------------------
   Read-out
   -------------------------------------------------------------------------- */

function patternSpans(pattern) {
  return pattern
    .map((s) => (s ? '<span class="beat">/</span>' : "\u00b7"))
    .join("");
}

function dominantFoot(a) {
  const counts = {};
  for (const l of a.lines) {
    if (!l.words.length || l.foot === "mixed") continue;
    counts[l.foot] = (counts[l.foot] || 0) + 1;
  }
  const top = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
  return top ? top[0] : "mixed";
}

function emptyReadout(message) {
  $("#readoutBody").innerHTML = `<div class="readout-empty">${message}</div>`;
}

function renderReadout() {
  const a = state.analysis;
  if (!a || !a.features) {
    emptyReadout(
      "<strong>No draft yet.</strong><span>Paste a few lines into the editor, or load a sample, and the scan will appear here.</span>"
    );
    return;
  }
  if (state.tab === "scan") renderScan(a);
  else if (state.tab === "sound") renderSound(a);
  else if (state.tab === "roots") renderRootsTab(a);
  else renderEchoes(a);
}

function renderScan(a) {
  const active = a.lines.filter((l) => l.words.length);
  const beats = active.reduce((n, l) => n + l.beats, 0) / (active.length || 1);
  const foot = dominantFoot(a);

  const rows = active
    .map(
      (l) => `
      <button class="scan-row ${l.foot === "mixed" ? "is-mixed" : ""}" data-line="${l.number}"
        title="Ask the coach about line ${l.number}">
        <span class="scan-num">${l.number}</span>
        <span class="scan-pattern">${patternSpans(l.pattern)}</span>
        <span class="scan-meta">
          <span>${l.syllables}s</span>
          <span>${l.beats}b</span>
          <span class="scan-foot">${esc(l.foot)}</span>
        </span>
      </button>`
    )
    .join("");

  const loose = active.filter((l) => l.regularity < 0.5);

  $("#readoutBody").innerHTML = `
    <div class="summary-row">
      <div class="summary-cell"><b>${a.totals.lines}</b><span>lines</span></div>
      <div class="summary-cell"><b>${one(a.totals.avgSyllables)}</b><span>syllables / line</span></div>
      <div class="summary-cell"><b>${one(beats)}</b><span>beats / line</span></div>
      <div class="summary-cell"><b>${pct(a.rhyme.density)}</b><span>rhyme density</span></div>
    </div>
    <div class="block-title"><span>The line, tapped</span><span>${esc(foot)}</span></div>
    ${rows}
    <p class="scan-note">
      <strong>${esc(foot === "mixed" ? "Accentual, loose" : foot)}</strong> motion.
      ${foot === "mixed"
        ? "The stress is scattered rather than footed — a drum, not a metronome. That is a legitimate music; just make sure the beats fall where you want the emphasis."
        : `The beat holds about ${Math.round(a.features.regularity * 100)}% of the time. You can afford one deliberate break.`}
      ${loose.length ? ` Line${loose.length > 1 ? "s" : ""} ${loose.map((l) => l.number).join(", ")} ${loose.length > 1 ? "are" : "is"} the loosest.` : ""}
    </p>
  `;
}

function deviceRow(name, value, denominator, examples) {
  const p = denominator ? Math.min(1, value / denominator) : 0;
  return `
    <div class="device">
      <div class="device-head"><b>${name}</b><span>${value}</span></div>
      ${examples ? `<div class="device-body">${examples}</div>` : ""}
      <div class="meter-bar"><i style="width:${Math.round(p * 100)}%"></i></div>
    </div>`;
}

function renderSound(a) {
  const families = Object.entries(a.rhyme.families).filter(([, g]) => g.length >= 2);
  const allit = a.sound.alliteration;
  const asson = a.sound.assonance;
  const anaph = a.sound.anaphora;

  const familyHtml = families.length
    ? families
        .map(([letter, group]) => {
          const words = [...new Set(group.map((l) => l.lastWord))].join(" / ");
          return `<div class="family"><b>${letter}</b><span>${esc(words)}</span></div>`;
        })
        .join("")
    : `<div class="family"><b>—</b><span>no end-rhyme yet</span></div>`;

  const flags = a.flags.length
    ? a.flags
        .map((f) => `<div class="flag ${f.tone || ""}">${esc(f.text)}</div>`)
        .join("")
    : `<div class="flag muted">Nothing is breaking. Where is the risk?</div>`;

  $("#readoutBody").innerHTML = `
    <div class="block-title"><span>Rhyme scheme</span><span>${pct(a.rhyme.density)} density</span></div>
    <div class="scheme">${esc(a.rhyme.scheme || "\u2014")}</div>
    ${familyHtml}
    ${
      a.rhyme.slants.length
        ? `<p class="scan-note">Near-rhymes: ${a.rhyme.slants
            .slice(0, 3)
            .map((s) => `<strong>${esc(s.a)}/${esc(s.b)}</strong>`)
            .join(", ")}. A slant is a door, not a mistake — decide which.</p>`
        : ""
    }

    <div class="block-title"><span>Sound devices</span><span>per line</span></div>
    ${deviceRow(
      "Alliteration",
      allit.length,
      a.activeLines,
      allit.slice(0, 3).map((x) => `“${esc(x.pair[0])} ${esc(x.pair[1])}”`).join(" · ")
    )}
    ${deviceRow(
      "Assonance",
      asson.length,
      a.activeLines,
      asson
        .slice(0, 2)
        .map((g) => `<strong>${esc(g.sound)}</strong> — ${esc(g.words.join(", "))}`)
        .join("<br />")
    )}
    ${deviceRow(
      "Anaphora",
      anaph.length,
      a.activeLines,
      anaph
        .slice(0, 2)
        .map((r) => `“${esc(r.word)}…” lines ${r.start}–${r.end}`)
        .join(" · ")
    )}
    ${deviceRow(
      "Mid-line pause",
      Math.round(a.sound.caesuraRate * a.activeLines),
      a.activeLines,
      ""
    )}
    ${deviceRow(
      "Run-on line",
      Math.round(a.sound.enjambmentRate * a.activeLines),
      a.activeLines,
      ""
    )}

    <div class="block-title"><span>Noticed</span><span>${a.flags.length}</span></div>
    ${flags}
  `;
}

function renderRootsTab(a) {
  const r = a.roots;
  if (!r.classified) {
    emptyReadout(
      "<strong>No rooted words yet.</strong><span>Write a few content words — nouns, verbs, adjectives — and their older languages will appear here.</span>"
    );
    return;
  }

  const segments = Object.entries(r.counts)
    .sort((x, y) => y[1] - x[1])
    .map(([lang, count]) => {
      const meta = LANGS[lang];
      const share = count / r.classified;
      return `<i style="width:${share * 100}%;background:${meta.color}" title="${esc(
        meta.label
      )} ${pct(share)}"></i>`;
    })
    .join("");

  const legend = Object.entries(r.counts)
    .sort((x, y) => y[1] - x[1])
    .map(([lang, count]) => {
      const meta = LANGS[lang];
      const words = (r.wordsByLang[lang] || [])
        .slice(0, 4)
        .map((w) => w.word);
      return `
        <div class="root-legend-row">
          <span class="root-dot" style="background:${meta.color}"></span>
          <div>
            <b>${esc(meta.label)}</b>
            <div class="root-words">${words
              .map((w) => `<span class="root-word-chip">${esc(w)}</span>`)
              .join("")}</div>
          </div>
          <span>${pct(count / r.classified)}</span>
        </div>`;
    })
    .join("");

  const dominant = r.dominant ? LANGS[r.dominant] : null;

  $("#readoutBody").innerHTML = `
    <div class="block-title"><span>Root stock</span><span>${pct(r.coverage)} classified</span></div>
    <div class="root-bar">${segments}</div>
    <div class="root-legend">${legend}</div>
    <p class="scan-note">
      ${
        dominant
          ? `The centre of gravity here is <strong>${esc(dominant.label)}</strong>. ${esc(dominant.blurb)}`
          : "No dominant family yet."
      }
      ${r.latinate > 0.4 ? "A very Latinate draft: if it feels airless, swap two abstractions for objects." : ""}
      ${r.germanic > 0.7 ? "A ground-level draft: short, physical, hard to fake — make the images precise and it will carry weight." : ""}
    </p>
    <div class="block-title"><span>Coverage</span><span>${r.classified} of ${r.total}</span></div>
    <p class="scan-note">Words outside the hoard are not counted. Open the <strong>Roots</strong> tab to search the lexicon.</p>
  `;
}

function renderEchoes(a) {
  const top = a.echoes[0];
  const voice = VOICE_BY_ID[top.id];
  const rows = a.echoes
    .map((e) => {
      const v = VOICE_BY_ID[e.id];
      return `
        <div class="echo-row" style="--accent:${v.accent}">
          <div class="echo-head">
            <b>${esc(v.name)}</b>
            <span>${e.score} / 100</span>
          </div>
          <div class="meter-bar"><i style="width:${e.score}%;background:${v.accent}"></i></div>
          <div class="echo-reasons">${e.reasons.map((r) => esc(r)).join(" · ")}</div>
        </div>`;
    })
    .join("");

  $("#readoutBody").innerHTML = `
    <div class="echo-top" style="--accent:${voice.accent}">
      <span class="echo-score">${top.score} / 100</span>
      <p class="kicker">Closest ear</p>
      <h3>${esc(voice.name)}</h3>
      <p>${esc(voice.epithet)}</p>
    </div>
    <p class="scan-note" style="margin:0 0 12px">
      ${top.reasons.map((r) => esc(r)).join(". ")}. A resemblance, not a verdict — you are allowed to sound like nobody.
    </p>
    ${rows}
    <div class="block-title"><span>Read through this voice</span><span></span></div>
    <button class="btn ghost" data-lens="${voice.id}" style="width:100%">Set ${esc(
      first(voice)
    )} as the lens</button>
    <button class="text-btn" data-open-voice="${voice.id}" style="margin-top:12px">Open the voice drawer →</button>
  `;
}

/* --------------------------------------------------------------------------
   Voices
   -------------------------------------------------------------------------- */

function renderVoices() {
  $("#voiceGrid").innerHTML = VOICES.map(
    (v, i) => `
    <article class="voice-card" style="--accent:${v.accent}" data-voice="${v.id}"
      role="button" tabindex="0" aria-label="Open ${esc(v.name)}">
      <div class="voice-card-top">
        <span class="voice-num">0${i + 1}</span>
        <span class="voice-initials">${v.initials}</span>
      </div>
      <h3>${esc(v.name)}</h3>
      <p class="voice-meta">${esc(v.dates)} · ${esc(v.place)}</p>
      <p class="voice-epithet">${esc(v.epithet)}</p>
      <p class="voice-line">${esc(v.rhythm.headline)}</p>
      <div class="chip-row">${v.meterChips
        .map((c) => `<span class="chip tiny">${esc(c)}</span>`)
        .join("")}</div>
      <div class="voice-excerpt">${v.pastiche.lines
        .slice(0, 2)
        .map((l) => `<span>${esc(l)}</span>`)
        .join("")}</div>
      <span class="card-link">Open the voice <span>→</span></span>
    </article>`
  ).join("");
}

function openVoice(id) {
  const voice = VOICE_BY_ID[id];
  if (!voice) return;
  const index = VOICES.findIndex((v) => v.id === id);
  const pa = analyzePoem(voice.pastiche.lines.join("\n"));

  const rootItems = voice.roots.items
    .map((item) => {
      const found = lookup(item.word);
      const meta = LANGS[item.lang];
      return `
        <div class="root-item">
          <b>${esc(item.word)}</b>
          <span class="root-form">${found ? esc(found.root) : ""} · ${esc(meta.label)}</span>
          <p>${esc(item.note)}</p>
        </div>`;
    })
    .join("");

  const miniScan = pa.lines
    .filter((l) => l.words.length)
    .map(
      (l) => `
      <div class="mini-scan-row">
        <span class="scan-num">${l.number}</span>
        <span class="scan-pattern">${patternSpans(l.pattern)}</span>
        <span class="scan-meta"><span>${l.syllables}s</span><span>${l.beats}b</span></span>
      </div>`
    )
    .join("");

  $("#drawerBody").innerHTML = `
    <header class="drawer-head" style="--accent:${voice.accent}">
      <button class="icon-btn drawer-close" data-close-drawer aria-label="Close">✕</button>
      <span class="voice-initials lg">${voice.initials}</span>
      <p class="kicker" style="margin-top:18px">Voice ${index + 1} of 4</p>
      <h2>${esc(voice.name)}</h2>
      <p class="voice-meta">${esc(voice.dates)} · ${esc(voice.place)}</p>
      <p class="drawer-epithet">${esc(voice.epithet)}</p>
    </header>

    <div class="drawer-body">
      <section>
        <h3>Rhythm signature</h3>
        <p>${esc(voice.rhythm.summary)}</p>
        <ul>${voice.rhythm.bullets
          .map((b) => `<li>${inlineMd(b)}</li>`)
          .join("")}</ul>
        <p class="aside">${esc(voice.rhythm.hear)}</p>
      </section>

      <section>
        <h3>Root languages</h3>
        <p>${esc(voice.roots.summary)}</p>
        <div class="root-items">${rootItems}</div>
        <p class="aside">${esc(voice.roots.takeaway)}</p>
      </section>

      <section>
        <h3>Hear it</h3>
        <p class="pastiche-title" style="margin-bottom:10px">${esc(
          voice.pastiche.title
        )} · original pastiche</p>
        <div class="pastiche">${voice.pastiche.lines
          .map((l) => `<span>${esc(l)}</span>`)
          .join("")}</div>
        <div class="mini-scan">${miniScan}</div>
        <p class="aside">${esc(voice.pastiche.note)}</p>
      </section>

      <section>
        <h3>Practice</h3>
        <ol>${voice.practice
          .map((p) => `<li><strong>${esc(p.title)}.</strong> ${esc(p.text)}</li>`)
          .join("")}</ol>
      </section>
    </div>

    <footer class="drawer-foot">
      <button class="btn primary" data-lens="${voice.id}">Read my draft through ${esc(
        first(voice)
      )}</button>
      <button class="btn ghost" data-use-pastiche="${voice.id}">Send the pastiche to my draft</button>
    </footer>`;

  const drawer = $("#voiceDrawer");
  drawer.hidden = false;
  document.body.style.overflow = "hidden";
  $(".drawer-panel", drawer).scrollTop = 0;
}

function closeDrawer() {
  const drawer = $("#voiceDrawer");
  if (!drawer || drawer.hidden) return;
  drawer.hidden = true;
  document.body.style.overflow = "";
}

/* --------------------------------------------------------------------------
   Lens
   -------------------------------------------------------------------------- */

function setLens(id) {
  state.lens = id || null;
  LS.set("fv.lens", state.lens);
  renderLens();
  updateCoachSub();
}

function renderLens() {
  const row = $("#lensRow");
  row.innerHTML = `
    <button class="lens-pill ${!state.lens ? "is-active" : ""}" data-lens="">
      <i style="--c:var(--gold)"></i>No lens
    </button>
    ${VOICES.map(
      (v) => `
      <button class="lens-pill ${state.lens === v.id ? "is-active" : ""}"
        data-lens="${v.id}" style="--c:${v.accent}">
        <i></i>${esc(first(v))}
      </button>`
    ).join("")}`;
}

/* --------------------------------------------------------------------------
   Chat
   -------------------------------------------------------------------------- */

function saveChat() {
  LS.set("fv.chat", state.chat);
}

function renderChat() {
  const log = $("#chatLog");
  log.innerHTML = state.chat
    .map(
      (m) => `
      <div class="msg ${m.role === "coach" ? "coach" : "user"}">
        <div class="who">${m.role === "coach" ? "Coach" : "You"}</div>
        <div class="bubble">${mdToHtml(m.text)}</div>
      </div>`
    )
    .join("");
  renderChips();
  log.scrollTop = log.scrollHeight;
}

function renderChips() {
  const last = [...state.chat].reverse().find((m) => m.role === "coach");
  const chips = last?.chips?.length ? last.chips : COACH_CHIPS;
  $("#chips").innerHTML = chips
    .map(
      (c) => `<button class="chip-btn" data-chip="${esc(c)}">${esc(c)}</button>`
    )
    .join("");
}

function pushMessage(role, text, chips = []) {
  state.chat.push({ role, text, chips });
  saveChat();
  renderChat();
}

async function sendChat(raw) {
  const text = String(raw || "").trim();
  if (!text || state.busy) return;
  state.busy = true;

  const input = $("#chatInput");
  input.value = "";
  input.style.height = "auto";
  const log = $("#chatLog");
  pushMessage("user", text);

  const typing = document.createElement("div");
  typing.className = "typing";
  typing.innerHTML = "<i></i><i></i><i></i>";
  log.appendChild(typing);
  log.scrollTop = log.scrollHeight;

  let reply;
  try {
    if (state.settings.useLive && state.settings.key) {
      const started = Date.now();
      try {
        const liveText = await llmReply(text);
        await sleep(Math.max(0, 500 - (Date.now() - started)));
        reply = {
          text: liveText,
          chips: ["Critique this", "Scan my meter", "Who do I sound like?"],
        };
      } catch (err) {
        await sleep(Math.max(0, 500 - (Date.now() - started)));
        const offline = coachReply({
          text,
          analysis: state.analysis,
          lens: state.lens,
          history: state.chat,
        });
        reply = {
          text: `*Live model unavailable (${String(err.message).replace(/[*`]/g, "")}). Offline read below.*\n\n${offline.text}`,
          chips: offline.chips,
        };
      }
    } else {
      await sleep(520);
      reply = coachReply({
        text,
        analysis: state.analysis,
        lens: state.lens,
        history: state.chat,
      });
    }
  } catch (err) {
    reply = {
      text: `Something went wrong reading that. The offline ear still works — try **Critique this**, or ask again in a moment.`,
      chips: ["Critique this", "Scan my meter"],
    };
  } finally {
    typing.remove();
    state.busy = false;
  }

  pushMessage("coach", reply.text, reply.chips || []);
}

/* --------------------------------------------------------------------------
   Live model (optional)
   -------------------------------------------------------------------------- */

function analysisContext() {
  const a = state.analysis;
  if (!a || !a.features) return "No draft yet.";
  return JSON.stringify(
    {
      lines: a.activeLines,
      syllablesPerLine: Number(a.totals.avgSyllables.toFixed(1)),
      syllableVariance: Number(a.totals.syllableVar.toFixed(1)),
      dominantFoot: dominantFoot(a),
      stressRegularity: Number(a.features.regularity.toFixed(2)),
      rhymeScheme: a.rhyme.scheme,
      rhymeDensity: Number(a.rhyme.density.toFixed(2)),
      caesuraRate: Number(a.features.caesura.toFixed(2)),
      enjambmentRate: Number(a.features.enjambment.toFixed(2)),
      alliterationPerLine: Number(a.features.alliteration.toFixed(2)),
      repetition: Number(a.features.repetition.toFixed(2)),
      roots: {
        dominant: a.roots.dominant ? LANGS[a.roots.dominant].label : null,
        germanic: Number(a.roots.germanic.toFixed(2)),
        latinate: Number(a.roots.latinate.toFixed(2)),
        french: Number(a.roots.french.toFixed(2)),
      },
      echoes: a.echoes.map((e) => ({ voice: e.name, score: e.score })),
      flags: a.flags.map((f) => f.text),
    },
    null,
    1
  );
}

async function llmReply(userText) {
  const s = state.settings;
  if (!s.key) throw new Error("no key");
  const url = `${s.base.replace(/\/+$/, "")}/chat/completions`;
  const system = `You are the workshop coach inside "Four Voices", a poetry studio built around Seamus Heaney, Amanda Gorman, Bob Dylan and Brian Bilston.

Voice: warm, concrete, honest. You are a good reader, not a cheerleader. Quote the user's own lines. Never rewrite more than two lines at a time. Give one experiment at a time. Keep replies under 220 words unless the user asks for more. Use markdown.

The current draft:
"""
${state.draft.slice(0, 6000)}
"""

A machine reading of it:
${analysisContext()}

Rules:
- Treat the machine reading as evidence, not gospel. If it contradicts the poem, trust the poem.
- When a lens is active (${state.lens || "none"}), speak through that poet's habits without impersonating them.
- Do not reproduce copyrighted poems. Original pastiche is fine.
- Never invent quotations from the poets.`;

  const history = state.chat
    .slice(-10)
    .map((m) => ({
      role: m.role === "coach" ? "assistant" : "user",
      content: m.text,
    }));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s.key}`,
    },
    body: JSON.stringify({
      model: s.model || "gpt-4o-mini",
      messages: [{ role: "system", content: system }, ...history],
      temperature: 0.85,
      max_tokens: 700,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${detail ? " — " + detail.slice(0, 120) : ""}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty response");
  return content.trim();
}

/* --------------------------------------------------------------------------
   Roots explorer
   -------------------------------------------------------------------------- */

function renderRoots() {
  renderRootCensus();
  renderRootLangs();
  renderRootFilter();
  renderRootEntries();
}

function renderRootCensus() {
  const a = state.analysis;
  const box = $("#rootCensus");
  if (!a || !a.roots.classified) {
    box.innerHTML = `
      <div class="census-bars">
        <div class="census-head"><span>Your draft's root stock</span><span>no data</span></div>
        <div class="census-bar"></div>
        <p class="field-note" style="margin-top:10px">Paste a draft in the workshop to see its root mix here.</p>
      </div>
      <p class="census-note">The hoard below holds ${Object.keys(LEXICON).length} words across eight root languages. Start with one that sounds like your grandmother's kitchen.</p>`;
    return;
  }

  const r = a.roots;
  const entries = Object.entries(r.counts).sort((x, y) => y[1] - x[1]);
  const bar = entries
    .map(([lang, count]) => {
      const meta = LANGS[lang];
      return `<i style="width:${(count / r.classified) * 100}%;background:${meta.color}" title="${esc(
        meta.label
      )}"></i>`;
    })
    .join("");
  const legend = entries
    .map(([lang, count]) => {
      const meta = LANGS[lang];
      return `<span class="census-key"><i style="background:${meta.color}"></i>${esc(
        meta.short
      )} ${pct(count / r.classified)}</span>`;
    })
    .join("");

  box.innerHTML = `
    <div class="census-bars">
      <div class="census-head"><span>Your draft's root stock</span><span>${pct(
        r.coverage
      )} classified</span></div>
      <div class="census-bar">${bar}</div>
      <div class="census-legend">${legend}</div>
    </div>
    <p class="census-note">${
      r.dominant
        ? `The centre of gravity here is <strong>${esc(LANGS[r.dominant].label)}</strong>. ${esc(
            LANGS[r.dominant].blurb
          )}`
        : "No clear family yet."
    }</p>`;
}

function renderRootLangs() {
  const counts = {};
  for (const [, [lang]] of Object.entries(LEXICON)) {
    counts[lang] = (counts[lang] || 0) + 1;
  }
  $("#rootLangs").innerHTML = Object.entries(LANGS)
    .map(
      ([id, meta]) => `
      <button class="lang-card ${state.rootFilter === id ? "is-active" : ""}"
        data-lang="${id}" style="--c:${meta.color}">
        <div class="lang-top">
          <span class="lang-dot"></span>
          <span class="lang-name">${esc(meta.label)}</span>
          <span class="lang-count">${counts[id] || 0} words</span>
        </div>
        <span class="lang-years">${esc(meta.years)}</span>
        <span class="lang-blurb">${esc(meta.blurb)}</span>
        <span class="lang-voices">${esc(VOICE_LANG_HINT[id] || "")}</span>
      </button>`
    )
    .join("");
}

function renderRootFilter() {
  $("#rootFilter").innerHTML = `
    <button class="filter-btn ${state.rootFilter === "all" ? "is-active" : ""}" data-lang="all">All</button>
    ${Object.entries(LANGS)
      .map(
        ([id, meta]) =>
          `<button class="filter-btn ${state.rootFilter === id ? "is-active" : ""}" data-lang="${id}">${esc(
            meta.short
          )}</button>`
      )
      .join("")}`;
}

function renderRootEntries() {
  const box = $("#rootResults");
  const q = state.rootQuery;
  let entries = Object.entries(LEXICON);

  if (state.rootFilter !== "all") {
    entries = entries.filter(([, [lang]]) => lang === state.rootFilter);
  }
  if (q) {
    entries = entries.filter(([word, [, root, gloss]]) =>
      word.includes(q) || root.toLowerCase().includes(q) || gloss.toLowerCase().includes(q)
    );
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));

  if (!entries.length) {
    box.innerHTML = `<div class="root-empty">Nothing in the hoard matches “${esc(
      q
    )}”. Try a shorter word, or a root like <em>earth</em>, <em>iustitia</em>, <em>shabbat</em>.</div>`;
    return;
  }

  box.innerHTML = entries
    .slice(0, 120)
    .map(([word, [lang, root, gloss, note]]) => {
      const meta = LANGS[lang];
      return `
        <div class="root-entry" style="--c:${meta.color}">
          <div class="root-entry-head">
            <span class="root-entry-word">${esc(word)}</span>
            <span class="badge">${esc(meta.short)}</span>
          </div>
          <div class="root-entry-form">${esc(root)}</div>
          <p>${esc(gloss)}${note ? ` · ${esc(note)}` : ""}</p>
        </div>`;
    })
    .join("");
}

/* --------------------------------------------------------------------------
   Samples
   -------------------------------------------------------------------------- */

function renderSamples() {
  $("#sampleBtns").innerHTML = SAMPLES.map(
    (s, i) =>
      `<button class="sample-btn" data-sample="${i}" title="Load sample">${esc(
        s.label
      )}</button>`
  ).join("");
  $("#sampleBtns").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sample]");
    if (!btn) return;
    setDraft(SAMPLES[Number(btn.dataset.sample)].text);
    toast("Sample loaded");
  });
}

/* --------------------------------------------------------------------------
   Settings
   -------------------------------------------------------------------------- */

function hydrateSettings() {
  $("#useLive").checked = !!state.settings.useLive;
  $("#apiBase").value = state.settings.base || "";
  $("#apiModel").value = state.settings.model || "";
  $("#apiKey").value = state.settings.key || "";
  updateCoachSub();
}

function openSettings() {
  hydrateSettings();
  $("#settingsModal").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeSettings() {
  const modal = $("#settingsModal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

function saveSettings() {
  const settings = {
    useLive: $("#useLive").checked,
    base: $("#apiBase").value.trim() || DEFAULT_SETTINGS.base,
    model: $("#apiModel").value.trim() || DEFAULT_SETTINGS.model,
    key: $("#apiKey").value.trim(),
  };
  if (settings.useLive && !settings.key) {
    toast("Add an API key, or turn live chat off");
    return;
  }
  state.settings = settings;
  LS.set("fv.settings", settings);
  updateCoachSub();
  closeSettings();
  toast(settings.useLive ? "Live chat enabled" : "Offline coach enabled");
}

/* --------------------------------------------------------------------------
   Toast
   -------------------------------------------------------------------------- */

let toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2400);
}

/* --------------------------------------------------------------------------
   Restore lens
   -------------------------------------------------------------------------- */
state.lens = LS.get("fv.lens", null);
if (state.lens && !VOICE_BY_ID[state.lens]) state.lens = null;
