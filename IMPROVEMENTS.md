# Speculative-Seismograph — Improvements & Fixes

Ordered from highest impact / lowest effort to larger refactors. Each item is scoped so it can
be executed as an independent step.

**Status key:** ✅ done · 🟡 partial / in progress · ⬜ open

> The piece has since grown from 4 switches to **5** (32 combinations, `00000`–`11111`), all of
> which now have story files, and the monolith has been **split into modules** (`css/style.css`,
> `js/config.js`, `js/text-renderer.js`, `js/scene.js`, `js/toggles.js`, `js/main.js`). Statuses
> below reflect that current state.

## Progress at a glance

- **A. Bugs & inconsistencies** — ✅ all resolved (A1–A6).
- **B. Correctness & robustness** — B1, B3, B4 ⬜ open · B2, B5, B6 ✅ done · B7 ✅ done (new).
- **C. Input & accessibility** — ✅ both done (C1, C2).
- **D. Structure & maintainability** — ✅ all done (D1–D4).
- **E. Assets & housekeeping** — E1 ⬜ open · E2 ✅ done.

## A. Bugs & inconsistencies (fix first)

### ✅ A1. Asset path casing mismatch — **fixed**
All references now use `./Assets/...` (matching the folder) in `js/config.js` and `js/toggles.js`,
and the background is `../BASE01.png` in `css/style.css`. No lowercase `./assets` references remain.

### ✅ A2. Default state had no file — **fixed**
The default state is now `00000` (5 switches) and `texts/00000.md` exists, so the piece opens on a
real document instead of the fallback.

### ✅ A3. Duplicate story files — **fixed**
The old `0100.md`/`0010.md` duplication is gone. All 32 files (`00000`–`11111`) have distinct
content (verified by checksum — no duplicates).

### ✅ A4. Dead element `#edge-fade` — **fixed**
The unused `<div id="edge-fade">` was removed from `index.html`.

### ✅ A5. Missing story files — **fixed (for the 5-switch design)**
All 32 combinations now have files. **Follow-up:** the numbered files `texts/33.md`–`texts/50.md`
(minus `45`) are not reachable by any switch combination — they are orphaned. Either fold them into
the manifest (`texts/index.json`) or remove them. See D4.

### ✅ A6. Title / label / README mismatches — **fixed**
`<title>` is now descriptive, switch/light images have meaningful `alt`/`aria-label` text, and the
README explains what the piece is, the switch→story concept, and how to run it locally.

## B. Correctness & robustness

### ⬜ B1. Unbounded scrolling — **open**
`js/text-renderer.js` computes the document extent, but `js/scene.js`'s `animate()` never clamps
`currentScroll`, so the text can still be scrolled entirely off the drum in either direction.
- Fix: clamp `targetScroll`/`currentScroll` to a range derived from the text extent (expose the
  measured height from `text-renderer.js`).

### ✅ B2. Duplicated layout logic (measure vs. draw) — **fixed**
`js/text-renderer.js` now uses a single `layout(blocks, draw)` pass, called once to measure the
extent (`draw=false`) and once to render (`draw=true`), so measure and draw can't drift apart.

### ⬜ B3. Redundant scroll scaling — **open**
Scroll is still scaled twice — `scroll.sensitivity` (on `wheel`) and `scroll.offsetScale` (in
`animate`). They are now centralized/documented in `CONFIG`, but remain two multipliers doing one job.
- Fix: collapse into a single sensitivity constant.

### ⬜ B4. `texture.dispose()` on every redraw — **open**
`drawMarkdown()` still calls `texture.dispose()` and immediately reuses the same texture with
`needsUpdate = true` (kept deliberately during the refactor; flagged with a code comment).
- Fix: drop the `dispose()` call (a `CanvasTexture` re-uploads via `needsUpdate` on its own).

### ✅ B5. No CDN failure / integrity handling — **fixed**
Three.js r0.185.1 (`three.module.js` + `three.core.js`) is now vendored in `vendor/` and resolved
via an import map in `index.html`; `js/scene.js` and `js/text-renderer.js` import the bare `three`
specifier. No CDN, no unpkg, so the piece runs fully offline. Version reconciled to the installed
`0.185.1`.

### ✅ B6. Bullet / header lines are not wrapped — **fixed**
All block types (headers, bullets, body) now go through the same word-wrapping routine
(`layoutWords`), so long headers and bullets wrap within `maxWidth`.

### ✅ B7. Markdown markup rendered as literal text — **fixed** (new)
The renderer previously only handled `###` headers and `•`/`-` bullets, so `#`/`##` headers,
`**bold**`, `*italic*`, `***bold italic***`, and `\`-escaped punctuation showed as raw characters.
`js/text-renderer.js` now parses these into styled runs and renders each with the correct
weight/style (using iA Writer Quattro's regular/bold/italic/bold-italic faces).

## C. Input & accessibility

### ✅ C1. Touch / drag / keyboard scrolling — **fixed**
`js/scene.js` now handles wheel, pointer-drag (mouse/touch/pen via Pointer Events, with drags over
the toggle bank ignored), and arrow / Page keys. `#canvas-container` uses `touch-action: none` so
touch drags aren't swallowed by browser gestures. Tunables live in `CONFIG.scroll`
(`dragSensitivity`, `keyStep`).

### ✅ C2. Switches keyboard / screen-reader accessible — **fixed**
`js/toggles.js` now renders each switch as a `<button>` with `aria-pressed` and an `aria-label`;
the indicator lights are marked `aria-hidden`. Keyboard activation works natively.

## D. Structure & maintainability

### ✅ D1. Split the monolith into modules — **done**
`index.html` is markup-only and loads `css/style.css` + `js/main.js`. Logic is split into
`js/toggles.js`, `js/text-renderer.js`, `js/scene.js`, wired by `js/main.js`.

### ✅ D2. Centralize configuration — **done**
All magic numbers (camera, cylinder, scroll, canvas, layout/fonts, front nudge, paths) live in a
single documented `CONFIG` object in `js/config.js`.

### ✅ D3. Unify switch + light into one component — **done**
`js/toggles.js` models each switch+light as one `Toggle` unit, built and updated together —
removing the parallel `data-index` loops and index-mismatch risk.

### ✅ D4. Data-drive the story mapping — **done**
`texts/index.json` maps every combination to a file + title; `js/main.js` consumes it with a
direct-filename fallback. **Follow-up:** fold the orphan numbered files (see A5) into the manifest
or remove them.

## E. Assets & housekeeping

### ⬜ E1. Optimize `BASE01.png` (3.8 MB) — **open**
The background is still ~3.9 MB. Compress / resize to display resolution (consider WebP) to cut load time.

### ✅ E2. `.gitignore` + remove `.DS_Store` — **done**
`.gitignore` added (ignores `.DS_Store`, `node_modules/`, and `dist/`); the three tracked
`.DS_Store` files were removed from the index.

---

### Remaining execution order
1. B1, B3, B4 — behavioral robustness (scroll clamp, single sensitivity constant, drop redundant `dispose()`).
2. E1 — optimize `BASE01.png`.
3. Housekeeping — resolve orphan `texts/33–50.md` (fold into the manifest or remove).
