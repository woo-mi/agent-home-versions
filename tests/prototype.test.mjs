import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("contains four version panels and selectors", () => {
  for (const version of ["v1", "v2", "v3", "v4"]) {
    assert.match(html, new RegExp(`data-screen="${version}"`));
    assert.match(html, new RegExp(`data-version="${version}"`));
  }
});

test("defines hash normalization and rendering", () => {
  assert.match(html, /function normalizeVersion\(hash\)/);
  assert.match(html, /function renderVersion\(version\)/);
  assert.match(html, /addEventListener\("hashchange"/);
});

test("contains no external runtime assets", () => {
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.doesNotMatch(html, /<link[^>]+rel=["']stylesheet["']/);
});

test("preserves the Paper frame copy", () => {
  assert.match(html, /Today’s priorities and key updates/);
  assert.match(html, /This week’s progress and next steps/);
  assert.match(html, /Quarterly performance, trends, and goals/);
  assert.match(html, /Key results, decisions, and actions/);
  assert.match(html, /Category and product trends vs plan/);
});

test("matches the Paper navigation rail proportions", () => {
  assert.match(html, /--rail:\s*60px/);
  assert.match(html, /\.brand\s*\{[^}]*width:\s*60px;[^}]*height:\s*64px/s);
  assert.match(html, /\.rail-button\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px/s);
});

test("uses an unclipped symmetric clover mark", () => {
  const clover = html.match(/<symbol id="mark-clover"[\s\S]*?<\/symbol>/)?.[0] ?? "";
  assert.match(clover, /viewBox="-2 -2 68 68"/);
  assert.doesNotMatch(clover, /transform=/);
  assert.match(clover, /M32 4C42\.5 4 51 12\.5 51 23/);
});
