import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("contains six version panels and selectors", () => {
  for (const version of ["v0", "v1", "v2", "v3", "v4", "v5"]) {
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
  assert.match(html, /Revenue growth and target attainment/);
  assert.match(html, /Product and category trends vs plan/);
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

test("local SVG image assets exist and can render independently", async () => {
  const imageUrls = new Set();
  for (const [, src] of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const url = new URL(src, new URL("../index.html", import.meta.url));
    if (url.protocol === "file:" && /\.svg$/i.test(url.pathname)) {
      url.search = "";
      url.hash = "";
      imageUrls.add(url.href);
    }
  }
  assert.ok(imageUrls.size > 0, "Expected at least one local SVG image asset");

  for (const href of imageUrls) {
    const svg = await readFile(new URL(href), "utf8");
    assert.match(svg, /^\s*(?:<\?xml[^>]*\?>\s*)?<svg\b[^>]*\bxmlns=["']http:\/\/www\.w3\.org\/2000\/svg["'][\s\S]*<\/svg>\s*$/i, `${href} must contain standalone SVG markup`);

    const definedProperties = new Set([...svg.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
    for (const [, property, separator] of svg.matchAll(/\bvar\(\s*(--[\w-]+)\s*([,)])/g)) {
      assert.ok(separator === "," || definedProperties.has(property), `${href} references ${property} without a local definition or fallback`);
    }
  }
});
