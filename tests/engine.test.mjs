import test from "node:test";
import assert from "node:assert/strict";

import { analyzePoem } from "../engine/analysis.js";
import { coachReply } from "../engine/coach.js";
import {
  syllableCount,
  stressPattern,
  rhymeKey,
  rhymes,
  slantRhyme,
  rhymeFamily,
} from "../engine/phonetics.js";
import { lookup } from "../data/roots.js";
import { SAMPLES } from "../data/poets.js";

test("syllable counts handle common traps", () => {
  assert.equal(syllableCount("beautiful"), 3);
  assert.equal(syllableCount("every"), 2);
  assert.equal(syllableCount("walked"), 1);
  assert.equal(syllableCount("wanted"), 2);
  assert.equal(syllableCount("stories"), 2);
  assert.equal(syllableCount("table"), 2);
  assert.equal(syllableCount("rhythm"), 2);
});

test("stress patterns are plausible", () => {
  assert.deepEqual(stressPattern("beautiful"), [1, 0, 0]);
  assert.deepEqual(stressPattern("remember"), [0, 1, 0]);
  assert.deepEqual(stressPattern("poetry"), [1, 0, 0]);
});

test("rhyme keys separate true and false families", () => {
  assert.equal(rhymeKey("night"), rhymeKey("light"));
  assert.equal(rhymeKey("love"), rhymeKey("above"));
  assert.notEqual(rhymeKey("love"), rhymeKey("move"));
  assert.ok(rhymes("stone", "alone"));
  assert.ok(!rhymes("stone", "home"));
  assert.ok(slantRhyme("stone", "home"));
  assert.ok(rhymeFamily("love").includes("above"));
});

test("etymology lookup and inference", () => {
  assert.equal(lookup("loam").lang, "oe");
  assert.equal(lookup("justice").lang, "la");
  assert.equal(lookup("jubilee").lang, "he");
  assert.equal(lookup("clabber").lang, "ga");
  assert.equal(lookup("word").lang, "oe");
  assert.ok(lookup("nonsensical").inferred);
});

test("analysis returns a complete reading", () => {
  const a = analyzePoem(SAMPLES[0].text);
  assert.equal(a.totals.lines, 5);
  assert.ok(a.totals.avgSyllables > 6);
  assert.ok(a.features);
  assert.equal(a.echoes.length, 4);
  assert.ok(a.lines.every((l) => typeof l.syllables === "number"));
  assert.ok(a.roots.classified > 0);
});

test("each sample echoes its own voice first", () => {
  const expected = ["heaney", "gorman", "dylan", "bilston"];
  SAMPLES.forEach((sample, i) => {
    const a = analyzePoem(sample.text);
    assert.equal(a.echoes[0].id, expected[i], `${sample.label} should echo ${expected[i]}`);
  });
});

test("empty input does not throw", () => {
  const a = analyzePoem("");
  assert.equal(a.totals.lines, 0);
  assert.equal(a.features, null);
  const reply = coachReply({ text: "hello", analysis: a });
  assert.match(reply.text, /no draft/i);
});

test("coach answers specific questions with draft evidence", () => {
  const a = analyzePoem(SAMPLES[0].text);
  const scan = coachReply({ text: "scan my meter", analysis: a });
  assert.match(scan.text, /The scan/);
  assert.match(scan.text, /syllables a line/);

  const roots = coachReply({ text: "find my roots", analysis: a });
  assert.match(roots.text, /root-hoard/i);

  const echo = coachReply({ text: "who do I sound like?", analysis: a });
  assert.match(echo.text, /Heaney/);

  const rhyme = coachReply({ text: "rhyme with stone", analysis: a });
  assert.match(rhyme.text, /Rhymes for \*\*stone\*\*/);
});

test("line questions quote the requested line", () => {
  const a = analyzePoem(SAMPLES[0].text);
  const reply = coachReply({ text: "analyse line 2", analysis: a });
  assert.match(reply.text, /Line 2/);
  assert.match(reply.text, /handle worn to the shape of a hand/);
});

test("lens changes the temperature of free-form advice", () => {
  const a = analyzePoem(SAMPLES[0].text);
  const reply = coachReply({ text: "thoughts?", analysis: a, lens: "gorman" });
  assert.match(reply.text, /Gorman|Gorman's/);
});
