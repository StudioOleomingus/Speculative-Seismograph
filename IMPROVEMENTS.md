# Speculative-Seismograph — Improvements & Fixes

Ordered from highest impact / lowest effort to larger refactors. Each item is scoped so it can
be executed as an independent step later.

## A. Bugs & inconsistencies (fix first)

### A1. Asset path casing mismatch (breaks on case-sensitive hosts) — **critical**
`index.html` references `./assets/Switches/...` and `./assets/Lights/...` (lowercase `assets`),
but the actual folder is `Assets/` (capital **A**). This works on macOS/Windows (case-insensitive)
but **fails on Linux servers and GitHub Pages** — all switch/light images will 404.
- Fix: make the references match the folder exactly (`./Assets/...`), or rename the folder to
  `assets/` and update all references. Pick one casing convention and apply everywhere.

### A2. Default state `0000` has no file
On load, `toggleState = [0,0,0,0]` fetches `./texts/0000.md`, which does not exist, so the first
thing the user sees is the "No document found" fallback.
- Fix: add a `0000.md` intro/landing document, **or** change the initial `toggleState` to a
  combination that has content.

### A3. `0100.md` duplicates `0010.md`
The two files are byte-for-byte identical (both the "pocket-sized cows" story). One of them is
almost certainly a placeholder/copy mistake.
- Fix: replace `0100.md` with its intended story, or remove the switch position from the intended mapping.

### A4. Dead element `#edge-fade`
`<div id="edge-fade"></div>` exists in the DOM but has no CSS and is never referenced in JS.
- Fix: either remove it, or implement the intended vignette/edge-fade styling.

### A5. Missing story files (13 of 16 combinations)
Only `0001`, `0010`, `0100` exist. With 4 switches there are 16 states; the other 13 (including
multi-switch combinations) all fall through to the error message.
- Decide the intended design: is every combination meant to have a story, or only single-bit
  states? Document the mapping and either author the missing files or constrain the UI.

### A6. Title/label mismatches
The `<title>` is "Typewriter Rolling Cylinder" and image `alt` text is generic ("Switch 1"),
neither reflecting the project. `README.md` is a single line with no run instructions.
- Fix: set a meaningful `<title>`, descriptive `alt` text, and expand the README (what it is,
  how to run it locally, the switch→story concept).

## B. Correctness & robustness

### B1. Unbounded scrolling
`measureTextExtent()` computes the document's full height (`finalY`) but the scroll is never
clamped to it, so the user can scroll the text completely off the cylinder in either direction.
- Fix: clamp `targetScroll` between 0 and a max derived from the text extent.

### B2. Duplicated layout logic (measure vs. draw)
`measureTextExtent()` and `parseAndDrawMD()` contain two near-identical passes over the Markdown
lines with the same font/spacing rules. They will drift out of sync when spacing is edited.
- Fix: unify into a single layout routine that returns line boxes; measure and draw both consume it.

### B3. Redundant scroll scaling
Scroll is scaled once by `scrollSensitivity` (on `wheel`) and again by `offsetScrollScale`
(in `animate`). Two magic multipliers do one job.
- Fix: collapse into a single sensitivity constant.

### B4. `texture.dispose()` on every redraw
`parseAndDrawMD()` calls `texture.dispose()` then immediately keeps using the same `texture`
object and sets `needsUpdate = true`. Disposing frees the GPU texture only to re-upload it; the
ordering is confusing and wasteful.
- Fix: drop the `dispose()` call (a `CanvasTexture` with `needsUpdate = true` re-uploads on its
  own), or create a fresh texture deliberately if a resize truly requires it.

### B5. No CDN failure / integrity handling
Three.js is fetched from `unpkg` with no fallback and no Subresource Integrity. If unpkg is down
or blocked, the page silently fails.
- Fix: pin with SRI, and/or vendor `three.module.js` locally so the piece is self-contained
  (also better for an art piece meant to run offline/in an installation).

### B6. Bullet lines are not wrapped
Header (`###`) and bullet (`•`/`-`) branches call `fillText` directly with no wrapping, so long
bullets/headers overflow `MAX_WIDTH`. (Not hit by current content, but latent.)
- Fix: route these through `wrapText` too, or document the single-line constraint.

## C. Input & accessibility

### C1. No touch / drag scrolling
Only the `wheel` event drives scroll, so the piece is effectively non-functional on touch devices
and trackpad-only kiosks may behave oddly.
- Fix: add touch (`touchstart`/`touchmove`) and/or pointer-drag handling; optionally arrow-key scroll.

### C2. Switches aren't keyboard/screen-reader accessible
Switches are `<div>`s with click handlers — no `role`, `tabindex`, `aria-pressed`, or keyboard
activation. Lights are decorative but not marked `aria-hidden`.
- Fix: use `<button>` elements (or add roles + key handlers) and appropriate ARIA state.

## D. Structure & maintainability (larger refactor)

### D1. Split the monolith into modules
All 377 lines (markup, CSS, and four logical subsystems) live in one file. Suggested split:
- `index.html` — markup only.
- `css/style.css` — extracted styles.
- `js/toggles.js` — state array, filename, image swapping, click handlers.
- `js/text-renderer.js` — canvas layout, measure/draw, texture generation.
- `js/scene.js` — Three.js scene, cylinder, animation loop.
- `js/main.js` — wires the modules together.

Do this **after** A1–A5 so the fixes aren't lost in a large move.

### D2. Centralize configuration
Magic numbers are scattered (`START_X`, `INITIAL_Y`, `-0.08` nudge, camera position, radius,
`scrollSensitivity`, font sizes). Collect them into one `CONFIG` object so tuning the layout is
done in one place and the intent of each constant is documented.

### D3. Unify switch + light into one component
Each switch and its light are separate DOM nodes updated by two parallel `forEach` loops keyed by
`data-index`. Modeling "switch + light" as one unit (rendered/updated together) removes the
parallel-loop duplication and the risk of index mismatch.

### D4. Data-drive the story mapping
Rather than deriving filenames implicitly from bit strings, an explicit manifest
(e.g. `texts/index.json` mapping each combination to a title + file) would make missing entries
obvious, allow friendly titles, and let the UI show which combinations are populated.

## E. Assets & housekeeping

### E1. Optimize `BASE01.png` (3.8 MB)
The background is by far the largest asset. Compress / resize to display resolution (and consider
WebP) to cut load time significantly.

### E2. Add a `.gitignore` and remove `.DS_Store`
`.DS_Store` files are committed throughout. Add `.gitignore` (`.DS_Store`) and remove the tracked copies.

---

### Suggested execution order
1. A1 (path casing) — restores broken images.
2. A2, A3, A4 — quick correctness/content fixes.
3. E2, E1 — housekeeping and asset weight.
4. B1–B4 — behavioral robustness.
5. C1, C2 — input & accessibility.
6. A5, D4 — settle the story-mapping design.
7. D1–D3 — modular refactor once the above are stable.
