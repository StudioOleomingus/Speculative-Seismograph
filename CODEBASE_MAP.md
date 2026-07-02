# Speculative-Seismograph — Codebase Map

A single-page web experience that displays a series of speculative-fiction stories on a
rotating 3D cylinder (styled like a typewriter platen / seismograph drum). The visible story
is selected by a bank of 4 binary toggle switches; the switch pattern maps to a filename, and
the corresponding Markdown file is rendered as text wrapped around the cylinder. The user
scrolls with the mouse wheel to roll the text into view.

## Tech stack

- **Plain HTML + inline CSS + inline ES module JavaScript** — everything lives in `index.html`.
- **[Three.js](https://threejs.org) r0.160.0** — loaded from the `unpkg` CDN as an ES module.
- **HTML Canvas 2D** — used off-screen to rasterize Markdown text into a texture.
- No build step, no framework, no package manager. Open `index.html` in a browser (via a local
  server, since it uses `fetch`).

## File & folder inventory

| Path | Purpose |
|------|---------|
| `index.html` | The entire application: layout, styling, toggle logic, Three.js scene, text rendering, scroll animation. ~377 lines. |
| `BASE01.png` | Full-screen background image (the machine/console art). 3.8 MB. |
| `Assets/Switches/On.png`, `Off.png` | Switch button graphics (on/off states). |
| `Assets/Lights/On.png`, `Off.png` | Indicator-light graphics (on/off states). |
| `texts/0001.md` | Story: "Kesavan Mama" (village folk tale). |
| `texts/0010.md` | Story: "Untitled.Tripti.Dhruvi" (pocket-sized cows / final milking). |
| `texts/0100.md` | Identical copy of `0010.md` (see Improvements). |
| `README.md` | One-line project description. |
| `LICENSE` | CC0 1.0 Universal (public domain dedication). |
| `.DS_Store` (multiple) | macOS Finder metadata, accidentally committed. |

## How it works (data flow)

```
[4 toggle switches] --click--> toggleState = [0/1, 0/1, 0/1, 0/1]
                                     |
                                     v
                        getFilename() -> "./texts/<bits>.md"   e.g. [0,1,0,0] -> "0100.md"
                                     |
                                     v
                        loadMarkdownFile(url)  --fetch-->  raw Markdown text
                                     |
                                     v
                        parseAndDrawMD(text)
                          - measureTextExtent() sizes the canvas
                          - draws text (rotated 90deg) onto off-screen canvas
                          - copies canvas -> THREE.CanvasTexture
                          - computes texture.offset.x so the title faces front
                                     |
                                     v
                        Cylinder mesh material.map = texture
                                     |
                        [mouse wheel] --> targetScroll --> eased currentScroll
                                     |
                                     v
                        animate() shifts texture.offset.x each frame -> text rolls
```

## Code structure inside `index.html`

The inline `<script type="module">` is organized into numbered sections:

1. **Toggle state** — `toggleState` array, `getFilename()`, `updateToggleImages()`, and click
   handlers on `.toggle-switch` elements. Clicking a switch flips its bit, updates the switch/light
   images, resets scroll, and reloads the matching Markdown file.
2. **Three.js setup** — scene, perspective camera (positioned at `~(0, -0.35, 7)`), WebGL renderer
   (transparent so the `BASE01.png` background shows through), ambient + two directional lights.
3. **Text canvas** — an off-screen 2D canvas (`BASE_SIZE` 2048 wide) and a `CanvasTexture`.
   Font/layout constants (`FONT_HEADER/BULLET/BODY`, `START_X`, `MAX_WIDTH`, `INITIAL_Y`, `PADDING`).
   - `measureWrapLines()` — counts wrapped lines for a body paragraph.
   - `measureTextExtent()` — pre-computes total text height to size the canvas.
   - `wrapText()` — draws a word-wrapped paragraph.
   - `parseAndDrawMD()` — the core: resizes canvas, walks the Markdown lines, draws headers
     (`###`), bullets (`•`/`-`), and body text, then updates the texture and computes `frontOffset`.
   - `loadMarkdownFile()` — async fetch + draw, with an on-canvas fallback message if the file is missing.
3. (continued) The default state `[0,0,0,0]` triggers a load of `./texts/0000.md` on startup.
4. **Cylinder** — an open-ended `CylinderGeometry` (radius 1.7, 512 segments). UVs are shifted by
   0.5 so the texture seam sits at the back, out of view. `MeshStandardMaterial` maps the text
   texture; the cylinder is rotated `z = PI/2` to lie horizontally.
5. **Scroll** — `wheel` events accumulate `targetScroll`; the value is scaled by `scrollSensitivity`.
6. **Animation loop** — eases `currentScroll` toward `targetScroll` and drives `texture.offset.x`
   (base `frontOffset` minus a scaled scroll) so text rolls up/down the drum.
7. **Resize** — keeps camera aspect and renderer size in sync with the window.

## Switch → story mapping

The 4 switches form a 4-bit binary string that becomes the filename (`<bits>.md`). This gives
16 possible combinations (`0000`–`1111`). Currently only 3 files exist:

| Switches (L→R) | Filename | Content |
|----------------|----------|---------|
| `0 0 0 1` | `0001.md` | Kesavan Mama |
| `0 0 1 0` | `0010.md` | Pocket-sized cows |
| `0 1 0 0` | `0100.md` | (duplicate of `0010.md`) |
| all others (incl. default `0000`) | — | Missing → on-screen "No document found" fallback |

## Key rendering notes / gotchas

- The text is drawn **rotated 90°** on the canvas because it is mapped around the cylinder's
  circumference; the cylinder's vertical axis becomes the reading direction.
- `frontOffset` is computed from the text's start position so the document title lands on the
  front-facing part of the cylinder (with a hand-tuned `-0.08` nudge).
- The canvas width grows dynamically to fit the tallest document; `texture.repeat.x` compensates
  so on-cylinder text scale stays consistent regardless of document length.
- Rendering is transparent — there is no "paper" background drawn, so only the dark text
  (`#222222`) appears over `BASE01.png`.
