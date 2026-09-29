# Agent Home Versions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a single-file GitHub Pages prototype that reproduces the four supplied Agent home layouts and switches between them with a shared version control.

**Architecture:** A self-contained `index.html` owns all markup, inline SVG, CSS, and JavaScript. Four version panels share the application shell; hash-driven state selects one panel and updates the custom version menu without reloading.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, inline SVG, Node.js built-in test runner, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-09-28-agent-home-versions-design.md`

## Global Constraints

- The four V1–V4 frames in `https://app.paper.design/file/01M32J0S3B3M2EQ8B2MQ1VTG50/p-3-0` are the visual source of truth.
- Runtime output is one self-contained `index.html` with no build step and no third-party runtime dependency.
- Repository name is `woo-mi/agent-home-versions`.
- Supported hashes are exactly `#v1`, `#v2`, `#v3`, and `#v4`; invalid or missing hashes render V1.
- Only the version selector is interactive in this phase.
- The composition is desktop-first and remains viewable at narrower widths.

## Review Focus

- Empty hash loads V1 and labels the control `V1`.
- Mixed-case or unsupported hashes do not leave the screen blank and fall back to V1.
- Selecting each menu item updates both visible content and the URL hash.
- Only one version panel is visible at a time, including after browser back/forward navigation.
- The control remains usable at narrow viewport widths without covering the primary prompt.

---

### Task 1: Build the four-layout prototype

**Files:**
- Create: `index.html`
- Create: `tests/prototype.test.mjs`

**Interfaces:**
- Consumes: the four supplied Paper layout references and the approved design specification.
- Produces: `normalizeVersion(hash): "v1" | "v2" | "v3" | "v4"`, `renderVersion(version): void`, and version controls marked with `data-version`.

- [ ] **Step 1: Write the failing structural tests**

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/prototype.test.mjs`

Expected: FAIL because `index.html` does not exist.

- [ ] **Step 3: Create the semantic shell and four layouts**

Create `index.html` with:

```html
<main class="app-shell">
  <aside class="left-rail" aria-label="Primary navigation">...</aside>
  <section class="workspace">
    <div class="version-control">...</div>
    <section class="screen" data-screen="v1">...</section>
    <section class="screen" data-screen="v2" hidden>...</section>
    <section class="screen" data-screen="v3" hidden>...</section>
    <section class="screen" data-screen="v4" hidden>...</section>
  </section>
</main>
```

Use shared component classes for the heading, composer, Ask/Build toggle, Apps/Agents toggle, suggestion item, and four icon variants. Implement V1 as a 2×2 grid, V2 as a centered vertical stack, V3 as a spaced horizontal row, and V4 as a compact horizontal row. Reproduce the supplied text and updated V1 descriptions exactly.

- [ ] **Step 4: Add visual styling**

Define CSS custom properties for the neutral palette, type weights, rail width, card borders, and spacing. Position the version control at the upper-right with a dark background, layered icon, `V1`–`V4` label, and chevron. Add one breakpoint below `900px` that scales the main content and lets suggestion rows wrap without horizontal clipping.

- [ ] **Step 5: Add hash-driven version switching**

```js
function normalizeVersion(hash) {
  const value = hash.replace(/^#/, "").toLowerCase();
  return ["v1", "v2", "v3", "v4"].includes(value) ? value : "v1";
}

function renderVersion(version) {
  document.querySelectorAll("[data-screen]").forEach((screen) => {
    screen.hidden = screen.dataset.screen !== version;
  });
  document.querySelector("[data-current-version]").textContent = version.toUpperCase();
}

window.addEventListener("hashchange", () => renderVersion(normalizeVersion(location.hash)));
```

Wire each `[data-version]` menu button to set `location.hash`, close the menu, and restore focus to the trigger. On startup, normalize the hash, render the matching version, and replace an invalid hash with `#v1`.

- [ ] **Step 6: Run the structural tests**

Run: `node --test tests/prototype.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit the prototype**

```bash
git add index.html tests/prototype.test.mjs
git commit -m "feat: add agent home version prototype"
```

### Task 2: Verify interaction and visual fidelity

**Files:**
- Modify: `index.html`
- Test: `tests/prototype.test.mjs`

**Interfaces:**
- Consumes: the completed `index.html` from Task 1.
- Produces: visually verified V1–V4 screens and confirmed hash navigation behavior.

- [ ] **Step 1: Serve the prototype locally**

Run: `python3 -m http.server 4173`

Expected: `http://127.0.0.1:4173/` returns the prototype.

- [ ] **Step 2: Verify all hash states**

Open `#v1`, `#v2`, `#v3`, and `#v4`. For each state, confirm exactly one `[data-screen]` is visible and the control label matches the active hash. Test empty, uppercase, and unsupported hashes; each must resolve to a visible valid screen.

- [ ] **Step 3: Verify the menu interaction**

Open the version menu, select every option, and confirm content, control label, and URL update together. Use browser back and forward and confirm the correct version is restored.

- [ ] **Step 4: Compare visual screenshots**

Capture each rendered screen at the reference desktop viewport. Compare heading position, composer dimensions, segmented controls, icon stroke weight, suggestion alignment, and the upper-right version control against the supplied Paper references. Adjust only `index.html` until each layout matches.

- [ ] **Step 5: Verify narrow viewport behavior**

At a viewport narrower than `900px`, confirm the version control is reachable, the prompt is not obscured, and suggestion items wrap without clipping.

- [ ] **Step 6: Run final tests**

Run: `node --test tests/prototype.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit verification fixes**

```bash
git add index.html tests/prototype.test.mjs
git commit -m "fix: refine prototype visual fidelity"
```

### Task 3: Publish to GitHub Pages

**Files:**
- No new runtime files.

**Interfaces:**
- Consumes: verified `main` branch from Task 2.
- Produces: public repository `woo-mi/agent-home-versions` and live URL `https://woo-mi.github.io/agent-home-versions/`.

- [ ] **Step 1: Confirm the final branch is clean**

Run: `git status --short --branch`

Expected: branch is `main` and the worktree is clean.

- [ ] **Step 2: Create and push the public repository**

```bash
gh repo create woo-mi/agent-home-versions --public --source=. --remote=origin --push
```

Expected: the repository exists publicly and `main` is pushed.

- [ ] **Step 3: Enable GitHub Pages**

```bash
gh api --method POST repos/woo-mi/agent-home-versions/pages -f source[branch]=main -f source[path]=/
```

Expected: GitHub Pages reports the site URL `https://woo-mi.github.io/agent-home-versions/`.

- [ ] **Step 4: Verify the published site**

Open each public hash route, switch among all four menu options, and confirm the deployed behavior matches local verification.

- [ ] **Step 5: Deliver the live link**

Return only `https://woo-mi.github.io/agent-home-versions/` to the user.
