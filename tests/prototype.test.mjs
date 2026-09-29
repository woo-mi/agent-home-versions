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
  assert.match(html, /--rail:\s*48px/);
  assert.match(html, /\.left-rail\s*\{[^}]*border-right:\s*1px solid #e6e6e6;[^}]*background:\s*rgba\(245,\s*245,\s*245,\s*\.82\)/s);
  assert.match(html, /\.brand\s*\{[^}]*width:\s*40px;[^}]*height:\s*40px;[^}]*margin-top:\s*8px/s);
  assert.match(html, /\.rail-nav\s*\{[^}]*margin-top:\s*11px/s);
  assert.match(html, /\.rail-button\s*\{[^}]*width:\s*36px;[^}]*height:\s*36px/s);
  assert.match(html, /\.rail-button\.active\s*\{[^}]*background:\s*#e6e6e6/s);
  assert.match(html, /\.rail-divider\s*\{[^}]*width:\s*28px;[^}]*margin:\s*5px 0 12px/s);
});

test("uses the two navigation assets extracted from Paper", () => {
  assert.match(html, /class="paper-logo"[^>]+src="data:image\/png;base64,/);
  assert.match(html, /class="paper-domains-icon"[^>]+src="data:image\/png;base64,/);
  assert.match(html, /\.paper-logo\s*\{[^}]*width:\s*20px;[^}]*height:\s*23px/s);
  assert.match(html, /\.paper-domains-icon\s*\{[^}]*width:\s*14px;[^}]*height:\s*17px/s);
  assert.doesNotMatch(html, /<ellipse cx="12" cy="5" rx="7" ry="3"/);
});

test("uses the exact clover artwork extracted from Paper", () => {
  const clover = html.match(/<symbol id="mark-clover"[\s\S]*?<\/symbol>/)?.[0] ?? "";
  assert.match(html, /\.agent-mark\s*\{[^}]*width:\s*56px;[^}]*height:\s*56px/s);
  assert.match(clover, /viewBox="0 0 108 108"/);
  assert.match(clover, /<image[^>]+href="data:image\/png;base64,iVBORw0KGgo/);
  assert.match(clover, /width="108" height="108"/);
  assert.doesNotMatch(clover, /<path/);
});
