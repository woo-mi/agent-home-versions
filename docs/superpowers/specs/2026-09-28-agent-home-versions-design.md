# Agent Home Versions Prototype

## Purpose

Create a lightweight, shareable prototype that compares four existing Agent home-screen layouts. The prototype will be published from a new public GitHub repository named `agent-home-versions` and hosted with GitHub Pages, following the one-file structure of `woo-mi/prototype-agenda`.

## Scope

- Use the four V1–V4 frames in `https://app.paper.design/file/01M32J0S3B3M2EQ8B2MQ1VTG50/p-3-0` as the visual source of truth.
- Reproduce the four supplied Paper layouts as V1, V2, V3, and V4.
- Add a shared dark version control in the upper-right corner of every view.
- Allow the control to switch between all four layouts.
- Keep every other control visual-only in this phase.
- Preserve the updated descriptions in V1.

## Implementation

The prototype will use one self-contained `index.html` with embedded CSS and JavaScript and no build step or third-party runtime dependency.

The document will contain:

- A shared application shell for the left rail, prompt area, and version control.
- Four version-specific suggestion layouts:
  - V1: two-column, two-row grid.
  - V2: centered vertical list.
  - V3: wider horizontal row.
  - V4: compact horizontal row.
- Inline SVG or CSS-drawn icons matching the supplied visual reference.
- A native custom-styled version menu whose selected option controls the visible view.

## Navigation and State

The current version will be stored in the URL hash as `#v1`, `#v2`, `#v3`, or `#v4`. Opening a hash directly renders the corresponding screen. Selecting a version updates the hash and visible layout without reloading the page. Missing or invalid hashes fall back to V1.

## Visual Behavior

- Desktop-first composition based on the supplied Paper screenshots.
- Shared typography, colors, borders, spacing, and icon weight across all versions.
- The version control remains anchored in the upper-right and displays the active version.
- At narrower widths, the prototype scales and reflows enough to remain viewable; exact mobile layouts are outside this phase.

## Error Handling

- Invalid version values fall back to V1.
- The prototype has no network-dependent runtime behavior, so it remains functional after the page loads.

## Verification

- Open each hash route and confirm the correct layout and selected version.
- Switch through all four options and confirm the URL and content update together.
- Compare screenshots of all four rendered states against the supplied references.
- Confirm direct hosting from GitHub Pages without a build process.

## Delivery

- Create the public GitHub repository `woo-mi/agent-home-versions`.
- Commit the self-contained prototype to `main`.
- Enable GitHub Pages from the repository root.
- Deliver the published URL `https://woo-mi.github.io/agent-home-versions/`.
