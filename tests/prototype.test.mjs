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
